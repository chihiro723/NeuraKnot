package chatpin

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// ChatType はピン対象のチャット種別
type ChatType string

const (
	// ChatTypeDirect は 1 対 1 （エージェント）チャット
	// target_id は ai_agents.id を指す
	ChatTypeDirect ChatType = "direct"

	// ChatTypeGroup はグループチャット
	// target_id は group_chats.id を指す
	ChatTypeGroup ChatType = "group"
)

// ParseChatType は文字列を ChatType に変換する
// 未知の値は BadRequest 扱いにしたいので、呼び出し側でエラーを返す
func ParseChatType(s string) (ChatType, error) {
	switch ChatType(s) {
	case ChatTypeDirect:
		return ChatTypeDirect, nil
	case ChatTypeGroup:
		return ChatTypeGroup, nil
	default:
		return "", errors.New("invalid chat type (expected 'direct' or 'group')")
	}
}

// Pin はチャット一覧のピン留めを表すエンティティ
// 既存の交差テーブル（group_chat_members 等）に合わせて代理キー ID を持ち、
// 自然キーは (UserID, ChatType, TargetID) の組み合わせ
type Pin struct {
	ID       uuid.UUID
	UserID   uuid.UUID
	ChatType ChatType
	TargetID uuid.UUID
	PinnedAt time.Time
}

// NewPin は新しいピンを生成する
func NewPin(userID uuid.UUID, chatType ChatType, targetID uuid.UUID) (*Pin, error) {
	if userID == uuid.Nil {
		return nil, errors.New("user ID is required")
	}
	if targetID == uuid.Nil {
		return nil, errors.New("target ID is required")
	}
	if _, err := ParseChatType(string(chatType)); err != nil {
		return nil, err
	}
	return &Pin{
		ID:       uuid.New(),
		UserID:   userID,
		ChatType: chatType,
		TargetID: targetID,
		PinnedAt: time.Now(),
	}, nil
}
