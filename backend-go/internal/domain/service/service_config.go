package service

import (
	"time"

	"github.com/google/uuid"
)

// ServiceConfig ユーザーのサービス設定
type ServiceConfig struct {
	ID           uuid.UUID              `json:"id"`
	UserID       uuid.UUID              `json:"user_id"`
	ServiceClass string                 `json:"service_class"`
	Config       map[string]interface{} `json:"config,omitempty"`
	Auth         map[string]interface{} `json:"auth,omitempty"`
	IsEnabled    bool                   `json:"is_enabled"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}

// ServiceConfigRepository サービス設定のリポジトリインターフェース
type ServiceConfigRepository interface {
	Create(config *ServiceConfig, encryptedConfig, configNonce, encryptedAuth, authNonce []byte) error
	FindByID(id uuid.UUID) (*ServiceConfig, []byte, []byte, []byte, []byte, error)
	FindByUserID(userID uuid.UUID) ([]ServiceConfig, error)
	FindByUserAndClass(userID uuid.UUID, serviceClass string) (*ServiceConfig, []byte, []byte, []byte, []byte, error)
	Update(config *ServiceConfig, encryptedConfig, configNonce, encryptedAuth, authNonce []byte) error
	Delete(id uuid.UUID) error
}

// CreateServiceConfigInput サービス設定作成時の入力
type CreateServiceConfigInput struct {
	ServiceClass string                 `json:"service_class" binding:"required"`
	Config       map[string]interface{} `json:"config"`
	Auth         map[string]interface{} `json:"auth"`
}

// UpdateServiceConfigInput サービス設定更新時の入力
type UpdateServiceConfigInput struct {
	Config    map[string]interface{} `json:"config"`
	Auth      map[string]interface{} `json:"auth"`
	IsEnabled *bool                  `json:"is_enabled"`
}












