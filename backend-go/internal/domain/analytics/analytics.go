package analytics

import (
	"time"

	"github.com/google/uuid"
)

// TimeRange 期間フィルター
type TimeRange string

const (
	TimeRangeToday TimeRange = "today"
	TimeRangeWeek  TimeRange = "week"
	TimeRangeMonth TimeRange = "month"
	TimeRangeAll   TimeRange = "all"
)

// ParseTimeRange 文字列からTimeRangeをパース
func ParseTimeRange(s string) TimeRange {
	switch s {
	case "today":
		return TimeRangeToday
	case "week":
		return TimeRangeWeek
	case "month":
		return TimeRangeMonth
	case "all":
		return TimeRangeAll
	default:
		return TimeRangeAll
	}
}

// GetStartTime TimeRangeから開始時刻を取得（日本時間基準でUTCに変換）
func (tr TimeRange) GetStartTime() *time.Time {
	// 日本時間（JST = UTC+9）
	jst := time.FixedZone("Asia/Tokyo", 9*60*60)
	now := time.Now().In(jst)
	var startTime time.Time

	switch tr {
	case TimeRangeToday:
		// 今日の0時（日本時間）をUTCに変換
		startTime = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jst).UTC()
	case TimeRangeWeek:
		// 7日前の0時（日本時間）をUTCに変換
		startTime = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jst).AddDate(0, 0, -7).UTC()
	case TimeRangeMonth:
		// 30日前の0時（日本時間）をUTCに変換
		startTime = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jst).AddDate(0, 0, -30).UTC()
	case TimeRangeAll:
		// 全期間（nilを返す）
		return nil
	default:
		return nil
	}

	return &startTime
}

// UserAnalytics ユーザー全体の統計データ
type UserAnalytics struct {
	TokenStats       *TokenStats         `json:"token_stats"`
	ActivityStats    *ActivityStats      `json:"activity_stats"`
	AgentPerformance []*AgentPerformance `json:"agent_performance"`
	ToolUsageStats   *ToolUsageStats     `json:"tool_usage_stats"`
	ServiceStats     *ServiceStats       `json:"service_stats"`
}

// TokenStats トークン使用量とコスト統計
type TokenStats struct {
	TotalTokens      int64               `json:"total_tokens"`
	PromptTokens     int64               `json:"prompt_tokens"`
	CompletionTokens int64               `json:"completion_tokens"`
	EstimatedCostUSD float64             `json:"estimated_cost_usd"`
	EstimatedCostJPY float64             `json:"estimated_cost_jpy"`
	ByProvider       []*TokensByProvider `json:"by_provider"`
	ByModel          []*TokensByModel    `json:"by_model"`
}

// TokensByProvider プロバイダー別のトークン使用量
type TokensByProvider struct {
	Provider         string  `json:"provider"`
	TotalTokens      int64   `json:"total_tokens"`
	EstimatedCostUSD float64 `json:"estimated_cost_usd"`
}

// TokensByModel モデル別のトークン使用量
type TokensByModel struct {
	Provider         string  `json:"provider"`
	Model            string  `json:"model"`
	TotalTokens      int64   `json:"total_tokens"`
	PromptTokens     int64   `json:"prompt_tokens"`
	CompletionTokens int64   `json:"completion_tokens"`
	EstimatedCostUSD float64 `json:"estimated_cost_usd"`
}

// ActivityStats メッセージ/会話の活動量統計
type ActivityStats struct {
	TotalMessages       int64                 `json:"total_messages"`
	UserMessages        int64                 `json:"user_messages"`
	AIMessages          int64                 `json:"ai_messages"`
	TotalConversations  int64                 `json:"total_conversations"`
	ActiveConversations int64                 `json:"active_conversations"`
	DailyActivity       []*DailyActivityPoint `json:"daily_activity"`
	AverageResponseTime float64               `json:"average_response_time_ms"` // ミリ秒
}

// DailyActivityPoint 日別の活動量
type DailyActivityPoint struct {
	Date         string `json:"date"` // YYYY-MM-DD形式
	MessageCount int64  `json:"message_count"`
	UserMessages int64  `json:"user_messages"`
	AIMessages   int64  `json:"ai_messages"`
}

// AgentPerformance AIエージェント別のパフォーマンス
type AgentPerformance struct {
	AgentID             uuid.UUID `json:"agent_id"`
	AgentName           string    `json:"agent_name"`
	MessageCount        int64     `json:"message_count"`
	TotalTokens         int64     `json:"total_tokens"`
	AverageResponseTime float64   `json:"average_response_time_ms"` // ミリ秒
	ToolsUsed           int64     `json:"tools_used"`
}

// ToolUsageStats ツール使用統計
type ToolUsageStats struct {
	TotalToolCalls  int64              `json:"total_tool_calls"`
	SuccessfulCalls int64              `json:"successful_calls"`
	FailedCalls     int64              `json:"failed_calls"`
	SuccessRate     float64            `json:"success_rate"` // パーセント
	ByCategory      []*ToolsByCategory `json:"by_category"`
	ByTool          []*ToolStats       `json:"by_tool"`
}

// ToolsByCategory カテゴリ別のツール使用統計
type ToolsByCategory struct {
	Category    string  `json:"category"`
	CallCount   int64   `json:"call_count"`
	SuccessRate float64 `json:"success_rate"` // パーセント
}

// ToolStats ツール別の使用統計
type ToolStats struct {
	ToolName             string  `json:"tool_name"`
	Category             string  `json:"category"`
	CallCount            int64   `json:"call_count"`
	SuccessCount         int64   `json:"success_count"`
	FailureCount         int64   `json:"failure_count"`
	SuccessRate          float64 `json:"success_rate"`              // パーセント
	AverageExecutionTime float64 `json:"average_execution_time_ms"` // ミリ秒
}

// ServiceStats サービス連携統計
type ServiceStats struct {
	TotalServices    int64                `json:"total_services"`
	EnabledServices  int64                `json:"enabled_services"`
	DisabledServices int64                `json:"disabled_services"`
	ByService        []*ServiceUsageStats `json:"by_service"`
}

// ServiceUsageStats サービス別の使用統計
type ServiceUsageStats struct {
	ServiceClass string `json:"service_class"`
	IsEnabled    bool   `json:"is_enabled"`
	AgentCount   int64  `json:"agent_count"` // このサービスを利用しているエージェント数
}
