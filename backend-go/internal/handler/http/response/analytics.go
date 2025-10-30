package response

import (
	"backend-go/internal/domain/analytics"
)

// AnalyticsResponse 統計データのレスポンス
type AnalyticsResponse struct {
	TokenStats       *TokenStatsResponse         `json:"token_stats"`
	ActivityStats    *ActivityStatsResponse      `json:"activity_stats"`
	AgentPerformance []*AgentPerformanceResponse `json:"agent_performance"`
	ToolUsageStats   *ToolUsageStatsResponse     `json:"tool_usage_stats"`
	ServiceStats     *ServiceStatsResponse       `json:"service_stats"`
}

// TokenStatsResponse トークン統計のレスポンス
type TokenStatsResponse struct {
	TotalTokens      int64                       `json:"total_tokens"`
	PromptTokens     int64                       `json:"prompt_tokens"`
	CompletionTokens int64                       `json:"completion_tokens"`
	EstimatedCostUSD float64                     `json:"estimated_cost_usd"`
	EstimatedCostJPY float64                     `json:"estimated_cost_jpy"`
	ByProvider       []*TokensByProviderResponse `json:"by_provider"`
	ByModel          []*TokensByModelResponse    `json:"by_model"`
}

// TokensByProviderResponse プロバイダー別トークン統計
type TokensByProviderResponse struct {
	Provider         string  `json:"provider"`
	TotalTokens      int64   `json:"total_tokens"`
	EstimatedCostUSD float64 `json:"estimated_cost_usd"`
}

// TokensByModelResponse モデル別トークン統計
type TokensByModelResponse struct {
	Provider         string  `json:"provider"`
	Model            string  `json:"model"`
	TotalTokens      int64   `json:"total_tokens"`
	PromptTokens     int64   `json:"prompt_tokens"`
	CompletionTokens int64   `json:"completion_tokens"`
	EstimatedCostUSD float64 `json:"estimated_cost_usd"`
}

// ActivityStatsResponse 活動量統計のレスポンス
type ActivityStatsResponse struct {
	TotalMessages       int64                         `json:"total_messages"`
	UserMessages        int64                         `json:"user_messages"`
	AIMessages          int64                         `json:"ai_messages"`
	TotalConversations  int64                         `json:"total_conversations"`
	ActiveConversations int64                         `json:"active_conversations"`
	DailyActivity       []*DailyActivityPointResponse `json:"daily_activity"`
	AverageResponseTime float64                       `json:"average_response_time_ms"`
}

// DailyActivityPointResponse 日別活動量
type DailyActivityPointResponse struct {
	Date         string `json:"date"`
	MessageCount int64  `json:"message_count"`
	UserMessages int64  `json:"user_messages"`
	AIMessages   int64  `json:"ai_messages"`
}

// AgentPerformanceResponse エージェント別パフォーマンス
type AgentPerformanceResponse struct {
	AgentID             string  `json:"agent_id"`
	AgentName           string  `json:"agent_name"`
	MessageCount        int64   `json:"message_count"`
	TotalTokens         int64   `json:"total_tokens"`
	AverageResponseTime float64 `json:"average_response_time_ms"`
	ToolsUsed           int64   `json:"tools_used"`
}

// ToolUsageStatsResponse ツール使用統計のレスポンス
type ToolUsageStatsResponse struct {
	TotalToolCalls  int64                      `json:"total_tool_calls"`
	SuccessfulCalls int64                      `json:"successful_calls"`
	FailedCalls     int64                      `json:"failed_calls"`
	SuccessRate     float64                    `json:"success_rate"`
	ByCategory      []*ToolsByCategoryResponse `json:"by_category"`
	ByTool          []*ToolStatsResponse       `json:"by_tool"`
}

// ToolsByCategoryResponse カテゴリ別ツール使用統計
type ToolsByCategoryResponse struct {
	Category    string  `json:"category"`
	CallCount   int64   `json:"call_count"`
	SuccessRate float64 `json:"success_rate"`
}

// ToolStatsResponse ツール別使用統計
type ToolStatsResponse struct {
	ToolName             string  `json:"tool_name"`
	Category             string  `json:"category"`
	CallCount            int64   `json:"call_count"`
	SuccessCount         int64   `json:"success_count"`
	FailureCount         int64   `json:"failure_count"`
	SuccessRate          float64 `json:"success_rate"`
	AverageExecutionTime float64 `json:"average_execution_time_ms"`
}

// ServiceStatsResponse サービス連携統計のレスポンス
type ServiceStatsResponse struct {
	TotalServices    int64                        `json:"total_services"`
	EnabledServices  int64                        `json:"enabled_services"`
	DisabledServices int64                        `json:"disabled_services"`
	ByService        []*ServiceUsageStatsResponse `json:"by_service"`
}

// ServiceUsageStatsResponse サービス別使用統計
type ServiceUsageStatsResponse struct {
	ServiceClass string `json:"service_class"`
	IsEnabled    bool   `json:"is_enabled"`
	AgentCount   int64  `json:"agent_count"`
}

