package analytics

import (
	"context"

	"github.com/google/uuid"
)

// Repository 統計データ取得用のリポジトリインターフェース
type Repository interface {
	// GetTokenStats トークン使用量とコスト統計を取得
	GetTokenStats(ctx context.Context, userID uuid.UUID, timeRange TimeRange) (*TokenStats, error)

	// GetActivityStats 活動量統計を取得
	GetActivityStats(ctx context.Context, userID uuid.UUID, timeRange TimeRange) (*ActivityStats, error)

	// GetAgentPerformanceStats エージェント別パフォーマンスを取得
	GetAgentPerformanceStats(ctx context.Context, userID uuid.UUID, timeRange TimeRange) ([]*AgentPerformance, error)

	// GetToolUsageStats ツール使用統計を取得
	GetToolUsageStats(ctx context.Context, userID uuid.UUID, timeRange TimeRange) (*ToolUsageStats, error)

	// GetServiceStats サービス連携統計を取得
	GetServiceStats(ctx context.Context, userID uuid.UUID) (*ServiceStats, error)
}
