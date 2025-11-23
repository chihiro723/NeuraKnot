package groupchat

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// MentionStatus はメンションの処理状態
type MentionStatus string

const (
	MentionStatusPending    MentionStatus = "pending"
	MentionStatusProcessing MentionStatus = "processing"
	MentionStatusCompleted  MentionStatus = "completed"
	MentionStatusFailed     MentionStatus = "failed"
	MentionStatusCancelled  MentionStatus = "cancelled"
)

// MessageMention はメッセージメンションエンティティ
type MessageMention struct {
	ID                uuid.UUID
	MessageID         uuid.UUID
	AIAgentID         uuid.UUID
	MentionOrder      int
	Status            MentionStatus
	ResponseMessageID *uuid.UUID
	ErrorMessage      string
	CreatedAt         time.Time
	StartedAt         *time.Time
	CompletedAt       *time.Time
	// 関連データ（リレーション）
	AIAgentName  string
	AIAgentIcon  string
	AIAgentModel string
}

// NewMessageMention は新しいメッセージメンションを作成
func NewMessageMention(messageID, aiAgentID uuid.UUID, mentionOrder int) (*MessageMention, error) {
	if messageID == uuid.Nil {
		return nil, errors.New("message ID is required")
	}
	if aiAgentID == uuid.Nil {
		return nil, errors.New("AI agent ID is required")
	}

	return &MessageMention{
		ID:           uuid.New(),
		MessageID:    messageID,
		AIAgentID:    aiAgentID,
		MentionOrder: mentionOrder,
		Status:       MentionStatusPending,
		CreatedAt:    time.Now(),
	}, nil
}

// StartProcessing は処理を開始
func (m *MessageMention) StartProcessing() {
	m.Status = MentionStatusProcessing
	now := time.Now()
	m.StartedAt = &now
}

// Complete は処理を完了
func (m *MessageMention) Complete(responseMessageID uuid.UUID) {
	m.Status = MentionStatusCompleted
	m.ResponseMessageID = &responseMessageID
	now := time.Now()
	m.CompletedAt = &now
}

// Fail は処理を失敗
func (m *MessageMention) Fail(errorMessage string) {
	m.Status = MentionStatusFailed
	m.ErrorMessage = errorMessage
	now := time.Now()
	m.CompletedAt = &now
}

// Cancel は処理をキャンセル
func (m *MessageMention) Cancel() {
	m.Status = MentionStatusCancelled
	now := time.Now()
	m.CompletedAt = &now
}

// IsPending は処理待ちかどうかを判定
func (m *MessageMention) IsPending() bool {
	return m.Status == MentionStatusPending
}

// IsProcessing は処理中かどうかを判定
func (m *MessageMention) IsProcessing() bool {
	return m.Status == MentionStatusProcessing
}

// IsCompleted は完了したかどうかを判定
func (m *MessageMention) IsCompleted() bool {
	return m.Status == MentionStatusCompleted
}

// IsFailed は失敗したかどうかを判定
func (m *MessageMention) IsFailed() bool {
	return m.Status == MentionStatusFailed
}

// IsCancelled はキャンセルされたかどうかを判定
func (m *MessageMention) IsCancelled() bool {
	return m.Status == MentionStatusCancelled
}

// Validate はメンションのバリデーション
func (m *MessageMention) Validate() error {
	if m.MessageID == uuid.Nil {
		return errors.New("message ID is required")
	}
	if m.AIAgentID == uuid.Nil {
		return errors.New("AI agent ID is required")
	}
	if m.MentionOrder < 1 {
		return errors.New("mention order must be greater than 0")
	}
	return nil
}
