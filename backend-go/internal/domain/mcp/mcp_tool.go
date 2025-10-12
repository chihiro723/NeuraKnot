package mcp

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ToolCategory はツールのカテゴリ
type ToolCategory string

const (
	CategoryDatetime ToolCategory = "datetime"
	CategoryMath     ToolCategory = "math"
	CategoryText     ToolCategory = "text"
	CategoryData     ToolCategory = "data"
	CategorySecurity ToolCategory = "security"
	CategoryUtility  ToolCategory = "utility"
	CategoryExternal ToolCategory = "external"
)

// MCPTool はMCPツールのドメインエンティティ
type MCPTool struct {
	ID              uuid.UUID              `json:"id"`
	MCPServerID     uuid.UUID              `json:"mcp_server_id"`
	ToolName        string                 `json:"tool_name"`
	ToolDescription string                 `json:"tool_description,omitempty"`
	InputSchema     map[string]interface{} `json:"input_schema,omitempty"`
	Category        string                 `json:"category,omitempty"`
	Tags            []string               `json:"tags,omitempty"`
	Enabled         bool                   `json:"enabled"`
	UsageCount      int                    `json:"usage_count"`
	SyncedAt        time.Time              `json:"synced_at"`
	CreatedAt       time.Time              `json:"created_at"`
}

// ToolCatalogInput はツールカタログ同期時の入力
type ToolCatalogInput struct {
	Tools []ToolDefinition `json:"tools"`
}

// ToolDefinition はMCPサーバーから取得したツール定義
type ToolDefinition struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"input_schema"`
	Category    string                 `json:"category,omitempty"`
	Tags        []string               `json:"tags,omitempty"`
}

// ToolFilter はツール検索のフィルター
type ToolFilter struct {
	ServerID    *uuid.UUID
	Category    *string
	Tags        []string
	EnabledOnly bool
	SearchQuery *string
}

// IncrementUsage は使用回数をインクリメント
func (t *MCPTool) IncrementUsage() {
	t.UsageCount++
}

// IsEnabled はツールが有効かどうかを判定
func (t *MCPTool) IsEnabled() bool {
	return t.Enabled
}

// MarshalInputSchema はInputSchemaをJSON文字列に変換
func (t *MCPTool) MarshalInputSchema() ([]byte, error) {
	if t.InputSchema == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(t.InputSchema)
}

// UnmarshalInputSchema はJSON文字列をInputSchemaに変換
func (t *MCPTool) UnmarshalInputSchema(data []byte) error {
	if len(data) == 0 {
		t.InputSchema = make(map[string]interface{})
		return nil
	}
	return json.Unmarshal(data, &t.InputSchema)
}
