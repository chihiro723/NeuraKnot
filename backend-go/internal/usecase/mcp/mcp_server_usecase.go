package mcp

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"backend-go/internal/crypto"
	"backend-go/internal/domain/mcp"
	domainMcp "backend-go/internal/domain/mcp"
	"backend-go/internal/infrastructure/external"
)

// MCPServerUsecase はMCPサーバー管理のユースケース
type MCPServerUsecase struct {
	serverRepo domainMcp.MCPServerRepository
	toolRepo   domainMcp.MCPToolRepository
	encryption *crypto.EncryptionService
	aiClient   *external.AIClient // Python APIクライアント
}

// NewMCPServerUsecase はMCPServerUsecaseを作成
func NewMCPServerUsecase(
	serverRepo domainMcp.MCPServerRepository,
	toolRepo domainMcp.MCPToolRepository,
	encryption *crypto.EncryptionService,
	aiClient *external.AIClient,
) *MCPServerUsecase {
	return &MCPServerUsecase{
		serverRepo: serverRepo,
		toolRepo:   toolRepo,
		encryption: encryption,
		aiClient:   aiClient,
	}
}

// RegisterServer はMCPサーバーを登録（APIキー暗号化）
func (uc *MCPServerUsecase) RegisterServer(
	ctx context.Context,
	userID uuid.UUID,
	input domainMcp.RegisterMCPServerInput,
) (*domainMcp.MCPServer, error) {
	// 入力値の検証
	if err := input.Validate(); err != nil {
		return nil, err
	}

	// MCPServerエンティティを作成
	server := &mcp.MCPServer{
		UserID:        &userID,
		Name:          input.Name,
		Description:   input.Description,
		BaseURL:       input.BaseURL,
		ServerType:    mcp.ServerTypeExternal,
		RequiresAuth:  input.RequiresAuth,
		AuthType:      input.AuthType,
		CustomHeaders: input.CustomHeaders,
		Enabled:       true,
		ToolsCount:    0,
	}

	var encryptedKey []byte
	var nonce []byte

	// APIキーが提供されている場合は暗号化
	if input.RequiresAuth && input.APIKey != "" {
		var err error
		encryptedKey, nonce, err = uc.encryption.Encrypt(input.APIKey)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt API key: %w", err)
		}
		// 暗号化後、平文のAPIキーは即座にメモリから消える（Goのガベージコレクション）
	}

	// DBに保存
	if err := uc.serverRepo.Create(ctx, server, encryptedKey, nonce); err != nil {
		return nil, fmt.Errorf("failed to register server: %w", err)
	}

	// ツールカタログを同期（非同期でも良いが、今回は同期的に実行）
	if err := uc.SyncToolCatalog(ctx, server.ID, input.APIKey); err != nil {
		// ツールカタログの同期失敗はエラーログを記録するが、サーバー登録自体は成功とする
		fmt.Printf("Warning: failed to sync tool catalog for server %s: %v\n", server.ID, err)
	}

	return server, nil
}

// GetServers はユーザーのMCPサーバー一覧を取得（APIキーなし）
func (uc *MCPServerUsecase) GetServers(
	ctx context.Context,
	userID uuid.UUID,
) ([]*mcp.MCPServer, error) {
	return uc.serverRepo.FindAllAvailableForUser(ctx, userID)
}

// GetServerByID はMCPサーバーを取得（APIキーなし）
func (uc *MCPServerUsecase) GetServerByID(
	ctx context.Context,
	serverID uuid.UUID,
	userID uuid.UUID,
) (*mcp.MCPServer, error) {
	server, err := uc.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	// アクセス権限のチェック
	if !server.IsSystemWide() && (server.UserID == nil || *server.UserID != userID) {
		return nil, mcp.ErrUnauthorized
	}

	return server, nil
}

// GetServersWithKeys はユーザーのMCPサーバー一覧を取得（APIキー復号化済み）
// ⚠️ 内部処理専用。外部APIレスポンスには使わないこと！
func (uc *MCPServerUsecase) GetServersWithKeys(
	ctx context.Context,
	userID uuid.UUID,
) ([]*mcp.MCPServerWithKey, error) {
	servers, err := uc.serverRepo.FindAllAvailableForUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]*mcp.MCPServerWithKey, 0, len(servers))

	for _, server := range servers {
		serverWithKey := &mcp.MCPServerWithKey{
			MCPServer: *server,
		}

		// APIキーが存在する場合は復号化
		if server.RequiresAuth {
			encryptedKey, nonce, err := uc.serverRepo.FindEncryptedKey(ctx, server.ID)
			if err != nil {
				// エラーをログに記録してスキップ
				fmt.Printf("Warning: failed to get encrypted key for server %s: %v\n", server.ID, err)
				continue
			}

			if len(encryptedKey) > 0 && len(nonce) > 0 {
				apiKey, err := uc.encryption.Decrypt(encryptedKey, nonce)
				if err != nil {
					// 復号化エラーをログに記録してスキップ
					fmt.Printf("Warning: failed to decrypt key for server %s: %v\n", server.ID, err)
					continue
				}

				serverWithKey.APIKey = apiKey
			}
		}

		result = append(result, serverWithKey)
	}

	return result, nil
}

