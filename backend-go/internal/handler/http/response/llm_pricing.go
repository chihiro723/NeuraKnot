package response

import (
	"time"

	"backend-go/internal/domain/billing"
)

// LLMPricingResponse はLLM単価のレスポンス
type LLMPricingResponse struct {
	ID                  string  `json:"id"`
	Provider            string  `json:"provider"`
	Model               string  `json:"model"`
	PromptCostPer1M     float64 `json:"prompt_cost_per_1m"`
	CompletionCostPer1M float64 `json:"completion_cost_per_1m"`
	EffectiveFrom       string  `json:"effective_from"`
	EffectiveTo         *string `json:"effective_to"`
	IsActive            bool    `json:"is_active"`
	Notes               string  `json:"notes"`
}

// LLMPricingListResponse はLLM単価一覧のレスポンス
type LLMPricingListResponse struct {
	Pricing []*LLMPricingResponse `json:"pricing"`
	Total   int                   `json:"total"`
}

// ToLLMPricingResponse はドメインからレスポンスへ変換
func ToLLMPricingResponse(p *billing.LLMPricing) *LLMPricingResponse {
	if p == nil {
		return nil
	}

	var effectiveTo *string
	if p.EffectiveTo != nil {
		s := p.EffectiveTo.Format(time.RFC3339)
		effectiveTo = &s
	}

	return &LLMPricingResponse{
		ID:                  p.ID.String(),
		Provider:            p.Provider,
		Model:               p.Model,
		PromptCostPer1M:     p.PromptCostPer1M,
		CompletionCostPer1M: p.CompletionCostPer1M,
		EffectiveFrom:       p.EffectiveFrom.Format(time.RFC3339),
		EffectiveTo:         effectiveTo,
		IsActive:            p.IsActive,
		Notes:               p.Notes,
	}
}

// ToLLMPricingListResponse はドメイン配列からレスポンスへ変換
func ToLLMPricingListResponse(pricings []*billing.LLMPricing) *LLMPricingListResponse {
	resp := make([]*LLMPricingResponse, 0, len(pricings))
	for _, p := range pricings {
		resp = append(resp, ToLLMPricingResponse(p))
	}
	return &LLMPricingListResponse{
		Pricing: resp,
		Total:   len(resp),
	}
}
