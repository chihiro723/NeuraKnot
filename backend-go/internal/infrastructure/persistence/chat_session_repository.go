package persistence

import (
	"context"
	"database/sql"
	"errors"

	"backend-go/internal/domain/conversation"

	"github.com/google/uuid"
)

// ChatSessionRepositoryImpl はChatSessionのリポジトリ実装
type ChatSessionRepositoryImpl struct {
	db *sql.DB
}

// NewChatSessionRepository はChatSessionリポジトリを作成
func NewChatSessionRepository(db *sql.DB) conversation.ChatSessionRepository {
	return &ChatSessionRepositoryImpl{db: db}
}

// Save はChatSessionを保存
func (r *ChatSessionRepositoryImpl) Save(ctx context.Context, session *conversation.ChatSession) error {
	query := `
		INSERT INTO ai_chat_sessions (
			id, user_id, conversation_id, group_chat_id, ai_agent_id, message_id,
			provider, model, persona, temperature,
			tokens_prompt, tokens_completion, tokens_total,
			processing_time_ms, tools_used,
			status, error_message,
			started_at, completed_at,
			cost_usd, prompt_cost_per_1m, completion_cost_per_1m, pricing_id
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13,
			$14, $15,
			$16, $17,
			$18, $19,
			$20, $21, $22, $23
		)
	`

	_, err := r.db.ExecContext(
		ctx, query,
		session.ID, session.UserID, session.ConversationID, session.GroupChatID, session.AIAgentID, session.MessageID,
		session.Provider, session.Model, session.Persona, session.Temperature,
		session.TokensPrompt, session.TokensCompletion, session.TokensTotal,
		session.ProcessingTimeMs, session.ToolsUsed,
		session.Status, session.ErrorMessage,
		session.StartedAt, session.CompletedAt,
		session.CostUSD, session.PromptCostPer1M, session.CompletionCostPer1M, session.PricingID,
	)
	return err
}

// FindByID はIDでChatSessionを取得
func (r *ChatSessionRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*conversation.ChatSession, error) {
	query := `
		SELECT
			id, user_id, conversation_id, group_chat_id, ai_agent_id, message_id,
			provider, model, persona, temperature,
			tokens_prompt, tokens_completion, tokens_total,
			processing_time_ms, tools_used,
			status, error_message,
			started_at, completed_at,
			cost_usd, prompt_cost_per_1m, completion_cost_per_1m, pricing_id
		FROM ai_chat_sessions
		WHERE id = $1
	`

	session := &conversation.ChatSession{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&session.ID, &session.UserID, &session.ConversationID, &session.GroupChatID, &session.AIAgentID, &session.MessageID,
		&session.Provider, &session.Model, &session.Persona, &session.Temperature,
		&session.TokensPrompt, &session.TokensCompletion, &session.TokensTotal,
		&session.ProcessingTimeMs, &session.ToolsUsed,
		&session.Status, &session.ErrorMessage,
		&session.StartedAt, &session.CompletedAt,
		&session.CostUSD, &session.PromptCostPer1M, &session.CompletionCostPer1M, &session.PricingID,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("chat session not found")
	}
	if err != nil {
		return nil, err
	}

	return session, nil
}

// FindByMessageID はMessageIDでChatSessionを取得
func (r *ChatSessionRepositoryImpl) FindByMessageID(ctx context.Context, messageID uuid.UUID) (*conversation.ChatSession, error) {
	query := `
		SELECT
			id, user_id, conversation_id, group_chat_id, ai_agent_id, message_id,
			provider, model, persona, temperature,
			tokens_prompt, tokens_completion, tokens_total,
			processing_time_ms, tools_used,
			status, error_message,
			started_at, completed_at,
			cost_usd, prompt_cost_per_1m, completion_cost_per_1m, pricing_id
		FROM ai_chat_sessions
		WHERE message_id = $1
	`

	session := &conversation.ChatSession{}
	err := r.db.QueryRowContext(ctx, query, messageID).Scan(
		&session.ID, &session.UserID, &session.ConversationID, &session.GroupChatID, &session.AIAgentID, &session.MessageID,
		&session.Provider, &session.Model, &session.Persona, &session.Temperature,
		&session.TokensPrompt, &session.TokensCompletion, &session.TokensTotal,
		&session.ProcessingTimeMs, &session.ToolsUsed,
		&session.Status, &session.ErrorMessage,
		&session.StartedAt, &session.CompletedAt,
		&session.CostUSD, &session.PromptCostPer1M, &session.CompletionCostPer1M, &session.PricingID,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("chat session not found")
	}
	if err != nil {
		return nil, err
	}

	return session, nil
}