// UpdateServer はMCPサーバーを更新
func (uc *MCPServerUsecase) UpdateServer(
	ctx context.Context,
	serverID uuid.UUID,
	userID uuid.UUID,
	input mcp.UpdateMCPServerInput,
) (*mcp.MCPServer, error) {
	// 既存のサーバーを取得
	server, err := uc.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	// 変更権限のチェック
	if !server.CanBeModifiedBy(userID) {
		return nil, mcp.ErrUnauthorized
	}

	// 更新内容を反映
	if input.Name != nil {
		server.Name = *input.Name
	}
	if input.Description != nil {
		server.Description = *input.Description
	}
	if input.BaseURL != nil {
		server.BaseURL = *input.BaseURL
	}
	if input.RequiresAuth != nil {
		server.RequiresAuth = *input.RequiresAuth
	}
	if input.AuthType != nil {
		server.AuthType = input.AuthType
	}
	if input.CustomHeaders != nil {
		server.CustomHeaders = input.CustomHeaders
	}
	if input.Enabled != nil {
		server.Enabled = *input.Enabled
	}

	var encryptedKey []byte
	var nonce []byte

	// APIキーが更新される場合
	if input.APIKey != nil && *input.APIKey != "" {
		var err error
		encryptedKey, nonce, err = uc.encryption.Encrypt(*input.APIKey)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt API key: %w", err)
		}
	} else if server.RequiresAuth {
		// APIキーが更新されない場合は既存のキーを保持
		encryptedKey, nonce, err = uc.serverRepo.FindEncryptedKey(ctx, serverID)
		if err != nil {
			return nil, fmt.Errorf("failed to get existing key: %w", err)
		}
	}

	// DBを更新
	if err := uc.serverRepo.Update(ctx, server, encryptedKey, nonce); err != nil {
		return nil, fmt.Errorf("failed to update server: %w", err)
	}

	return server, nil
}

// DeleteServer はMCPサーバーを削除
func (uc *MCPServerUsecase) DeleteServer(
	ctx context.Context,
	serverID uuid.UUID,
	userID uuid.UUID,
) error {
	// 既存のサーバーを取得
	server, err := uc.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	// 削除権限のチェック
	if !server.CanBeModifiedBy(userID) {
		return mcp.ErrUnauthorized
	}

	// サーバーを削除（CASCADE設定によりツールも自動削除）
	return uc.serverRepo.Delete(ctx, serverID)
}

// SyncToolCatalog はツールカタログを再同期
func (uc *MCPServerUsecase) SyncToolCatalog(
	ctx context.Context,
	serverID uuid.UUID,
	apiKey string,
) error {
	server, err := uc.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	// Built-inサーバーは同期不要
	if server.IsBuiltIn() {
		return nil
	}

	// APIキーが必要な場合で未提供の場合は復号化
	if server.RequiresAuth && apiKey == "" {
		encryptedKey, nonce, err := uc.serverRepo.FindEncryptedKey(ctx, serverID)
		if err != nil {
			return fmt.Errorf("failed to get encrypted key: %w", err)
		}

		apiKey, err = uc.encryption.Decrypt(encryptedKey, nonce)
		if err != nil {
			return fmt.Errorf("failed to decrypt key: %w", err)
		}
	}

	// Python APIからツールカタログを取得
	catalogReq := external.MCPToolCatalogRequest{
		ServerURL: server.BaseURL,
		APIKey:    &apiKey,
	}
	if len(server.CustomHeaders) > 0 {
		catalogReq.CustomHeaders = server.CustomHeaders
	}

	catalog, err := uc.aiClient.FetchToolCatalog(ctx, catalogReq)
	if err != nil {
		return fmt.Errorf("failed to fetch tool catalog: %w", err)
	}

	// ツールエンティティに変換
	tools := make([]*mcp.MCPTool, len(catalog.Tools))
	for i, toolInfo := range catalog.Tools {
		tools[i] = &mcp.MCPTool{
			MCPServerID:     serverID,
			ToolName:        toolInfo.Name,
			ToolDescription: toolInfo.Description,
			InputSchema:     toolInfo.Schema,
			Enabled:         true,
			UsageCount:      0,
		}
	}

	// ツールカタログを同期（既存削除 + 新規作成）
	if err := uc.toolRepo.SyncToolCatalog(ctx, serverID, tools); err != nil {
		return fmt.Errorf("failed to sync tool catalog: %w", err)
	}

	// ツール数とlast_synced_atを更新
	if err := uc.serverRepo.UpdateToolsCount(ctx, serverID, len(tools)); err != nil {
		return fmt.Errorf("failed to update tools count: %w", err)
	}

	if err := uc.serverRepo.UpdateLastSynced(ctx, serverID); err != nil {
		return fmt.Errorf("failed to update last synced: %w", err)
	}

	return nil
}
