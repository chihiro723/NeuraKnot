package ai

import (
	"context"

	"github.com/google/uuid"
)

// Repository はAI Agentのリポジトリインターフェース
type Repository interface {
	// Save はAI Agentを保存
	Save(ctx context.Context, agent *Agent) error

	// FindByID はIDでAI Agentを取得
	FindByID(ctx context.Context, id uuid.UUID) (*Agent, error)

	// FindByUserID はユーザーIDでAI Agentリストを取得
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]*Agent, error)

	// Update はAI Agentを更新
	Update(ctx context.Context, agent *Agent) error

	// Delete はAI Agentを削除（ソフトデリート）
	Delete(ctx context.Context, id uuid.UUID) error
}
