package groupchat

import (
	"backend-go/internal/domain/conversation"
	"errors"
	"time"

	"github.com/google/uuid"
)

// SenderType はメッセージ送信者のタイプ
type SenderType string

const (
	SenderTypeUser SenderType = "user"
	SenderTypeAI   SenderType = "ai"
)

// ParseSenderType は文字列をSenderTypeに変換
func ParseSenderType(s string) (SenderType, error) {
	switch s {
	case "user":
		return SenderTypeUser, nil
	case "ai":
		return SenderTypeAI, nil
	default:
		return "", errors.New("invalid sender type")
	}
}

// ProcessingStatus はメッセージの処理状態
type ProcessingStatus string

const (
	ProcessingStatusPending    ProcessingStatus = "pending"
	ProcessingStatusProcessing ProcessingStatus = "processing"
	ProcessingStatusCompleted  ProcessingStatus = "completed"
	ProcessingStatusFailed     ProcessingStatus = "failed"
	ProcessingStatusCancelled  ProcessingStatus = "cancelled"
)

// GroupMessage はグループメッセージエンティティ
type GroupMessage struct {
	ID               uuid.UUID
	GroupChatID      uuid.UUID
	SenderType       SenderType
	SenderID         uuid.UUID
	Content          string
	ParentMessageID  *uuid.UUID
	AISessionID      *uuid.UUID
	ProcessingStatus ProcessingStatus
	CreatedAt        time.Time
	// 関連データ（リレーション）
	SenderName string
	SenderIcon string
	Mentions   []*MessageMention
	ToolUsages []*conversation.ToolUsage // ツール使用履歴
}

// NewUserMessage は新しいユーザーメッセージを作成
func NewUserMessage(groupChatID, userID uuid.UUID, content string) (*GroupMessage, error) {
	if groupChatID == uuid.Nil {
		return nil, errors.New("group chat ID is required")
	}
	if userID == uuid.Nil {
		return nil, errors.New("user ID is required")
	}
	if content == "" {
		return nil, errors.New("content is required")
	}

	return &GroupMessage{
		ID:               uuid.New(),
		GroupChatID:      groupChatID,
		SenderType:       SenderTypeUser,
		SenderID:         userID,
		Content:          content,
		ProcessingStatus: ProcessingStatusPending,
		CreatedAt:        time.Now(),
	}, nil
}

// NewAIMessage は新しいAIメッセージを作成
func NewAIMessage(groupChatID, aiAgentID uuid.UUID, content string, parentMessageID *uuid.UUID, aiSessionID *uuid.UUID) (*GroupMessage, error) {
	if groupChatID == uuid.Nil {
		return nil, errors.New("group chat ID is required")
	}
	if aiAgentID == uuid.Nil {
		return nil, errors.New("AI agent ID is required")
	}
	if content == "" {
		return nil, errors.New("content is required")
	}

	return &GroupMessage{
		ID:               uuid.New(),
		GroupChatID:      groupChatID,
		SenderType:       SenderTypeAI,
		SenderID:         aiAgentID,
		Content:          content,
		ParentMessageID:  parentMessageID,
		AISessionID:      aiSessionID,
		ProcessingStatus: ProcessingStatusCompleted,
		CreatedAt:        time.Now(),
	}, nil
}

// UpdateProcessingStatus は処理状態を更新
func (m *GroupMessage) UpdateProcessingStatus(status ProcessingStatus) {
	m.ProcessingStatus = status
}

// IsUserMessage はユーザーメッセージかどうかを判定
func (m *GroupMessage) IsUserMessage() bool {
	return m.SenderType == SenderTypeUser
}

// IsAIMessage はAIメッセージかどうかを判定
func (m *GroupMessage) IsAIMessage() bool {
	return m.SenderType == SenderTypeAI
}

// Validate はメッセージのバリデーション
func (m *GroupMessage) Validate() error {
	if m.GroupChatID == uuid.Nil {
		return errors.New("group chat ID is required")
	}
	if m.SenderID == uuid.Nil {
		return errors.New("sender ID is required")
	}
	if m.Content == "" {
		return errors.New("content is required")
	}
	if m.SenderType != SenderTypeUser && m.SenderType != SenderTypeAI {
		return errors.New("invalid sender type")
	}
	return nil
}
