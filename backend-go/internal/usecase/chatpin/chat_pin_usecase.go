package chatpin

import (
	"context"
	"errors"
	"fmt"

	"backend-go/internal/domain/ai"
	"backend-go/internal/domain/chatpin"
	"backend-go/internal/domain/groupchat"

	"github.com/google/uuid"
)

// 所有権チェックで使用する共通エラー（ハンドラで 403/404 に変換できるように公開）
var (
	// ErrChatTargetNotFound は対象のエージェント／グループが存在しないときに返す
	ErrChatTargetNotFound = errors.New("chat target not found")
	// ErrChatTargetForbidden は対象が他ユーザーの所有物のときに返す
	ErrChatTargetForbidden = errors.New("forbidden: user does not own this chat target")
)

// ChatPinUsecase はチャットピン機能のユースケース
type ChatPinUsecase struct {
	pinRepo       chatpin.Repository
	agentRepo     ai.Repository
	groupChatRepo groupchat.GroupChatRepository
}

// NewChatPinUsecase はチャットピンユースケースを作成
func NewChatPinUsecase(
	pinRepo chatpin.Repository,
	agentRepo ai.Repository,
	groupChatRepo groupchat.GroupChatRepository,
) *ChatPinUsecase {
	return &ChatPinUsecase{
		pinRepo:       pinRepo,
		agentRepo:     agentRepo,
		groupChatRepo: groupChatRepo,
	}
}

// Pin はチャットをピン留めする
// 対象の存在確認と所有権チェック（自分のエージェント／自分が作ったグループ）を行った上でピンを追加する
// 冪等なので、既にピン留め済みでもエラーにはならない
func (uc *ChatPinUsecase) Pin(ctx context.Context, userID uuid.UUID, chatType chatpin.ChatType, targetID uuid.UUID) error {
	if err := uc.assertOwnership(ctx, userID, chatType, targetID); err != nil {
		return err
	}

	pin, err := chatpin.NewPin(userID, chatType, targetID)
	if err != nil {
		return fmt.Errorf("failed to build pin: %w", err)
	}

	if err := uc.pinRepo.Add(ctx, pin); err != nil {
		return fmt.Errorf("failed to add pin: %w", err)
	}
	return nil
}

// Unpin はチャットのピンを解除する
// 所有権チェックはピン自体の所有者（user_id）で保証されているので、
// ピン側だけ user_id + chat_type + target_id で削除すれば十分
func (uc *ChatPinUsecase) Unpin(ctx context.Context, userID uuid.UUID, chatType chatpin.ChatType, targetID uuid.UUID) error {
	if err := uc.pinRepo.Remove(ctx, userID, chatType, targetID); err != nil {
		return fmt.Errorf("failed to remove pin: %w", err)
	}
	return nil
}

// ListUserPins はユーザーのピン一覧を取得する（pinned_at DESC）
func (uc *ChatPinUsecase) ListUserPins(ctx context.Context, userID uuid.UUID) ([]*chatpin.Pin, error) {
	pins, err := uc.pinRepo.ListByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list pins: %w", err)
	}
	return pins, nil
}

// assertOwnership は対象チャットの存在と所有権を検証する
// 種別ごとに別リポジトリを見るため、ここで一括に差分を吸収する
func (uc *ChatPinUsecase) assertOwnership(ctx context.Context, userID uuid.UUID, chatType chatpin.ChatType, targetID uuid.UUID) error {
	switch chatType {
	case chatpin.ChatTypeDirect:
		agent, err := uc.agentRepo.FindByID(ctx, targetID)
		if err != nil {
			return ErrChatTargetNotFound
		}
		if agent.UserID != userID {
			return ErrChatTargetForbidden
		}
		return nil
	case chatpin.ChatTypeGroup:
		gc, err := uc.groupChatRepo.FindByID(ctx, targetID)
		if err != nil {
			return ErrChatTargetNotFound
		}
		if gc.UserID != userID {
			return ErrChatTargetForbidden
		}
		return nil
	default:
		return errors.New("invalid chat type")
	}
}
