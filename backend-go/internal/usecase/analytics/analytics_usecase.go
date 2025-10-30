package analytics

import (
	"context"
	"fmt"

	"backend-go/internal/domain/analytics"

	"github.com/google/uuid"
)

// AnalyticsUsecase 統計データのユースケース
type AnalyticsUsecase struct {
	repo analytics.Repository
}

// NewAnalyticsUsecase 統計データのユースケースを作成
func NewAnalyticsUsecase(repo analytics.Repository) *AnalyticsUsecase {
	return &AnalyticsUsecase{
		repo: repo,
	}
}

// GetUserAnalytics ユーザーの統計データを取得
func (u *AnalyticsUsecase) GetUserAnalytics(ctx context.Context, userID uuid.UUID, timeRange analytics.TimeRange) (*analytics.UserAnalytics, error) {
	// トークン統計を取得
	tokenStats, err := u.repo.GetTokenStats(ctx, userID, timeRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get token stats: %w", err)
	}

	// 活動量統計を取得
	activityStats, err := u.repo.GetActivityStats(ctx, userID, timeRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get activity stats: %w", err)
	}

	// エージェント別パフォーマンスを取得
	agentPerformance, err := u.repo.GetAgentPerformanceStats(ctx, userID, timeRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get agent performance: %w", err)
	}

	// ツール使用統計を取得
	toolUsageStats, err := u.repo.GetToolUsageStats(ctx, userID, timeRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get tool usage stats: %w", err)
	}

	// サービス連携統計を取得（期間フィルターなし）
	serviceStats, err := u.repo.GetServiceStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get service stats: %w", err)
	}

	return &analytics.UserAnalytics{
		TokenStats:       tokenStats,
		ActivityStats:    activityStats,
		AgentPerformance: agentPerformance,
		ToolUsageStats:   toolUsageStats,
		ServiceStats:     serviceStats,
	}, nil
}
