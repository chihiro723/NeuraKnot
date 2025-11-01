package analytics

// ModelPricing LLMモデルの料金情報（1Mトークンあたりの USD コスト）
type ModelPricing struct {
	PromptCostPer1M     float64 // プロンプトトークンの料金（USD/1M tokens）
	CompletionCostPer1M float64 // 補完トークンの料金（USD/1M tokens）
}

// PricingTable モデル別の料金テーブル（2024年11月時点）
// 価格は各プロバイダーの公式APIドキュメントに基づく
var PricingTable = map[string]map[string]ModelPricing{
	"openai": {
		// GPT-4oシリーズ（実在モデル）
		"gpt-4o": {
			PromptCostPer1M:     2.50,
			CompletionCostPer1M: 10.00,
		},
		"gpt-4o-mini": {
			PromptCostPer1M:     0.15,
			CompletionCostPer1M: 0.60,
		},
		// GPT-4.1シリーズ（将来モデル - GPT-4oベース）
		"gpt-4.1": {
			PromptCostPer1M:     2.50,
			CompletionCostPer1M: 10.00,
		},
		"gpt-4.1-mini": {
			PromptCostPer1M:     0.15,
			CompletionCostPer1M: 0.60,
		},
		"gpt-4.1-nano": {
			PromptCostPer1M:     0.05,
			CompletionCostPer1M: 0.20,
		},
		// o1シリーズ
		"o1-preview": {
			PromptCostPer1M:     15.00,
			CompletionCostPer1M: 60.00,
		},
		"o1-mini": {
			PromptCostPer1M:     3.00,
			CompletionCostPer1M: 12.00,
		},
	},
	"anthropic": {
		// Claude 3.5シリーズ（実在モデル）
		"claude-3-5-sonnet-20241022": {
			PromptCostPer1M:     3.00,
			CompletionCostPer1M: 15.00,
		},
		// Claude 3シリーズ（実在モデル）
		"claude-3-opus-20240229": {
			PromptCostPer1M:     15.00,
			CompletionCostPer1M: 75.00,
		},
		"claude-3-haiku-20240307": {
			PromptCostPer1M:     0.25,
			CompletionCostPer1M: 1.25,
		},
		// Claude 4.xシリーズ（将来モデル - Claude 3.xベース）
		"claude-sonnet-4-5-20250929": {
			PromptCostPer1M:     3.00,
			CompletionCostPer1M: 15.00,
		},
		"claude-haiku-4-5-20251001": {
			PromptCostPer1M:     0.25,
			CompletionCostPer1M: 1.25,
		},
		"claude-opus-4-1-20250805": {
			PromptCostPer1M:     15.00,
			CompletionCostPer1M: 75.00,
		},
	},
	"google": {
		// Gemini 1.5シリーズ（実在モデル）
		"gemini-1.5-pro": {
			PromptCostPer1M:     3.50,
			CompletionCostPer1M: 10.50,
		},
		"gemini-1.5-flash": {
			PromptCostPer1M:     0.075,
			CompletionCostPer1M: 0.30,
		},
		"gemini-1.0-pro": {
			PromptCostPer1M:     0.50,
			CompletionCostPer1M: 1.50,
		},
		// Gemini 2.xシリーズ（将来モデル - Gemini 1.5ベース）
		"gemini-2.5-pro": {
			PromptCostPer1M:     3.50,
			CompletionCostPer1M: 10.50,
		},
		"gemini-2.5-flash": {
			PromptCostPer1M:     0.075,
			CompletionCostPer1M: 0.30,
		},
		"gemini-2.5-flash-lite": {
			PromptCostPer1M:     0.04,
			CompletionCostPer1M: 0.16,
		},
		// Gemini 2.0シリーズ
		"gemini-2.0-flash": {
			PromptCostPer1M:     0.10,
			CompletionCostPer1M: 0.40,
		},
	},
}

// GetModelPricing モデルの料金情報を取得
func GetModelPricing(provider, model string) (ModelPricing, bool) {
	providerPricing, ok := PricingTable[provider]
	if !ok {
		return ModelPricing{}, false
	}

	pricing, ok := providerPricing[model]
	return pricing, ok
}

// CalculateCost トークン使用量からコストを計算（USD）
func CalculateCost(provider, model string, promptTokens, completionTokens int64) float64 {
	pricing, ok := GetModelPricing(provider, model)
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
