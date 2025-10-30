package analytics

// ModelPricing LLMモデルの料金情報（1Mトークンあたりの USD コスト）
type ModelPricing struct {
	PromptCostPer1M     float64 // プロンプトトークンの料金（USD/1M tokens）
	CompletionCostPer1M float64 // 補完トークンの料金（USD/1M tokens）
}

// PricingTable モデル別の料金テーブル（2025年10月時点）
var PricingTable = map[string]map[string]ModelPricing{
	"openai": {
		"gpt-4o": {
			PromptCostPer1M:     2.50,
			CompletionCostPer1M: 10.00,
		},
		"gpt-4o-mini": {
			PromptCostPer1M:     0.15,
			CompletionCostPer1M: 0.60,
		},
		"gpt-4-turbo": {
			PromptCostPer1M:     10.00,
			CompletionCostPer1M: 30.00,
		},
		"gpt-4": {
			PromptCostPer1M:     30.00,
			CompletionCostPer1M: 60.00,
		},
		"gpt-3.5-turbo": {
			PromptCostPer1M:     0.50,
			CompletionCostPer1M: 1.50,
		},
	},
	"anthropic": {
		"claude-3-5-sonnet-20241022": {
			PromptCostPer1M:     3.00,
			CompletionCostPer1M: 15.00,
		},
		"claude-3.5-sonnet": {
			PromptCostPer1M:     3.00,
			CompletionCostPer1M: 15.00,
		},
		"claude-3-opus-20240229": {
			PromptCostPer1M:     15.00,
			CompletionCostPer1M: 75.00,
		},
		"claude-3-sonnet-20240229": {
			PromptCostPer1M:     3.00,
			CompletionCostPer1M: 15.00,
		},
		"claude-3-haiku-20240307": {
			PromptCostPer1M:     0.25,
			CompletionCostPer1M: 1.25,
		},
	},
	"google": {
		"gemini-pro": {
			PromptCostPer1M:     0.50,
			CompletionCostPer1M: 1.50,
		},
		"gemini-1.5-pro": {
			PromptCostPer1M:     1.25,
			CompletionCostPer1M: 5.00,
		},
		"gemini-1.5-flash": {
			PromptCostPer1M:     0.075,
			CompletionCostPer1M: 0.30,
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
