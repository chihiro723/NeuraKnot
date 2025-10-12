package mcp

import (
	"context"

	"github.com/google/uuid"
)

// MCPServerRepository はMCPサーバーのリポジトリインターフェース
type MCPServerRepository interface {
	// Create は新しいMCPサーバーを作成（暗号化済みAPIキーを保存）
	Create(ctx context.Context, server *MCPServer, encryptedKey, nonce []byte) error

	// FindByID はIDでMCPサーバーを取得
	FindByID(ctx context.Context, id uuid.UUID) (*MCPServer, error)

	// FindByUserID はユーザーのMCPサーバー一覧を取得
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]*MCPServer, error)

	// FindAllAvailableForUser はユーザーが利用可能な全サーバーを取得
	// (ユーザー自身のサーバー + システム共通サーバー)
	FindAllAvailableForUser(ctx context.Context, userID uuid.UUID) ([]*MCPServer, error)

	// FindEncryptedKey は暗号化されたAPIキーとNonceを取得
	FindEncryptedKey(ctx context.Context, serverID uuid.UUID) (encryptedKey []byte, nonce []byte, err error)

	// Update はMCPサーバーを更新
	Update(ctx context.Context, server *MCPServer, encryptedKey, nonce []byte) error

	// Delete はMCPサーバーを削除
	Delete(ctx context.Context, id uuid.UUID) error

	// UpdateLastUsed は最終使用日時を更新
	UpdateLastUsed(ctx context.Context, id uuid.UUID) error

	// UpdateToolsCount はツール数を更新
	UpdateToolsCount(ctx context.Context, id uuid.UUID, count int) error

	// UpdateLastSynced は最終同期日時を更新
	UpdateLastSynced(ctx context.Context, id uuid.UUID) error
}

// MCPToolRepository はMCPツールのリポジトリインターフェース
type MCPToolRepository interface {
	// Create は新しいツールを作成
	Create(ctx context.Context, tool *MCPTool) error

	// CreateBatch は複数のツールを一括作成
	CreateBatch(ctx context.Context, tools []*MCPTool) error

	// FindByID はIDでツールを取得
	FindByID(ctx context.Context, id uuid.UUID) (*MCPTool, error)

	// FindByServerID はサーバーの全ツールを取得
	FindByServerID(ctx context.Context, serverID uuid.UUID) ([]*MCPTool, error)

	// FindByFilter はフィルター条件でツールを検索
	FindByFilter(ctx context.Context, filter *ToolFilter) ([]*MCPTool, error)

	// Update はツールを更新
	Update(ctx context.Context, tool *MCPTool) error

	// Delete はツールを削除
	Delete(ctx context.Context, id uuid.UUID) error

	// DeleteByServerID はサーバーの全ツールを削除
	DeleteByServerID(ctx context.Context, serverID uuid.UUID) error

	// IncrementUsage は使用回数をインクリメント
	IncrementUsage(ctx context.Context, id uuid.UUID) error

	// SyncToolCatalog はツールカタログを同期（既存削除 + 新規作成）
	SyncToolCatalog(ctx context.Context, serverID uuid.UUID, tools []*MCPTool) error
}

// AIAgentMCPRepository はAI AgentとMCPの紐付けリポジトリインターフェース
type AIAgentMCPRepository interface {
	// AttachServer はAI AgentにMCPサーバーを紐付け
	AttachServer(ctx context.Context, agentID, serverID uuid.UUID, mode ToolSelectionMode) (uuid.UUID, error)

	// AttachTools はAI Agentに個別ツールを紐付け
	AttachTools(ctx context.Context, agentServerID uuid.UUID, toolIDs []uuid.UUID) error

	// DetachServer はAI AgentからMCPサーバーを解除
	DetachServer(ctx context.Context, agentID, serverID uuid.UUID) error

	// GetAgentServers はAI Agentに紐付けられたサーバー一覧を取得
	GetAgentServers(ctx context.Context, agentID uuid.UUID) ([]*AgentMCPServerConfig, error)

	// GetAgentTools はAI Agentに紐付けられたツール一覧を取得
	GetAgentTools(ctx context.Context, agentServerID uuid.UUID) ([]*MCPTool, error)
}

// ToolSelectionMode はツール選択モード
type ToolSelectionMode string

const (
	ToolSelectionModeAll      ToolSelectionMode = "all"      // 全ツールを使用
	ToolSelectionModeSelected ToolSelectionMode = "selected" // 特定のツールのみ
)

// AgentMCPServerConfig はAI AgentのMCPサーバー設定
type AgentMCPServerConfig struct {
	ID                uuid.UUID         `json:"id"`
	AgentID           uuid.UUID         `json:"agent_id"`
	ServerID          uuid.UUID         `json:"server_id"`
	Enabled           bool              `json:"enabled"`
	ToolSelectionMode ToolSelectionMode `json:"tool_selection_mode"`
	Server            *MCPServer        `json:"server,omitempty"`
	SelectedTools     []*MCPTool        `json:"selected_tools,omitempty"`
}
