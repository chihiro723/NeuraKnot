package conversation

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// SenderType は送信者タイプ
type SenderType string

const (
	SenderTypeUser SenderType = "user"
	SenderTypeAI   SenderType = "ai"
)

// String は文字列表現を返す
func (s SenderType) String() string {
	return string(s)
}

// IsValid はSenderTypeが有効かどうかを確認
func (s SenderType) IsValid() bool {
	switch s {
	case SenderTypeUser, SenderTypeAI:
		return true
	default:
		return false
	}
}

// ParseSenderType は文字列からSenderTypeを生成
func ParseSenderType(s string) (SenderType, error) {
	t := SenderType(s)
	if !t.IsValid() {
		return "", errors.New("invalid sender type")
	}
	return t, nil
}

// Message はメッセージエンティティ
type Message struct {
	ID             uuid.UUID
	ConversationID uuid.UUID
	SenderType     SenderType
	SenderID       uuid.UUID
	Content        string
	AISessionID    *uuid.UUID
	CreatedAt      time.Time
}

// NewMessage は新しいメッセージを作成
func NewMessage(
	conversationID uuid.UUID,
	senderType SenderType,
	senderID uuid.UUID,
	content string,
) (*Message, error) {
	if conversationID == uuid.Nil {
		return nil, errors.New("conversation ID is required")
	}
	if !senderType.IsValid() {
		return nil, errors.New("invalid sender type")
	}
	if senderID == uuid.Nil {
		return nil, errors.New("sender ID is required")
	}
	if content == "" {
		return nil, errors.New("content is required")
	}

	return &Message{
		ID:             uuid.New(),
		ConversationID: conversationID,
		SenderType:     senderType,
		SenderID:       senderID,
		Content:        content,
		CreatedAt:      time.Now(),
	}, nil
}

// SetAISessionID はAIセッションIDを設定
func (m *Message) SetAISessionID(sessionID uuid.UUID) {
	m.AISessionID = &sessionID
}

// Validate はメッセージのバリデーション
func (m *Message) Validate() error {
	if m.ConversationID == uuid.Nil {
		return errors.New("conversation ID is required")
	}
	if !m.SenderType.IsValid() {
		return errors.New("invalid sender type")
	}
	if m.SenderID == uuid.Nil {
		return errors.New("sender ID is required")
	}
	if m.Content == "" {
		return errors.New("content is required")
	}
	return nil
}
