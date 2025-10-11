package persistence

import (
	"context"
	"database/sql"
	"errors"

	"backend-go/internal/domain/ai"

	"github.com/google/uuid"
)

// AIAgentRepository はAI Agentのリポジトリ実装
type AIAgentRepository struct {
	db *sql.DB
}

// NewAIAgentRepository はAI Agentリポジトリを作成
func NewAIAgentRepository(db *sql.DB) ai.Repository {
	return &AIAgentRepository{db: db}
}

// Save はAI Agentを保存
func (r *AIAgentRepository) Save(ctx context.Context, agent *ai.Agent) error {
	query := `
		INSERT INTO ai_agents (
			id, user_id, name, description, avatar_url,
			persona_type, provider, model, temperature, max_tokens,
			system_prompt, tools_enabled, streaming_enabled, is_active,
			message_count, last_chat_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, $14,
			$15, $16, $17, $18
		)
	`

	_, err := r.db.ExecContext(
		ctx, query,
		agent.ID, agent.UserID, agent.Name, agent.Description, agent.AvatarURL,
		agent.PersonaType.String(), agent.Provider.String(), agent.Model, agent.Temperature, agent.MaxTokens,
		agent.SystemPrompt, agent.ToolsEnabled, agent.StreamingEnabled, agent.IsActive,
		agent.MessageCount, agent.LastChatAt, agent.CreatedAt, agent.UpdatedAt,
	)
	return err
}

// FindByID はIDでAI Agentを取得
func (r *AIAgentRepository) FindByID(ctx context.Context, id uuid.UUID) (*ai.Agent, error) {
	query := `
		SELECT
			id, user_id, name, description, avatar_url,
			persona_type, provider, model, temperature, max_tokens,
			system_prompt, tools_enabled, streaming_enabled, is_active,
			message_count, last_chat_at, created_at, updated_at
		FROM ai_agents
		WHERE id = $1 AND is_active = true
	`

	agent := &ai.Agent{}
	var personaTypeStr, providerStr string

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&agent.ID, &agent.UserID, &agent.Name, &agent.Description, &agent.AvatarURL,
		&personaTypeStr, &providerStr, &agent.Model, &agent.Temperature, &agent.MaxTokens,
		&agent.SystemPrompt, &agent.ToolsEnabled, &agent.StreamingEnabled, &agent.IsActive,
		&agent.MessageCount, &agent.LastChatAt, &agent.CreatedAt, &agent.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("agent not found")
	}
	if err != nil {
		return nil, err
	}

	// Parse enums
	personaType, err := ai.ParsePersonaType(personaTypeStr)
	if err != nil {
		return nil, err
	}
	agent.PersonaType = personaType

	provider, err := ai.ParseProvider(providerStr)
	if err != nil {
		return nil, err
	}
	agent.Provider = provider

	return agent, nil
}

// FindByUserID はユーザーIDでAI Agentリストを取得
func (r *AIAgentRepository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*ai.Agent, error) {
	query := `
		SELECT
			id, user_id, name, description, avatar_url,
			persona_type, provider, model, temperature, max_tokens,
			system_prompt, tools_enabled, streaming_enabled, is_active,
			message_count, last_chat_at, created_at, updated_at
		FROM ai_agents
		WHERE user_id = $1 AND is_active = true
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	agents := []*ai.Agent{}
	for rows.Next() {
		agent := &ai.Agent{}
		var personaTypeStr, providerStr string

		err := rows.Scan(
			&agent.ID, &agent.UserID, &agent.Name, &agent.Description, &agent.AvatarURL,
			&personaTypeStr, &providerStr, &agent.Model, &agent.Temperature, &agent.MaxTokens,
			&agent.SystemPrompt, &agent.ToolsEnabled, &agent.StreamingEnabled, &agent.IsActive,
			&agent.MessageCount, &agent.LastChatAt, &agent.CreatedAt, &agent.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Parse enums
		personaType, err := ai.ParsePersonaType(personaTypeStr)
		if err != nil {
			return nil, err
		}
		agent.PersonaType = personaType

		provider, err := ai.ParseProvider(providerStr)
		if err != nil {
			return nil, err
		}
		agent.Provider = provider

		agents = append(agents, agent)
	}

	return agents, rows.Err()
}

// Update はAI Agentを更新
func (r *AIAgentRepository) Update(ctx context.Context, agent *ai.Agent) error {
	query := `
		UPDATE ai_agents SET
			name = $2,
			description = $3,
			avatar_url = $4,
			persona_type = $5,
			provider = $6,
			model = $7,
			temperature = $8,
			max_tokens = $9,
			system_prompt = $10,
			tools_enabled = $11,
			streaming_enabled = $12,
			is_active = $13,
			message_count = $14,
			last_chat_at = $15,
			updated_at = $16
		WHERE id = $1
	`

	_, err := r.db.ExecContext(
		ctx, query,
		agent.ID,
		agent.Name, agent.Description, agent.AvatarURL,
		agent.PersonaType.String(), agent.Provider.String(), agent.Model,
		agent.Temperature, agent.MaxTokens,
		agent.SystemPrompt, agent.ToolsEnabled, agent.StreamingEnabled, agent.IsActive,
		agent.MessageCount, agent.LastChatAt, agent.UpdatedAt,
	)
	return err
}

// Delete はAI Agentを削除（ソフトデリート）
func (r *AIAgentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE ai_agents 
		SET is_active = false, updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
