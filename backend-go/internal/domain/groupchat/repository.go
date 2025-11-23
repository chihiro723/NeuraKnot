package groupchat

import (
	"context"

	"github.com/google/uuid"
)

// GroupChatRepository はグループチャットのリポジトリインターフェース
type GroupChatRepository interface {
	// Save はグループチャットを保存
	Save(ctx context.Context, groupChat *GroupChat) error

	// FindByID はIDでグループチャットを取得
	FindByID(ctx context.Context, id uuid.UUID) (*GroupChat, error)

	// FindByUserID はユーザーIDでグループチャットリストを取得
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]*GroupChat, error)

	// Update はグループチャットを更新
	Update(ctx context.Context, groupChat *GroupChat) error

	// Delete はグループチャットを削除
	Delete(ctx context.Context, id uuid.UUID) error
}

// GroupMemberRepository はグループメンバーのリポジトリインターフェース
type GroupMemberRepository interface {
	// Save はグループメンバーを保存
	Save(ctx context.Context, member *GroupMember) error

	// FindByGroupChatID はグループチャットIDでメンバーリストを取得
	FindByGroupChatID(ctx context.Context, groupChatID uuid.UUID) ([]*GroupMember, error)

	// FindByID はIDでメンバーを取得
	FindByID(ctx context.Context, id uuid.UUID) (*GroupMember, error)

	// Delete はメンバーを削除
	Delete(ctx context.Context, id uuid.UUID) error

	// UpdateDisplayOrders はメンバーの表示順序を一括更新
	UpdateDisplayOrders(ctx context.Context, orders map[uuid.UUID]int) error

	// ExistsByGroupChatAndAgent はグループチャットとエージェントの組み合わせでメンバーが存在するかチェック
	ExistsByGroupChatAndAgent(ctx context.Context, groupChatID, aiAgentID uuid.UUID) (bool, error)
}

// GroupMessageRepository はグループメッセージのリポジトリインターフェース
type GroupMessageRepository interface {
	// Save はメッセージを保存
	Save(ctx context.Context, message *GroupMessage) error

	// FindByID はIDでメッセージを取得
	FindByID(ctx context.Context, id uuid.UUID) (*GroupMessage, error)

	// FindByGroupChatID はグループチャットIDでメッセージリストを取得
	FindByGroupChatID(ctx context.Context, groupChatID uuid.UUID, limit int, before *uuid.UUID) ([]*GroupMessage, error)

	// FindHistoryBeforeMessage は指定メッセージより前の会話履歴を取得
	FindHistoryBeforeMessage(ctx context.Context, groupChatID uuid.UUID, messageID uuid.UUID) ([]*GroupMessage, error)

	// Update はメッセージを更新
	Update(ctx context.Context, message *GroupMessage) error
}

// MessageMentionRepository はメッセージメンションのリポジトリインターフェース
type MessageMentionRepository interface {
	// Save はメンションを保存
	Save(ctx context.Context, mention *MessageMention) error

	// FindByMessageID はメッセージIDでメンションリストを取得（順序順）
	FindByMessageID(ctx context.Context, messageID uuid.UUID) ([]*MessageMention, error)

	// FindByID はIDでメンションを取得
	FindByID(ctx context.Context, id uuid.UUID) (*MessageMention, error)

	// Update はメンションを更新
	Update(ctx context.Context, mention *MessageMention) error

	// CancelPendingMentions は指定メッセージの未処理メンションをキャンセル
	CancelPendingMentions(ctx context.Context, messageID uuid.UUID) error
}
