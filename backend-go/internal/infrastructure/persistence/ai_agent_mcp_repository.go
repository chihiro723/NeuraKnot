package persistence

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"

	"backend-go/internal/domain/mcp"
)

// AIAgentMCPRepositoryImpl はAIAgentMCPRepositoryの実装
type AIAgentMCPRepositoryImpl struct {
	db *sql.DB
}

// NewAIAgentMCPRepository はAIAgentMCPRepositoryを作成
func NewAIAgentMCPRepository(db *sql.DB) mcp.AIAgentMCPRepository {
	return &AIAgentMCPRepositoryImpl{db: db}
}

// AttachServer はAI AgentにMCPサーバーを紐付け
func (r *AIAgentMCPRepositoryImpl) AttachServer(
	ctx context.Context,
	agentID, serverID uuid.UUID,
	mode mcp.ToolSelectionMode,
) (uuid.UUID, error) {
	query := `
		INSERT INTO ai_agent_mcp_servers (
			id, ai_agent_id, mcp_server_id, enabled, tool_selection_mode
		) VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (ai_agent_id, mcp_server_id)
		DO UPDATE SET 
			enabled = EXCLUDED.enabled,
			tool_selection_mode = EXCLUDED.tool_selection_mode
		RETURNING id
	`

	id := uuid.New()

	err := r.db.QueryRowContext(
		ctx, query,
		id,
		agentID,
		serverID,
		true,
		mode,
	).Scan(&id)

	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to attach mcp server: %w", err)
	}

	return id, nil
}

// AttachTools はAI Agentに個別ツールを紐付け
func (r *AIAgentMCPRepositoryImpl) AttachTools(
	ctx context.Context,
	agentServerID uuid.UUID,
	toolIDs []uuid.UUID,
) error {
	if len(toolIDs) == 0 {
		return nil
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 既存のツール紐付けを削除
	_, err = tx.ExecContext(
		ctx,
		`DELETE FROM ai_agent_mcp_tools WHERE ai_agent_mcp_server_id = $1`,
		agentServerID,
	)
	if err != nil {
		return fmt.Errorf("failed to delete existing tools: %w", err)
	}

	// 新しいツールを紐付け
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO ai_agent_mcp_tools (
			id, ai_agent_mcp_server_id, mcp_tool_id, enabled
		) VALUES ($1, $2, $3, $4)
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	for _, toolID := range toolIDs {
		_, err = stmt.ExecContext(ctx, uuid.New(), agentServerID, toolID, true)
		if err != nil {
			return fmt.Errorf("failed to attach tool: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// DetachServer はAI AgentからMCPサーバーを解除
func (r *AIAgentMCPRepositoryImpl) DetachServer(
	ctx context.Context,
	agentID, serverID uuid.UUID,
) error {
	query := `
		DELETE FROM ai_agent_mcp_servers
		WHERE ai_agent_id = $1 AND mcp_server_id = $2
	`

	_, err := r.db.ExecContext(ctx, query, agentID, serverID)
	if err != nil {
		return fmt.Errorf("failed to detach mcp server: %w", err)
	}

	return nil
}

// GetAgentServers はAI Agentに紐付けられたサーバー一覧を取得
func (r *AIAgentMCPRepositoryImpl) GetAgentServers(
	ctx context.Context,
	agentID uuid.UUID,
) ([]*mcp.AgentMCPServerConfig, error) {
	query := `
		SELECT 
			ams.id, ams.ai_agent_id, ams.mcp_server_id, ams.enabled, ams.tool_selection_mode,
			ms.id, ms.user_id, ms.name, ms.description, ms.base_url, ms.server_type,
			ms.requires_auth, ms.auth_type, ms.enabled, ms.tools_count,
			ms.created_at, ms.updated_at
		FROM ai_agent_mcp_servers ams
		JOIN mcp_servers ms ON ams.mcp_server_id = ms.id
		WHERE ams.ai_agent_id = $1 AND ams.enabled = TRUE AND ms.enabled = TRUE
		ORDER BY 
			CASE WHEN ms.server_type = 'built_in' THEN 0 ELSE 1 END,
			ams.created_at
	`

	rows, err := r.db.QueryContext(ctx, query, agentID)
	if err != nil {
		return nil, fmt.Errorf("failed to query agent servers: %w", err)
	}
	defer rows.Close()

	var configs []*mcp.AgentMCPServerConfig

	for rows.Next() {
		config := &mcp.AgentMCPServerConfig{
			Server: &mcp.MCPServer{},
		}

		var authTypeStr sql.NullString

		err := rows.Scan(
			&config.ID,
			&config.AgentID,
			&config.ServerID,
			&config.Enabled,
			&config.ToolSelectionMode,
			&config.Server.ID,
			&config.Server.UserID,
			&config.Server.Name,
			&config.Server.Description,
			&config.Server.BaseURL,
			&config.Server.ServerType,
			&config.Server.RequiresAuth,
			&authTypeStr,
			&config.Server.Enabled,
			&config.Server.ToolsCount,
			&config.Server.CreatedAt,
			&config.Server.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan agent server config: %w", err)
		}

		// AuthTypeの変換
		if authTypeStr.Valid {
			authType := mcp.AuthType(authTypeStr.String)
			config.Server.AuthType = &authType
		}

		configs = append(configs, config)
	}

	return configs, nil
}

// GetAgentTools はAI Agentに紐付けられたツール一覧を取得
func (r *AIAgentMCPRepositoryImpl) GetAgentTools(
	ctx context.Context,
	agentServerID uuid.UUID,
) ([]*mcp.MCPTool, error) {
	query := `
		SELECT 
			mt.id, mt.mcp_server_id, mt.tool_name, mt.tool_description,
			mt.input_schema, mt.category, mt.tags, mt.enabled, mt.usage_count,
			mt.synced_at, mt.created_at
		FROM ai_agent_mcp_tools amt
		JOIN mcp_tools mt ON amt.mcp_tool_id = mt.id
		WHERE amt.ai_agent_mcp_server_id = $1 AND amt.enabled = TRUE AND mt.enabled = TRUE
		ORDER BY mt.category, mt.tool_name
	`

	rows, err := r.db.QueryContext(ctx, query, agentServerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query agent tools: %w", err)
	}
	defer rows.Close()

	var tools []*mcp.MCPTool

	for rows.Next() {
		tool := &mcp.MCPTool{}
		var inputSchemaJSON []byte
		var tags []string

		err := rows.Scan(
			&tool.ID,
			&tool.MCPServerID,
			&tool.ToolName,
			&tool.ToolDescription,
			&inputSchemaJSON,
			&tool.Category,
			&tags,
			&tool.Enabled,
			&tool.UsageCount,
			&tool.SyncedAt,
			&tool.CreatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan tool: %w", err)
		}

		tool.Tags = tags

		// InputSchemaの変換
		if len(inputSchemaJSON) > 0 {
			if err := tool.UnmarshalInputSchema(inputSchemaJSON); err != nil {
				return nil, fmt.Errorf("failed to unmarshal input_schema: %w", err)
			}
		}

		tools = append(tools, tool)
	}

	return tools, nil
}
