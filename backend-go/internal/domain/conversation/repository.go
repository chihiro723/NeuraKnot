package conversation

import (
	"context"

	"github.com/google/uuid"
)

// ConversationRepository は会話のリポジトリインターフェース
type ConversationRepository interface {
	// Save は会話を保存
	Save(ctx context.Context, conversation *Conversation) error

	// FindByID はIDで会話を取得
	FindByID(ctx context.Context, id uuid.UUID) (*Conversation, error)

	// FindByUserAndAgent はユーザーIDとAI AgentIDで会話を取得
	FindByUserAndAgent(ctx context.Context, userID, aiAgentID uuid.UUID) (*Conversation, error)

	// FindByUserID はユーザーIDで会話リストを取得
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]*Conversation, error)

	// Update は会話を更新
	Update(ctx context.Context, conversation *Conversation) error
}

// MessageRepository はメッセージのリポジトリインターフェース
type MessageRepository interface {
	// Save はメッセージを保存
	Save(ctx context.Context, message *Message) error

	// FindByID はIDでメッセージを取得
	FindByID(ctx context.Context, id uuid.UUID) (*Message, error)

	// FindByConversationID は会話IDでメッセージリストを取得
	FindByConversationID(ctx context.Context, conversationID uuid.UUID, limit int) ([]*Message, error)
}
