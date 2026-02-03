package analytics

import (
	"testing"
)

// TestGetModelPricing_Deprecated 既存の非推奨関数のテスト（後方互換性のため）
func TestGetModelPricing_Deprecated(t *testing.T) {
	tests := []struct {
		name     string
		provider string
		model    string
		wantOk   bool
	}{
		{
			name:     "OpenAI GPT-4o",
			provider: "openai",
			model:    "gpt-4o",
			wantOk:   true,
		},
		{
			name:     "OpenAI GPT-4o-mini",
			provider: "openai",
			model:    "gpt-4o-mini",
			wantOk:   true,
		},
		{
			name:     "Anthropic Claude Sonnet",
			provider: "anthropic",
			model:    "claude-3-5-sonnet-20241022",
			wantOk:   true,
		},
		{
			name:     "Google Gemini Pro",
			provider: "google",
			model:    "gemini-1.5-pro",
			wantOk:   true,
		},
		{
			name:     "Google Gemini Flash",
			provider: "google",
			model:    "gemini-1.5-flash",
			wantOk:   true,
		},
		{
			name:     "Unknown provider",
			provider: "unknown",
			model:    "some-model",
			wantOk:   false,
		},
		{
			name:     "Unknown model",
			provider: "openai",
			model:    "unknown-model",
			wantOk:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pricing, ok := GetModelPricing(tt.provider, tt.model)

			if ok != tt.wantOk {
				t.Errorf("GetModelPricing() ok = %v, want %v", ok, tt.wantOk)
				return
			}

			if tt.wantOk {
				// 料金が正の値であることを確認
				if pricing.PromptCostPer1M < 0 {
					t.Errorf("PromptCostPer1M = %f, should be non-negative", pricing.PromptCostPer1M)
				}
				if pricing.CompletionCostPer1M < 0 {
					t.Errorf("CompletionCostPer1M = %f, should be non-negative", pricing.CompletionCostPer1M)
				}
			}
		})
	}
}

// TestCalculateCost_Deprecated 既存の非推奨関数のテスト
func TestCalculateCost_Deprecated(t *testing.T) {
	tests := []struct {
		name             string
		provider         string
		model            string
		promptTokens     int64
		completionTokens int64
		expectNonZero    bool // コストが0でないことを期待するか
	}{
		{
			name:             "GPT-4o - 1M tokens each",
			provider:         "openai",
			model:            "gpt-4o",
			promptTokens:     1_000_000,
			completionTokens: 1_000_000,
			expectNonZero:    true,
		},
		{
			name:             "GPT-4o-mini - 100K tokens each",
			provider:         "openai",
			model:            "gpt-4o-mini",
			promptTokens:     100_000,
			completionTokens: 100_000,
			expectNonZero:    true,
		},
		{
			name:             "Zero tokens",
			provider:         "openai",
			model:            "gpt-4o",
			promptTokens:     0,
			completionTokens: 0,
			expectNonZero:    false,
		},
		{
			name:             "Unknown model - should return 0",
			provider:         "unknown",
			model:            "unknown",
			promptTokens:     1_000_000,
			completionTokens: 1_000_000,
			expectNonZero:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cost := CalculateCost(tt.provider, tt.model, tt.promptTokens, tt.completionTokens)

			if cost < 0 {
				t.Errorf("CalculateCost() = %f, should be non-negative", cost)
			}

			if tt.expectNonZero && cost == 0 {
				t.Errorf("CalculateCost() = 0, expected non-zero for valid model with tokens")
			}

			if !tt.expectNonZero && cost != 0 {
				t.Errorf("CalculateCost() = %f, expected 0", cost)
			}
		})
	}
}

