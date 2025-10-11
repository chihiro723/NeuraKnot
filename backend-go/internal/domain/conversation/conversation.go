package conversation

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Conversation は会話エンティティ
type Conversation struct {
	ID            uuid.UUID
	UserID        uuid.UUID
	AIAgentID     uuid.UUID
	MessageCount  int
	LastMessageAt *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// NewConversation は新しい会話を作成
func NewConversation(userID, aiAgentID uuid.UUID) (*Conversation, error) {
	if userID == uuid.Nil {
		return nil, errors.New("user ID is required")
	}
	if aiAgentID == uuid.Nil {
		return nil, errors.New("AI agent ID is required")
	}

	now := time.Now()
	return &Conversation{
		ID:           uuid.New(),
		UserID:       userID,
		AIAgentID:    aiAgentID,
		MessageCount: 0,
		CreatedAt:    now,
		UpdatedAt:    now,
	}, nil
}

// IncrementMessageCount はメッセージカウントをインクリメント
func (c *Conversation) IncrementMessageCount() {
	c.MessageCount++
	now := time.Now()
	c.LastMessageAt = &now
	c.UpdatedAt = now
}

// Validate は会話のバリデーション
func (c *Conversation) Validate() error {
	if c.UserID == uuid.Nil {
		return errors.New("user ID is required")
	}
	if c.AIAgentID == uuid.Nil {
		return errors.New("AI agent ID is required")
	}
	return nil
}
