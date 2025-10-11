package persistence

import (
	"context"
	"database/sql"
	"errors"

	"backend-go/internal/domain/conversation"

	"github.com/google/uuid"
)

// ConversationRepositoryImpl は会話のリポジトリ実装
type ConversationRepositoryImpl struct {
	db *sql.DB
}

// NewConversationRepository は会話リポジトリを作成
func NewConversationRepository(db *sql.DB) conversation.ConversationRepository {
	return &ConversationRepositoryImpl{db: db}
}

// Save は会話を保存
func (r *ConversationRepositoryImpl) Save(ctx context.Context, conv *conversation.Conversation) error {
	query := `
		INSERT INTO conversations (
			id, user_id, ai_agent_id, message_count, last_message_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7
		)
	`

	_, err := r.db.ExecContext(
		ctx, query,
		conv.ID, conv.UserID, conv.AIAgentID, conv.MessageCount, conv.LastMessageAt, conv.CreatedAt, conv.UpdatedAt,
	)
	return err
}

// FindByID はIDで会話を取得
func (r *ConversationRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*conversation.Conversation, error) {
	query := `
		SELECT 
			id, user_id, ai_agent_id, message_count, last_message_at, created_at, updated_at
		FROM conversations
		WHERE id = $1
	`

	conv := &conversation.Conversation{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&conv.ID, &conv.UserID, &conv.AIAgentID, &conv.MessageCount, &conv.LastMessageAt, &conv.CreatedAt, &conv.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("conversation not found")
	}
	if err != nil {
		return nil, err
	}

	return conv, nil
}

// FindByUserAndAgent はユーザーIDとAI AgentIDで会話を取得
func (r *ConversationRepositoryImpl) FindByUserAndAgent(ctx context.Context, userID, aiAgentID uuid.UUID) (*conversation.Conversation, error) {
	query := `
		SELECT 
			id, user_id, ai_agent_id, message_count, last_message_at, created_at, updated_at
		FROM conversations
		WHERE user_id = $1 AND ai_agent_id = $2
	`

	conv := &conversation.Conversation{}
	err := r.db.QueryRowContext(ctx, query, userID, aiAgentID).Scan(
		&conv.ID, &conv.UserID, &conv.AIAgentID, &conv.MessageCount, &conv.LastMessageAt, &conv.CreatedAt, &conv.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil // 会話が見つからない場合はnilを返す（エラーではない）
	}
	if err != nil {
		return nil, err
	}

	return conv, nil
}

// FindByUserID はユーザーIDで会話リストを取得
func (r *ConversationRepositoryImpl) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*conversation.Conversation, error) {
	query := `
		SELECT 
			id, user_id, ai_agent_id, message_count, last_message_at, created_at, updated_at
		FROM conversations
		WHERE user_id = $1
		ORDER BY last_message_at DESC NULLS LAST, created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	conversations := []*conversation.Conversation{}
	for rows.Next() {
		conv := &conversation.Conversation{}
		err := rows.Scan(
			&conv.ID, &conv.UserID, &conv.AIAgentID, &conv.MessageCount, &conv.LastMessageAt, &conv.CreatedAt, &conv.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		conversations = append(conversations, conv)
	}

	return conversations, rows.Err()
}

// Update は会話を更新
func (r *ConversationRepositoryImpl) Update(ctx context.Context, conv *conversation.Conversation) error {
	query := `
		UPDATE conversations SET
			message_count = $2,
			last_message_at = $3,
			updated_at = $4
		WHERE id = $1
	`

	_, err := r.db.ExecContext(
		ctx, query,
		conv.ID, conv.MessageCount, conv.LastMessageAt, conv.UpdatedAt,
	)
	return err
}
