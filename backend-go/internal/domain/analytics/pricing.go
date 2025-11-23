package analytics

import (
	"context"

	"backend-go/internal/domain/billing"
)

// ModelPricing LLMモデルの料金情報（1Mトークンあたりの USD コスト）
// Deprecated: DBから取得するため、この構造体は互換性のために残されています
type ModelPricing struct {
	PromptCostPer1M     float64 // プロンプトトークンの料金（USD/1M tokens）
	CompletionCostPer1M float64 // 補完トークンの料金（USD/1M tokens）
}

// PricingService LLM料金計算サービス
type PricingService struct {
	pricingRepo billing.LLMPricingRepository
}

// NewPricingService 料金計算サービスを作成
func NewPricingService(pricingRepo billing.LLMPricingRepository) *PricingService {
	return &PricingService{
		pricingRepo: pricingRepo,
	}
}

// GetModelPricing モデルの料金情報を取得（DBから）
func (s *PricingService) GetModelPricing(ctx context.Context, provider, model string) (ModelPricing, bool) {
	// 現在時刻で有効な料金を取得
	pricing, err := s.pricingRepo.FindByProviderAndModel(ctx, provider, model)
	if err != nil {
		return ModelPricing{}, false
	}

	if pricing == nil || !pricing.IsActive {
		return ModelPricing{}, false
	}

	return ModelPricing{
		PromptCostPer1M:     pricing.PromptCostPer1M,
		CompletionCostPer1M: pricing.CompletionCostPer1M,
	}, true
}

// CalculateCost トークン使用量からコストを計算（USD）
func (s *PricingService) CalculateCost(ctx context.Context, provider, model string, promptTokens, completionTokens int64) float64 {
	pricing, ok := s.GetModelPricing(ctx, provider, model)
	if !ok {
		// 料金情報がない場合は0を返す
		return 0.0
	}

	// 1Mトークンあたりの料金なので、トークン数を100万で割る
	promptCost := float64(promptTokens) / 1000000.0 * pricing.PromptCostPer1M
	completionCost := float64(completionTokens) / 1000000.0 * pricing.CompletionCostPer1M

	return promptCost + completionCost
}

// ConvertUSDToJPY USDをJPYに変換（固定レート: 1 USD = 150 JPY）
func ConvertUSDToJPY(usd float64) float64 {
	const exchangeRate = 150.0
	return usd * exchangeRate
}

// Deprecated functions for backward compatibility
// 以下の関数は後方互換性のために残されていますが、PricingServiceの使用を推奨します

// GetModelPricing モデルの料金情報を取得
// Deprecated: PricingService.GetModelPricing を使用してください
func GetModelPricing(provider, model string) (ModelPricing, bool) {
	// フォールバック用の最小限の料金テーブル
	// 実際の料金はDBから取得することを推奨
	fallbackTable := map[string]map[string]ModelPricing{
		"openai": {
			"gpt-4o":      {PromptCostPer1M: 2.50, CompletionCostPer1M: 10.00},
			"gpt-4o-mini": {PromptCostPer1M: 0.15, CompletionCostPer1M: 0.60},
		},
		"anthropic": {
			"claude-3-5-sonnet-20241022": {PromptCostPer1M: 3.00, CompletionCostPer1M: 15.00},
		},
		"google": {
			"gemini-1.5-pro":   {PromptCostPer1M: 3.50, CompletionCostPer1M: 10.50},
			"gemini-1.5-flash": {PromptCostPer1M: 0.075, CompletionCostPer1M: 0.30},
		},
	}

	providerPricing, ok := fallbackTable[provider]
	if !ok {
		return ModelPricing{}, false
	}

	pricing, ok := providerPricing[model]
	return pricing, ok
}

// CalculateCost トークン使用量からコストを計算（USD）
// Deprecated: PricingService.CalculateCost を使用してください
func CalculateCost(provider, model string, promptTokens, completionTokens int64) float64 {
	pricing, ok := GetModelPricing(provider, model)
	if !ok {
		return 0.0
	}

	promptCost := float64(promptTokens) / 1000000.0 * pricing.PromptCostPer1M
	completionCost := float64(completionTokens) / 1000000.0 * pricing.CompletionCostPer1M

	return promptCost + completionCost
}
