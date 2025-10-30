package persistence

import (
	"backend-go/internal/domain/conversation"
	"context"
	"database/sql"

	"github.com/google/uuid"
)

// ToolUsageRepository はツール使用履歴のリポジトリ実装
type ToolUsageRepository struct {
	db *sql.DB
}

// NewToolUsageRepository はツール使用履歴のリポジトリを作成
func NewToolUsageRepository(db *sql.DB) *ToolUsageRepository {
	return &ToolUsageRepository{db: db}
}

// Save はツール使用履歴を保存（UPSERT）
func (r *ToolUsageRepository) Save(toolUsage *conversation.ToolUsage) error {
	query := `
		INSERT INTO ai_tool_usage (
			id, session_id, message_id, tool_name, tool_category,
			input_data, output_data, status, error_message, execution_time_ms, insert_position, executed_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (id) DO UPDATE SET
			session_id = EXCLUDED.session_id,
			message_id = EXCLUDED.message_id,
			tool_name = EXCLUDED.tool_name,
			tool_category = EXCLUDED.tool_category,
			input_data = EXCLUDED.input_data,
			output_data = EXCLUDED.output_data,
			status = EXCLUDED.status,
			error_message = EXCLUDED.error_message,
			execution_time_ms = EXCLUDED.execution_time_ms,
			insert_position = EXCLUDED.insert_position,
			executed_at = EXCLUDED.executed_at
	`
	_, err := r.db.ExecContext(
		context.Background(),
		query,
		toolUsage.ID,
		toolUsage.SessionID,
		toolUsage.MessageID,
		toolUsage.ToolName,
		toolUsage.ToolCategory,
		toolUsage.InputData,
		toolUsage.OutputData,
		toolUsage.Status,
		toolUsage.ErrorMessage,
		toolUsage.ExecutionTimeMs,
		toolUsage.InsertPosition,
		toolUsage.ExecutedAt,
	)
	return err
}

// FindByMessageID はメッセージIDでツール使用履歴を取得
func (r *ToolUsageRepository) FindByMessageID(messageID uuid.UUID) ([]*conversation.ToolUsage, error) {
	query := `
		SELECT 
			id, session_id, message_id, tool_name, tool_category,
			input_data, output_data, status, error_message, execution_time_ms, insert_position, executed_at
		FROM ai_tool_usage
		WHERE message_id = $1
		ORDER BY insert_position ASC NULLS LAST, executed_at ASC
	`

	rows, err := r.db.QueryContext(context.Background(), query, messageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var toolUsages []*conversation.ToolUsage
	for rows.Next() {
		tu := &conversation.ToolUsage{}
		err := rows.Scan(
			&tu.ID,
			&tu.SessionID,
			&tu.MessageID,
			&tu.ToolName,
			&tu.ToolCategory,
			&tu.InputData,
			&tu.OutputData,
			&tu.Status,
			&tu.ErrorMessage,
			&tu.ExecutionTimeMs,
			&tu.InsertPosition,
			&tu.ExecutedAt,
		)
		if err != nil {
			return nil, err
		}
		toolUsages = append(toolUsages, tu)
	}

	return toolUsages, nil
}

// FindBySessionID はセッションIDでツール使用履歴を取得
func (r *ToolUsageRepository) FindBySessionID(sessionID uuid.UUID) ([]*conversation.ToolUsage, error) {
	query := `
		SELECT 
			id, session_id, message_id, tool_name, tool_category,
			input_data, output_data, status, error_message, execution_time_ms, insert_position, executed_at
		FROM ai_tool_usage
		WHERE session_id = $1
		ORDER BY insert_position ASC NULLS LAST, executed_at ASC
	`

	rows, err := r.db.QueryContext(context.Background(), query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var toolUsages []*conversation.ToolUsage
	for rows.Next() {
		tu := &conversation.ToolUsage{}
		err := rows.Scan(
			&tu.ID,
			&tu.SessionID,
			&tu.MessageID,
			&tu.ToolName,
			&tu.ToolCategory,
			&tu.InputData,
			&tu.OutputData,
			&tu.Status,
			&tu.ErrorMessage,
			&tu.ExecutionTimeMs,
			&tu.InsertPosition,
			&tu.ExecutedAt,
		)
		if err != nil {
			return nil, err
		}
		toolUsages = append(toolUsages, tu)
	}

	return toolUsages, nil
}

// UpdateInsertPosition はツール使用履歴の挿入位置を更新
func (r *ToolUsageRepository) UpdateInsertPosition(toolUsageID uuid.UUID, insertPosition int) error {
	query := `
		UPDATE ai_tool_usage
		SET insert_position = $1
		WHERE id = $2
	`

	_, err := r.db.ExecContext(context.Background(), query, insertPosition, toolUsageID)
	return err
}
