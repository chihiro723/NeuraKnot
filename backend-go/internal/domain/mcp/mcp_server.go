package mcp

import (
	"time"

	"github.com/google/uuid"
)

// ServerType はMCPサーバーの種類
type ServerType string

const (
	ServerTypeBuiltIn  ServerType = "built_in" // システム組み込み
	ServerTypeExternal ServerType = "external" // ユーザー登録
)

// AuthType は認証方式
type AuthType string

const (
	AuthTypeBearer AuthType = "bearer"  // Bearer Token
	AuthTypeAPIKey AuthType = "api_key" // API Key
	AuthTypeCustom AuthType = "custom"  // カスタムヘッダー
)

// MCPServer はMCPサーバーのドメインエンティティ
type MCPServer struct {
	ID            uuid.UUID         `json:"id"`
	UserID        *uuid.UUID        `json:"user_id,omitempty"` // NULL = システム共通
	Name          string            `json:"name"`
	Description   string            `json:"description,omitempty"`
	BaseURL       string            `json:"base_url"`
	ServerType    ServerType        `json:"server_type"`
	RequiresAuth  bool              `json:"requires_auth"`
	AuthType      *AuthType         `json:"auth_type,omitempty"`
	CustomHeaders map[string]string `json:"custom_headers,omitempty"`
	Enabled       bool              `json:"enabled"`
	LastSyncedAt  *time.Time        `json:"last_synced_at,omitempty"`
	ToolsCount    int               `json:"tools_count"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
	LastUsedAt    *time.Time        `json:"last_used_at,omitempty"`
}

// MCPServerWithKey は復号化されたAPIキー付きのMCPサーバー（内部処理専用）
// 外部APIレスポンスには絶対に使用しないこと
type MCPServerWithKey struct {
	MCPServer
	APIKey string `json:"-"` // JSONには絶対に出力しない
}

// RegisterMCPServerInput はMCPサーバー登録のリクエスト
type RegisterMCPServerInput struct {
	Name          string            `json:"name" binding:"required,max=255"`
	Description   string            `json:"description" binding:"max=1000"`
	BaseURL       string            `json:"base_url" binding:"required,url"`
	RequiresAuth  bool              `json:"requires_auth"`
	AuthType      *AuthType         `json:"auth_type"`
	APIKey        string            `json:"api_key" binding:"max=500"` // 平文で受け取る
	CustomHeaders map[string]string `json:"custom_headers"`
}

// UpdateMCPServerInput はMCPサーバー更新のリクエスト
type UpdateMCPServerInput struct {
	Name          *string           `json:"name" binding:"omitempty,max=255"`
	Description   *string           `json:"description" binding:"omitempty,max=1000"`
	BaseURL       *string           `json:"base_url" binding:"omitempty,url"`
	RequiresAuth  *bool             `json:"requires_auth"`
	AuthType      *AuthType         `json:"auth_type"`
	APIKey        *string           `json:"api_key" binding:"omitempty,max=500"`
	CustomHeaders map[string]string `json:"custom_headers"`
	Enabled       *bool             `json:"enabled"`
}

// IsBuiltIn はシステム組み込みサーバーかどうかを判定
func (s *MCPServer) IsBuiltIn() bool {
	return s.ServerType == ServerTypeBuiltIn
}

// IsSystemWide はシステム全体で共有されるサーバーかどうかを判定
func (s *MCPServer) IsSystemWide() bool {
	return s.UserID == nil
}

// CanBeModifiedBy は指定されたユーザーが変更可能かどうかを判定
func (s *MCPServer) CanBeModifiedBy(userID uuid.UUID) bool {
	// システム組み込みサーバーは変更不可
	if s.IsBuiltIn() {
		return false
	}

	// システム全体共有サーバーは管理者のみ（今回は変更不可として扱う）
	if s.IsSystemWide() {
		return false
	}

	// 自分が登録したサーバーのみ変更可能
	return s.UserID != nil && *s.UserID == userID
}

// Validate は入力値の妥当性を検証
func (input *RegisterMCPServerInput) Validate() error {
	if input.Name == "" {
		return ErrInvalidInput("name is required")
	}

	if input.BaseURL == "" {
		return ErrInvalidInput("base_url is required")
	}

	if input.RequiresAuth && input.APIKey == "" {
		return ErrInvalidInput("api_key is required when requires_auth is true")
	}

	return nil
}
