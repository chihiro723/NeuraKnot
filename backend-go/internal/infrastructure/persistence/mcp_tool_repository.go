package persistence

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/lib/pq"

	"backend-go/internal/domain/mcp"
)

// MCPToolRepositoryImpl はMCPToolRepositoryの実装
type MCPToolRepositoryImpl struct {
	db *sql.DB
}

// NewMCPToolRepository はMCPToolRepositoryを作成
func NewMCPToolRepository(db *sql.DB) mcp.MCPToolRepository {
	return &MCPToolRepositoryImpl{db: db}
}

// Create は新しいツールを作成
func (r *MCPToolRepositoryImpl) Create(ctx context.Context, tool *mcp.MCPTool) error {
	query := `
		INSERT INTO mcp_tools (
			id, mcp_server_id, tool_name, tool_description,
			input_schema, category, tags, enabled, usage_count
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING synced_at, created_at
	`

	// IDが未設定の場合は生成
	if tool.ID == uuid.Nil {
		tool.ID = uuid.New()
	}

	// InputSchemaをJSONBに変換
	inputSchemaJSON, err := json.Marshal(tool.InputSchema)
	if err != nil {
		return fmt.Errorf("failed to marshal input_schema: %w", err)
	}

	err = r.db.QueryRowContext(
		ctx, query,
		tool.ID,
		tool.MCPServerID,
		tool.ToolName,
		tool.ToolDescription,
		inputSchemaJSON,
		tool.Category,
		pq.Array(tool.Tags),
		tool.Enabled,
		tool.UsageCount,
	).Scan(&tool.SyncedAt, &tool.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create mcp_tool: %w", err)
	}

	return nil
}

