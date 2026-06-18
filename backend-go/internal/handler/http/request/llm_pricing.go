package request

import "time"

// CreateLLMPricingRequest は初回単価登録のリクエスト
type CreateLLMPricingRequest struct {
	Provider            string   `json:"provider" binding:"required"`
	Model               string   `json:"model" binding:"required"`
	PromptCostPer1M     *float64 `json:"prompt_cost_per_1m" binding:"required"`
	CompletionCostPer1M *float64 `json:"completion_cost_per_1m" binding:"required"`
	Notes               string   `json:"notes,omitempty"`
}

// ReviseLLMPricingRequest は単価改定のリクエスト
type ReviseLLMPricingRequest struct {
	PromptCostPer1M     *float64   `json:"prompt_cost_per_1m" binding:"required"`
	CompletionCostPer1M *float64   `json:"completion_cost_per_1m" binding:"required"`
	EffectiveFrom       *time.Time `json:"effective_from,omitempty"`
	Notes               string     `json:"notes,omitempty"`
}
