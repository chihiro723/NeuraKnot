package persistence

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/lib/pq"

	"backend-go/internal/domain/mcp"
)

// MCPServerRepositoryImpl はMCPServerRepositoryの実装
type MCPServerRepositoryImpl struct {
	db *sql.DB
}

// NewMCPServerRepository はMCPServerRepositoryを作成
func NewMCPServerRepository(db *sql.DB) mcp.MCPServerRepository {
	return &MCPServerRepositoryImpl{db: db}
}

// Create は新しいMCPサーバーを作成
func (r *MCPServerRepositoryImpl) Create(
	ctx context.Context,
	server *mcp.MCPServer,
	encryptedKey, nonce []byte,
) error {
	query := `
		INSERT INTO mcp_servers (
			id, user_id, name, description, base_url, server_type,
			requires_auth, auth_type, encrypted_api_key, key_nonce,
			custom_headers, enabled, tools_count
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)
		RETURNING created_at, updated_at
	`

	// カスタムヘッダーをJSONBに変換
	customHeadersJSON, err := json.Marshal(server.CustomHeaders)
	if err != nil {
		return fmt.Errorf("failed to marshal custom_headers: %w", err)
	}

	// IDが未設定の場合は生成
	if server.ID == uuid.Nil {
		server.ID = uuid.New()
	}

	var authTypeStr *string
	if server.AuthType != nil {
		str := string(*server.AuthType)
		authTypeStr = &str
	}

	err = r.db.QueryRowContext(
		ctx, query,
		server.ID,
		server.UserID,
		server.Name,
		server.Description,
		server.BaseURL,
		server.ServerType,
		server.RequiresAuth,
		authTypeStr,
		encryptedKey,
		nonce,
		customHeadersJSON,
		server.Enabled,
		server.ToolsCount,
	).Scan(&server.CreatedAt, &server.UpdatedAt)

	if err != nil {
		// ユニーク制約違反のチェック
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				return mcp.ErrServerAlreadyExists
			}
		}
		return fmt.Errorf("failed to create mcp_server: %w", err)
	}

	return nil
}

// FindByID はIDでMCPサーバーを取得
func (r *MCPServerRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*mcp.MCPServer, error) {
	query := `
		SELECT 
			id, user_id, name, description, base_url, server_type,
			requires_auth, auth_type, custom_headers, enabled,
			last_synced_at, tools_count, created_at, updated_at, last_used_at
		FROM mcp_servers
		WHERE id = $1
	`

	server := &mcp.MCPServer{}
	var customHeadersJSON []byte
	var authTypeStr sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&server.ID,
		&server.UserID,
		&server.Name,
		&server.Description,
		&server.BaseURL,
		&server.ServerType,
		&server.RequiresAuth,
		&authTypeStr,
		&customHeadersJSON,
		&server.Enabled,
		&server.LastSyncedAt,
		&server.ToolsCount,
		&server.CreatedAt,
		&server.UpdatedAt,
		&server.LastUsedAt,
	)

	if err == sql.ErrNoRows {
		return nil, mcp.ErrServerNotFound
	}

	if err != nil {
		return nil, fmt.Errorf("failed to find mcp_server: %w", err)
	}

	// AuthTypeの変換
	if authTypeStr.Valid {
		authType := mcp.AuthType(authTypeStr.String)
		server.AuthType = &authType
	}

	// カスタムヘッダーの変換
	if len(customHeadersJSON) > 0 {
		if err := json.Unmarshal(customHeadersJSON, &server.CustomHeaders); err != nil {
			return nil, fmt.Errorf("failed to unmarshal custom_headers: %w", err)
		}
	}

	return server, nil
}

// FindByUserID はユーザーのMCPサーバー一覧を取得
func (r *MCPServerRepositoryImpl) FindByUserID(
	ctx context.Context,
	userID uuid.UUID,
) ([]*mcp.MCPServer, error) {
	query := `
		SELECT 
			id, user_id, name, description, base_url, server_type,
			requires_auth, auth_type, custom_headers, enabled,
			last_synced_at, tools_count, created_at, updated_at, last_used_at
		FROM mcp_servers
		WHERE user_id = $1 AND enabled = TRUE
		ORDER BY created_at DESC
	`

	return r.queryServers(ctx, query, userID)
}