// TestConvertUSDToJPY USD→JPY変換のテスト
func TestConvertUSDToJPY(t *testing.T) {
	tests := []struct {
		name string
		usd  float64
		want float64
	}{
		{
			name: "1 USD = 150 JPY",
			usd:  1.0,
			want: 150.0,
		},
		{
			name: "10 USD = 1500 JPY",
			usd:  10.0,
			want: 1500.0,
		},
		{
			name: "0.5 USD = 75 JPY",
			usd:  0.5,
			want: 75.0,
		},
		{
			name: "Zero USD",
			usd:  0,
			want: 0,
		},
		{
			name: "Small amount (0.01 USD = 1.5 JPY)",
			usd:  0.01,
			want: 1.5,
		},
		{
			name: "Large amount (1000 USD = 150000 JPY)",
			usd:  1000.0,
			want: 150000.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			jpy := ConvertUSDToJPY(tt.usd)

			// 浮動小数点の比較（誤差を考慮）
			const epsilon = 0.0001
			if diff := jpy - tt.want; diff > epsilon || diff < -epsilon {
				t.Errorf("ConvertUSDToJPY(%f) = %f, want %f", tt.usd, jpy, tt.want)
			}
		})
	}
}

// TestModelPricingConsistency 既存の料金データの一貫性をテスト
func TestModelPricingConsistency(t *testing.T) {
	providers := []string{"openai", "anthropic", "google"}

	for _, provider := range providers {
		t.Run(provider, func(t *testing.T) {
			// プロバイダーごとに少なくとも1つのモデルが登録されていることを確認
			foundModel := false

			// 既知のモデルを試す
			testModels := map[string][]string{
				"openai":    {"gpt-4o", "gpt-4o-mini"},
				"anthropic": {"claude-3-5-sonnet-20241022"},
				"google":    {"gemini-1.5-pro", "gemini-1.5-flash"},
			}

			models, ok := testModels[provider]
			if !ok {
				t.Skipf("No test models defined for provider %s", provider)
				return
			}

			for _, model := range models {
				pricing, ok := GetModelPricing(provider, model)
				if ok {
					foundModel = true

					// 料金が妥当な範囲内か確認
					if pricing.PromptCostPer1M < 0 || pricing.PromptCostPer1M > 100 {
						t.Errorf("Model %s/%s: PromptCostPer1M = %f is out of reasonable range [0, 100]",
							provider, model, pricing.PromptCostPer1M)
					}
					if pricing.CompletionCostPer1M < 0 || pricing.CompletionCostPer1M > 200 {
						t.Errorf("Model %s/%s: CompletionCostPer1M = %f is out of reasonable range [0, 200]",
							provider, model, pricing.CompletionCostPer1M)
					}
				}
			}

			if !foundModel {
				t.Errorf("Provider %s has no registered models", provider)
			}
		})
	}
}

// TestCalculateCostAccuracy 計算精度のテスト
func TestCalculateCostAccuracy(t *testing.T) {
	// GPT-4o の料金: $2.50/1M prompt, $10.00/1M completion
	provider := "openai"
	model := "gpt-4o"

	tests := []struct {
		name             string
		promptTokens     int64
		completionTokens int64
		wantMin          float64
		wantMax          float64
	}{
		{
			name:             "1000 prompt + 2000 completion",
			promptTokens:     1000,
			completionTokens: 2000,
			wantMin:          0.022,  // (2.50 * 0.001) + (10.00 * 0.002) = 0.0025 + 0.02
			wantMax:          0.023,
		},
		{
			name:             "500K prompt + 500K completion",
			promptTokens:     500_000,
			completionTokens: 500_000,
			wantMin:          6.24,   // (2.50 * 0.5) + (10.00 * 0.5) = 1.25 + 5.00
			wantMax:          6.26,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cost := CalculateCost(provider, model, tt.promptTokens, tt.completionTokens)

			if cost < tt.wantMin || cost > tt.wantMax {
				t.Errorf("CalculateCost() = %f, want in range [%f, %f]", cost, tt.wantMin, tt.wantMax)
			}
		})
	}
}