// CreateBatch は複数のツールを一括作成
func (r *MCPToolRepositoryImpl) CreateBatch(ctx context.Context, tools []*mcp.MCPTool) error {
	if len(tools) == 0 {
		return nil
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO mcp_tools (
			id, mcp_server_id, tool_name, tool_description,
			input_schema, category, tags, enabled, usage_count
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	for _, tool := range tools {
		if tool.ID == uuid.Nil {
			tool.ID = uuid.New()
		}

		inputSchemaJSON, err := json.Marshal(tool.InputSchema)
		if err != nil {
			return fmt.Errorf("failed to marshal input_schema: %w", err)
		}

		_, err = stmt.ExecContext(
			ctx,
			tool.ID,
			tool.MCPServerID,
			tool.ToolName,
			tool.ToolDescription,
			inputSchemaJSON,
			tool.Category,
			pq.Array(tool.Tags),
			tool.Enabled,
			tool.UsageCount,
		)

		if err != nil {
			return fmt.Errorf("failed to insert tool: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// FindByID はIDでツールを取得
func (r *MCPToolRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*mcp.MCPTool, error) {
	query := `
		SELECT 
			id, mcp_server_id, tool_name, tool_description,
			input_schema, category, tags, enabled, usage_count,
			synced_at, created_at
		FROM mcp_tools
		WHERE id = $1
	`

	tool := &mcp.MCPTool{}
	var inputSchemaJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&tool.ID,
		&tool.MCPServerID,
		&tool.ToolName,
		&tool.ToolDescription,
		&inputSchemaJSON,
		&tool.Category,
		pq.Array(&tool.Tags),
		&tool.Enabled,
		&tool.UsageCount,
		&tool.SyncedAt,
		&tool.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, mcp.ErrToolNotFound
	}

	if err != nil {
		return nil, fmt.Errorf("failed to find mcp_tool: %w", err)
	}

	// InputSchemaの変換
	if len(inputSchemaJSON) > 0 {
		if err := json.Unmarshal(inputSchemaJSON, &tool.InputSchema); err != nil {
			return nil, fmt.Errorf("failed to unmarshal input_schema: %w", err)
		}
	}

	return tool, nil
}

// FindByServerID はサーバーの全ツールを取得
func (r *MCPToolRepositoryImpl) FindByServerID(
	ctx context.Context,
	serverID uuid.UUID,
) ([]*mcp.MCPTool, error) {
	query := `
		SELECT 
			id, mcp_server_id, tool_name, tool_description,
			input_schema, category, tags, enabled, usage_count,
			synced_at, created_at
		FROM mcp_tools
		WHERE mcp_server_id = $1 AND enabled = TRUE
		ORDER BY category, tool_name
	`

	return r.queryTools(ctx, query, serverID)
}

// FindByFilter はフィルター条件でツールを検索
func (r *MCPToolRepositoryImpl) FindByFilter(
	ctx context.Context,
	filter *mcp.ToolFilter,
) ([]*mcp.MCPTool, error) {
	var conditions []string
	var args []interface{}
	argPos := 1

	if filter.ServerID != nil {
		conditions = append(conditions, fmt.Sprintf("mcp_server_id = $%d", argPos))
		args = append(args, *filter.ServerID)
		argPos++
	}

	if filter.Category != nil {
		conditions = append(conditions, fmt.Sprintf("category = $%d", argPos))
		args = append(args, *filter.Category)
		argPos++
	}

	if len(filter.Tags) > 0 {
		conditions = append(conditions, fmt.Sprintf("tags && $%d", argPos))
		args = append(args, pq.Array(filter.Tags))
		argPos++
	}

	if filter.EnabledOnly {
		conditions = append(conditions, "enabled = TRUE")
	}

	if filter.SearchQuery != nil && *filter.SearchQuery != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(tool_name ILIKE $%d OR tool_description ILIKE $%d)",
			argPos, argPos,
		))
		searchPattern := "%" + *filter.SearchQuery + "%"
		args = append(args, searchPattern)
		argPos++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT 
			id, mcp_server_id, tool_name, tool_description,
			input_schema, category, tags, enabled, usage_count,
			synced_at, created_at
		FROM mcp_tools
		%s
		ORDER BY category, tool_name
	`, whereClause)

	return r.queryTools(ctx, query, args...)
}

// queryTools は共通のクエリロジック
func (r *MCPToolRepositoryImpl) queryTools(
	ctx context.Context,
	query string,
	args ...interface{},
) ([]*mcp.MCPTool, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query mcp_tools: %w", err)
	}
	defer rows.Close()

	var tools []*mcp.MCPTool

	for rows.Next() {
		tool := &mcp.MCPTool{}
		var inputSchemaJSON []byte

		err := rows.Scan(
			&tool.ID,
			&tool.MCPServerID,
			&tool.ToolName,
			&tool.ToolDescription,
			&inputSchemaJSON,
			&tool.Category,
			pq.Array(&tool.Tags),
			&tool.Enabled,
			&tool.UsageCount,
			&tool.SyncedAt,
			&tool.CreatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan mcp_tool: %w", err)
		}

		// InputSchemaの変換
		if len(inputSchemaJSON) > 0 {
			if err := json.Unmarshal(inputSchemaJSON, &tool.InputSchema); err != nil {
				return nil, fmt.Errorf("failed to unmarshal input_schema: %w", err)
			}
		}

		tools = append(tools, tool)
	}

	return tools, nil
}

// Update はツールを更新
func (r *MCPToolRepositoryImpl) Update(ctx context.Context, tool *mcp.MCPTool) error {
	query := `
		UPDATE mcp_tools
		SET 
			tool_name = $2,
			tool_description = $3,
			input_schema = $4,
			category = $5,
			tags = $6,
			enabled = $7
		WHERE id = $1
	`

	inputSchemaJSON, err := json.Marshal(tool.InputSchema)
	if err != nil {
		return fmt.Errorf("failed to marshal input_schema: %w", err)
	}

	result, err := r.db.ExecContext(
		ctx, query,
		tool.ID,
		tool.ToolName,
		tool.ToolDescription,
		inputSchemaJSON,
		tool.Category,
		pq.Array(tool.Tags),
		tool.Enabled,
	)

	if err != nil {
		return fmt.Errorf("failed to update mcp_tool: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return mcp.ErrToolNotFound
	}

	return nil
}

// Delete はツールを削除
func (r *MCPToolRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM mcp_tools WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete mcp_tool: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return mcp.ErrToolNotFound
	}

	return nil
}

// DeleteByServerID はサーバーの全ツールを削除
func (r *MCPToolRepositoryImpl) DeleteByServerID(
	ctx context.Context,
	serverID uuid.UUID,
) error {
	query := `DELETE FROM mcp_tools WHERE mcp_server_id = $1`
	_, err := r.db.ExecContext(ctx, query, serverID)
	return err
}

// IncrementUsage は使用回数をインクリメント
func (r *MCPToolRepositoryImpl) IncrementUsage(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE mcp_tools SET usage_count = usage_count + 1 WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// SyncToolCatalog はツールカタログを同期（既存削除 + 新規作成）
func (r *MCPToolRepositoryImpl) SyncToolCatalog(
	ctx context.Context,
	serverID uuid.UUID,
	tools []*mcp.MCPTool,
) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 既存のツールを削除
	_, err = tx.ExecContext(ctx, `DELETE FROM mcp_tools WHERE mcp_server_id = $1`, serverID)
	if err != nil {
		return fmt.Errorf("failed to delete existing tools: %w", err)
	}

	// 新しいツールを挿入
	if len(tools) > 0 {
		stmt, err := tx.PrepareContext(ctx, `
			INSERT INTO mcp_tools (
				id, mcp_server_id, tool_name, tool_description,
				input_schema, category, tags, enabled, usage_count
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`)
		if err != nil {
			return fmt.Errorf("failed to prepare statement: %w", err)
		}
		defer stmt.Close()

		for _, tool := range tools {
			if tool.ID == uuid.Nil {
				tool.ID = uuid.New()
			}

			inputSchemaJSON, err := json.Marshal(tool.InputSchema)
			if err != nil {
				return fmt.Errorf("failed to marshal input_schema: %w", err)
			}

			_, err = stmt.ExecContext(
				ctx,
				tool.ID,
				tool.MCPServerID,
				tool.ToolName,
				tool.ToolDescription,
				inputSchemaJSON,
				tool.Category,
				pq.Array(tool.Tags),
				tool.Enabled,
				tool.UsageCount,
			)

			if err != nil {
				return fmt.Errorf("failed to insert tool: %w", err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
