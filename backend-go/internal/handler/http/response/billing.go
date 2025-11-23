package response

import "time"

// CheckoutSessionResponse Checkout Sessionレスポンス
type CheckoutSessionResponse struct {
	SessionID  string `json:"session_id"`
	SessionURL string `json:"session_url"`
}

// BillingPortalSessionResponse Billing Portal Sessionレスポンス
type BillingPortalSessionResponse struct {
	URL string `json:"url"`
}

// SubscriptionInfo サブスクリプション情報
type SubscriptionInfo struct {
	Tier               string     `json:"tier"`
	Status             string     `json:"status"`
	CurrentPeriodStart *time.Time `json:"current_period_start"`
	CurrentPeriodEnd   *time.Time `json:"current_period_end"`
	CancelAtPeriodEnd  bool       `json:"cancel_at_period_end"`
}

// TokenUsageResponse トークン使用量レスポンス（コストベース）
type TokenUsageResponse struct {
	PeriodStart       time.Time              `json:"period_start"`
	PeriodEnd         time.Time              `json:"period_end"`
	TokensPrompt      int64                  `json:"tokens_prompt"`
	TokensCompletion  int64                  `json:"tokens_completion"`
	TokensTotal       int64                  `json:"tokens_total"`
	CostUSD           float64                `json:"cost_usd"`
	CostJPY           float64                `json:"cost_jpy"`
	RequestCount      int                    `json:"request_count"`
	ProviderBreakdown map[string]interface{} `json:"provider_breakdown"`
	LimitUSD          float64                `json:"limit_usd"`
	RemainingUSD      float64                `json:"remaining_usd"`
	CurrentTier       string                 `json:"current_tier"`
}

// TierLimitsResponse プラン制限情報レスポンス
type TierLimitsResponse struct {
	Tier             string  `json:"tier"`
	MonthlyBudgetUSD float64 `json:"monthly_budget_usd"`
	PriceJPY         int64   `json:"price_jpy"`
	PriceUSD         float64 `json:"price_usd"`
	MaxAIAgents      int     `json:"max_ai_agents"`
	MaxGroupChats    int     `json:"max_group_chats"`
}

// TokenLimitCheckResponse トークン上限チェックレスポンス
type TokenLimitCheckResponse struct {
	CanSend            bool      `json:"can_send"`             // チャット送信可能か
	CurrentTier        string    `json:"current_tier"`         // 現在のプラン
	TokensUsed         int64     `json:"tokens_used"`          // 使用済みトークン数
	CostUSD            float64   `json:"cost_usd"`             // 使用済みコスト (USD)
	BudgetLimitUSD     float64   `json:"budget_limit_usd"`     // 予算上限 (USD)
	RemainingBudgetUSD float64   `json:"remaining_budget_usd"` // 残り予算 (USD)
	UsagePercentage    float64   `json:"usage_percentage"`     // 使用率（%）: コストベース
	PeriodEnd          time.Time `json:"period_end"`           // 課金期間終了日
}
