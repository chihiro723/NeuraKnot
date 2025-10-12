package mcp

import (
	"backend-go/internal/domain/mcp"
	"context"
	"fmt"

	"github.com/google/uuid"
)

// MCPToolUsecase はMCPツール管理のユースケース
type MCPToolUsecase struct {
	toolRepo   mcp.MCPToolRepository
	serverRepo mcp.MCPServerRepository
}

// NewMCPToolUsecase はMCPToolUsecaseを作成
func NewMCPToolUsecase(
	toolRepo mcp.MCPToolRepository,
	serverRepo mcp.MCPServerRepository,
) *MCPToolUsecase {
	return &MCPToolUsecase{
		toolRepo:   toolRepo,
		serverRepo: serverRepo,
	}
}

// ListToolsByServer はサーバーのツール一覧を取得
func (uc *MCPToolUsecase) ListToolsByServer(
	ctx context.Context,
	serverID uuid.UUID,
	userID uuid.UUID,
) ([]*mcp.MCPTool, error) {
	// サーバーの存在とアクセス権限を確認
	server, err := uc.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	// システム共通サーバーまたは自分のサーバーのみアクセス可能
	if !server.IsSystemWide() && (server.UserID == nil || *server.UserID != userID) {
		return nil, mcp.ErrUnauthorized
	}

	return uc.toolRepo.FindByServerID(ctx, serverID)
}

// GetToolByID はツールを取得
func (uc *MCPToolUsecase) GetToolByID(
	ctx context.Context,
	toolID uuid.UUID,
	userID uuid.UUID,
) (*mcp.MCPTool, error) {
	tool, err := uc.toolRepo.FindByID(ctx, toolID)
	if err != nil {
		return nil, err
	}

	// サーバーのアクセス権限を確認
	server, err := uc.serverRepo.FindByID(ctx, tool.MCPServerID)
	if err != nil {
		return nil, err
	}

	if !server.IsSystemWide() && (server.UserID == nil || *server.UserID != userID) {
		return nil, mcp.ErrUnauthorized
	}

	return tool, nil
}

// SearchTools はツールを検索
func (uc *MCPToolUsecase) SearchTools(
	ctx context.Context,
	userID uuid.UUID,
	category *string,
	tags []string,
	searchQuery *string,
) ([]*mcp.MCPTool, error) {
	// ユーザーがアクセス可能なサーバーのIDを取得
	servers, err := uc.serverRepo.FindAllAvailableForUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	if len(servers) == 0 {
		return []*mcp.MCPTool{}, nil
	}

	// 検索フィルターを構築
	filter := &mcp.ToolFilter{
		Category:    category,
		Tags:        tags,
		EnabledOnly: true,
		SearchQuery: searchQuery,
	}

	// 全サーバーのツールを検索
	var allTools []*mcp.MCPTool
	for _, server := range servers {
		filter.ServerID = &server.ID
		tools, err := uc.toolRepo.FindByFilter(ctx, filter)
		if err != nil {
			// エラーをログに記録してスキップ
			fmt.Printf("Warning: failed to search tools for server %s: %v\n", server.ID, err)
			continue
		}
		allTools = append(allTools, tools...)
	}

	return allTools, nil
}

// GetToolsByCategory はカテゴリ別にツールを取得
func (uc *MCPToolUsecase) GetToolsByCategory(
	ctx context.Context,
	serverID uuid.UUID,
	category string,
	userID uuid.UUID,
) ([]*mcp.MCPTool, error) {
	// サーバーの存在とアクセス権限を確認
	server, err := uc.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	if !server.IsSystemWide() && (server.UserID == nil || *server.UserID != userID) {
		return nil, mcp.ErrUnauthorized
	}

	filter := &mcp.ToolFilter{
		ServerID:    &serverID,
		Category:    &category,
		EnabledOnly: true,
	}

	return uc.toolRepo.FindByFilter(ctx, filter)
}

// IncrementToolUsage はツールの使用回数をインクリメント
func (uc *MCPToolUsecase) IncrementToolUsage(
	ctx context.Context,
	toolID uuid.UUID,
) error {
	return uc.toolRepo.IncrementUsage(ctx, toolID)
}