// ToAnalyticsResponse ドメインモデルからレスポンスに変換
func ToAnalyticsResponse(data *analytics.UserAnalytics) *AnalyticsResponse {
	return &AnalyticsResponse{
		TokenStats:       toTokenStatsResponse(data.TokenStats),
		ActivityStats:    toActivityStatsResponse(data.ActivityStats),
		AgentPerformance: toAgentPerformanceResponses(data.AgentPerformance),
		ToolUsageStats:   toToolUsageStatsResponse(data.ToolUsageStats),
		ServiceStats:     toServiceStatsResponse(data.ServiceStats),
	}
}

func toTokenStatsResponse(stats *analytics.TokenStats) *TokenStatsResponse {
	if stats == nil {
		return nil
	}

	byProvider := make([]*TokensByProviderResponse, len(stats.ByProvider))
	for i, p := range stats.ByProvider {
		byProvider[i] = &TokensByProviderResponse{
			Provider:         p.Provider,
			TotalTokens:      p.TotalTokens,
			EstimatedCostUSD: p.EstimatedCostUSD,
		}
	}

	byModel := make([]*TokensByModelResponse, len(stats.ByModel))
	for i, m := range stats.ByModel {
		byModel[i] = &TokensByModelResponse{
			Provider:         m.Provider,
			Model:            m.Model,
			TotalTokens:      m.TotalTokens,
			PromptTokens:     m.PromptTokens,
			CompletionTokens: m.CompletionTokens,
			EstimatedCostUSD: m.EstimatedCostUSD,
		}
	}

	return &TokenStatsResponse{
		TotalTokens:      stats.TotalTokens,
		PromptTokens:     stats.PromptTokens,
		CompletionTokens: stats.CompletionTokens,
		EstimatedCostUSD: stats.EstimatedCostUSD,
		EstimatedCostJPY: stats.EstimatedCostJPY,
		ByProvider:       byProvider,
		ByModel:          byModel,
	}
}

func toActivityStatsResponse(stats *analytics.ActivityStats) *ActivityStatsResponse {
	if stats == nil {
		return nil
	}

	dailyActivity := make([]*DailyActivityPointResponse, len(stats.DailyActivity))
	for i, d := range stats.DailyActivity {
		dailyActivity[i] = &DailyActivityPointResponse{
			Date:         d.Date,
			MessageCount: d.MessageCount,
			UserMessages: d.UserMessages,
			AIMessages:   d.AIMessages,
		}
	}

	return &ActivityStatsResponse{
		TotalMessages:       stats.TotalMessages,
		UserMessages:        stats.UserMessages,
		AIMessages:          stats.AIMessages,
		TotalConversations:  stats.TotalConversations,
		ActiveConversations: stats.ActiveConversations,
		DailyActivity:       dailyActivity,
		AverageResponseTime: stats.AverageResponseTime,
	}
}

func toAgentPerformanceResponses(performances []*analytics.AgentPerformance) []*AgentPerformanceResponse {
	responses := make([]*AgentPerformanceResponse, len(performances))
	for i, p := range performances {
		responses[i] = &AgentPerformanceResponse{
			AgentID:             p.AgentID.String(),
			AgentName:           p.AgentName,
			MessageCount:        p.MessageCount,
			TotalTokens:         p.TotalTokens,
			AverageResponseTime: p.AverageResponseTime,
			ToolsUsed:           p.ToolsUsed,
		}
	}
	return responses
}

func toToolUsageStatsResponse(stats *analytics.ToolUsageStats) *ToolUsageStatsResponse {
	if stats == nil {
		return nil
	}

	byCategory := make([]*ToolsByCategoryResponse, len(stats.ByCategory))
	for i, c := range stats.ByCategory {
		byCategory[i] = &ToolsByCategoryResponse{
			Category:    c.Category,
			CallCount:   c.CallCount,
			SuccessRate: c.SuccessRate,
		}
	}

	byTool := make([]*ToolStatsResponse, len(stats.ByTool))
	for i, t := range stats.ByTool {
		byTool[i] = &ToolStatsResponse{
			ToolName:             t.ToolName,
			Category:             t.Category,
			CallCount:            t.CallCount,
			SuccessCount:         t.SuccessCount,
			FailureCount:         t.FailureCount,
			SuccessRate:          t.SuccessRate,
			AverageExecutionTime: t.AverageExecutionTime,
		}
	}

	return &ToolUsageStatsResponse{
		TotalToolCalls:  stats.TotalToolCalls,
		SuccessfulCalls: stats.SuccessfulCalls,
		FailedCalls:     stats.FailedCalls,
		SuccessRate:     stats.SuccessRate,
		ByCategory:      byCategory,
		ByTool:          byTool,
	}
}

func toServiceStatsResponse(stats *analytics.ServiceStats) *ServiceStatsResponse {
	if stats == nil {
		return nil
	}

	byService := make([]*ServiceUsageStatsResponse, len(stats.ByService))
	for i, s := range stats.ByService {
		byService[i] = &ServiceUsageStatsResponse{
			ServiceClass: s.ServiceClass,
			IsEnabled:    s.IsEnabled,
			AgentCount:   s.AgentCount,
		}
	}

	return &ServiceStatsResponse{
		TotalServices:    stats.TotalServices,
		EnabledServices:  stats.EnabledServices,
		DisabledServices: stats.DisabledServices,
		ByService:        byService,
	}
}
