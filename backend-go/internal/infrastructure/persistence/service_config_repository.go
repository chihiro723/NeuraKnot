package persistence

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"backend-go/internal/crypto"
	"backend-go/internal/domain/service"

	"github.com/google/uuid"
)

type serviceConfigRepository struct {
	db  *sql.DB
	enc *crypto.EncryptionService
}

// NewServiceConfigRepository サービス設定リポジトリを作成
func NewServiceConfigRepository(db *sql.DB, enc *crypto.EncryptionService) service.ServiceConfigRepository {
	return &serviceConfigRepository{
		db:  db,
		enc: enc,
	}
}

// Create サービス設定を作成
func (r *serviceConfigRepository) Create(config *service.ServiceConfig, encryptedConfig, configNonce, encryptedAuth, authNonce []byte) error {
	config.ID = uuid.New()
	config.CreatedAt = time.Now()
	config.UpdatedAt = time.Now()

	query := `
		INSERT INTO user_service_configs (
			id, user_id, service_class, encrypted_config, config_nonce,
			encrypted_auth, auth_nonce, is_enabled, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := r.db.Exec(
		query,
		config.ID, config.UserID, config.ServiceClass,
		encryptedConfig, configNonce, encryptedAuth, authNonce,
		config.IsEnabled, config.CreatedAt, config.UpdatedAt,
	)

	return err
}

// FindByID IDでサービス設定を取得
func (r *serviceConfigRepository) FindByID(id uuid.UUID) (*service.ServiceConfig, []byte, []byte, []byte, []byte, error) {
	query := `
		SELECT id, user_id, service_class, encrypted_config, config_nonce,
		       encrypted_auth, auth_nonce, is_enabled, created_at, updated_at
		FROM user_service_configs
		WHERE id = $1
	`

	var config service.ServiceConfig
	var encryptedConfig, configNonce, encryptedAuth, authNonce []byte

	err := r.db.QueryRow(query, id).Scan(
		&config.ID, &config.UserID, &config.ServiceClass,
		&encryptedConfig, &configNonce, &encryptedAuth, &authNonce,
		&config.IsEnabled, &config.CreatedAt, &config.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil, nil, nil, nil, errors.New("service config not found")
	}
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}

	// 復号化
	if len(encryptedConfig) > 0 && len(configNonce) > 0 {
		decryptedConfig, err := r.enc.Decrypt(encryptedConfig, configNonce)
		if err == nil {
			_ = json.Unmarshal([]byte(decryptedConfig), &config.Config)
		}
	}

	if len(encryptedAuth) > 0 && len(authNonce) > 0 {
		decryptedAuth, err := r.enc.Decrypt(encryptedAuth, authNonce)
		if err == nil {
			_ = json.Unmarshal([]byte(decryptedAuth), &config.Auth)
		}
	}

	return &config, encryptedConfig, configNonce, encryptedAuth, authNonce, nil
}

// FindByUserID ユーザーIDでサービス設定一覧を取得
func (r *serviceConfigRepository) FindByUserID(userID uuid.UUID) ([]service.ServiceConfig, error) {
	query := `
		SELECT id, user_id, service_class, encrypted_config, config_nonce,
		       encrypted_auth, auth_nonce, is_enabled, created_at, updated_at
		FROM user_service_configs
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var configs []service.ServiceConfig

	for rows.Next() {
		var config service.ServiceConfig
		var encryptedConfig, configNonce, encryptedAuth, authNonce []byte

		err := rows.Scan(
			&config.ID, &config.UserID, &config.ServiceClass,
			&encryptedConfig, &configNonce, &encryptedAuth, &authNonce,
			&config.IsEnabled, &config.CreatedAt, &config.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// 復号化
		if len(encryptedConfig) > 0 && len(configNonce) > 0 {
			decryptedConfig, err := r.enc.Decrypt(encryptedConfig, configNonce)
			if err == nil {
				_ = json.Unmarshal([]byte(decryptedConfig), &config.Config)
			}
		}

		if len(encryptedAuth) > 0 && len(authNonce) > 0 {
			decryptedAuth, err := r.enc.Decrypt(encryptedAuth, authNonce)
			if err == nil {
				_ = json.Unmarshal([]byte(decryptedAuth), &config.Auth)
			}
		}

		configs = append(configs, config)
	}

	return configs, rows.Err()
}

// FindByUserAndClass ユーザーIDとサービスクラスでサービス設定を取得
func (r *serviceConfigRepository) FindByUserAndClass(userID uuid.UUID, serviceClass string) (*service.ServiceConfig, []byte, []byte, []byte, []byte, error) {
	query := `
		SELECT id, user_id, service_class, encrypted_config, config_nonce,
		       encrypted_auth, auth_nonce, is_enabled, created_at, updated_at
		FROM user_service_configs
		WHERE user_id = $1 AND service_class = $2
	`

	var config service.ServiceConfig
	var encryptedConfig, configNonce, encryptedAuth, authNonce []byte

	err := r.db.QueryRow(query, userID, serviceClass).Scan(
		&config.ID, &config.UserID, &config.ServiceClass,
		&encryptedConfig, &configNonce, &encryptedAuth, &authNonce,
		&config.IsEnabled, &config.CreatedAt, &config.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil, nil, nil, nil, errors.New("service config not found")
	}
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}

	// 復号化
	if len(encryptedConfig) > 0 && len(configNonce) > 0 {
		decryptedConfig, err := r.enc.Decrypt(encryptedConfig, configNonce)
		if err != nil {
			return nil, nil, nil, nil, nil, fmt.Errorf("failed to decrypt config: %w", err)
		}
		_ = json.Unmarshal([]byte(decryptedConfig), &config.Config)
	}

	if len(encryptedAuth) > 0 && len(authNonce) > 0 {
		decryptedAuth, err := r.enc.Decrypt(encryptedAuth, authNonce)
		if err != nil {
			return nil, nil, nil, nil, nil, fmt.Errorf("failed to decrypt auth: %w", err)
		}
		_ = json.Unmarshal([]byte(decryptedAuth), &config.Auth)
	}

	return &config, encryptedConfig, configNonce, encryptedAuth, authNonce, nil
}

// Update サービス設定を更新
func (r *serviceConfigRepository) Update(config *service.ServiceConfig, encryptedConfig, configNonce, encryptedAuth, authNonce []byte) error {
	config.UpdatedAt = time.Now()

	query := `
		UPDATE user_service_configs
		SET encrypted_config = $1, config_nonce = $2, encrypted_auth = $3,
		    auth_nonce = $4, is_enabled = $5, updated_at = $6
		WHERE id = $7
	`

	result, err := r.db.Exec(
		query,
		encryptedConfig, configNonce, encryptedAuth, authNonce,
		config.IsEnabled, config.UpdatedAt, config.ID,
	)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("service config not found")
	}

	return nil
}

// Delete サービス設定を削除
func (r *serviceConfigRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM user_service_configs WHERE id = $1`

	result, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("service config not found")
	}

	return nil
}