// FindAllAvailableForUser はユーザーが利用可能な全サーバーを取得
func (r *MCPServerRepositoryImpl) FindAllAvailableForUser(
	ctx context.Context,
	userID uuid.UUID,
) ([]*mcp.MCPServer, error) {
	query := `
		SELECT 
			id, user_id, name, description, base_url, server_type,
			requires_auth, auth_type, custom_headers, enabled,
			last_synced_at, tools_count, created_at, updated_at, last_used_at
		FROM mcp_servers
		WHERE (user_id = $1 OR user_id IS NULL) AND enabled = TRUE
		ORDER BY 
			CASE WHEN server_type = 'built_in' THEN 0 ELSE 1 END,
			created_at DESC
	`

	return r.queryServers(ctx, query, userID)
}

// queryServers は共通のクエリロジック
func (r *MCPServerRepositoryImpl) queryServers(
	ctx context.Context,
	query string,
	args ...interface{},
) ([]*mcp.MCPServer, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query mcp_servers: %w", err)
	}
	defer rows.Close()

	var servers []*mcp.MCPServer

	for rows.Next() {
		server := &mcp.MCPServer{}
		var customHeadersJSON []byte
		var authTypeStr sql.NullString

		err := rows.Scan(
			&server.ID,
			&server.UserID,
			&server.Name,
			&server.Description,
			&server.BaseURL,
			&server.ServerType,
			&server.RequiresAuth,
			&authTypeStr,
			&customHeadersJSON,
			&server.Enabled,
			&server.LastSyncedAt,
			&server.ToolsCount,
			&server.CreatedAt,
			&server.UpdatedAt,
			&server.LastUsedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan mcp_server: %w", err)
		}

		// AuthTypeの変換
		if authTypeStr.Valid {
			authType := mcp.AuthType(authTypeStr.String)
			server.AuthType = &authType
		}

		// カスタムヘッダーの変換
		if len(customHeadersJSON) > 0 {
			if err := json.Unmarshal(customHeadersJSON, &server.CustomHeaders); err != nil {
				return nil, fmt.Errorf("failed to unmarshal custom_headers: %w", err)
			}
		}

		servers = append(servers, server)
	}

	return servers, nil
}

// FindEncryptedKey は暗号化されたAPIキーとNonceを取得
func (r *MCPServerRepositoryImpl) FindEncryptedKey(
	ctx context.Context,
	serverID uuid.UUID,
) (encryptedKey []byte, nonce []byte, err error) {
	query := `
		SELECT encrypted_api_key, key_nonce
		FROM mcp_servers
		WHERE id = $1 AND requires_auth = TRUE
	`

	err = r.db.QueryRowContext(ctx, query, serverID).Scan(&encryptedKey, &nonce)
	if err == sql.ErrNoRows {
		return nil, nil, mcp.ErrServerNotFound
	}

	if err != nil {
		return nil, nil, fmt.Errorf("failed to get encrypted key: %w", err)
	}

	return encryptedKey, nonce, nil
}

// Update はMCPサーバーを更新
func (r *MCPServerRepositoryImpl) Update(
	ctx context.Context,
	server *mcp.MCPServer,
	encryptedKey, nonce []byte,
) error {
	query := `
		UPDATE mcp_servers
		SET 
			name = $2,
			description = $3,
			base_url = $4,
			requires_auth = $5,
			auth_type = $6,
			encrypted_api_key = $7,
			key_nonce = $8,
			custom_headers = $9,
			enabled = $10
		WHERE id = $1
	`

	customHeadersJSON, err := json.Marshal(server.CustomHeaders)
	if err != nil {
		return fmt.Errorf("failed to marshal custom_headers: %w", err)
	}

	var authTypeStr *string
	if server.AuthType != nil {
		str := string(*server.AuthType)
		authTypeStr = &str
	}

	result, err := r.db.ExecContext(
		ctx, query,
		server.ID,
		server.Name,
		server.Description,
		server.BaseURL,
		server.RequiresAuth,
		authTypeStr,
		encryptedKey,
		nonce,
		customHeadersJSON,
		server.Enabled,
	)

	if err != nil {
		return fmt.Errorf("failed to update mcp_server: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return mcp.ErrServerNotFound
	}

	return nil
}

// Delete はMCPサーバーを削除
func (r *MCPServerRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM mcp_servers WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete mcp_server: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return mcp.ErrServerNotFound
	}

	return nil
}

// UpdateLastUsed は最終使用日時を更新
func (r *MCPServerRepositoryImpl) UpdateLastUsed(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE mcp_servers SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// UpdateToolsCount はツール数を更新
func (r *MCPServerRepositoryImpl) UpdateToolsCount(
	ctx context.Context,
	id uuid.UUID,
	count int,
) error {
	query := `UPDATE mcp_servers SET tools_count = $2 WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id, count)
	return err
}

// UpdateLastSynced は最終同期日時を更新
func (r *MCPServerRepositoryImpl) UpdateLastSynced(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE mcp_servers SET last_synced_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
