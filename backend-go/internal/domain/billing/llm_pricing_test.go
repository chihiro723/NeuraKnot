package billing

import (
	"testing"
	"time"
)

// LLMPricingエンティティの仕様
// ============================================
// 【目的】
// - LLMモデルの料金情報を管理（課金計算の基盤）
// - プロバイダー・モデルごとの仕入れ単価を保持
//
// 【必須項目】
// 1. Provider (string): プロバイダー名（"openai", "anthropic", "google"など）
// 2. Model (string): モデル名（"gpt-4o", "claude-3-5-sonnet"など）
// 3. PromptCostPer1M (float64): プロンプトトークンの単価（USD/1M tokens）
// 4. CompletionCostPer1M (float64): 補完トークンの単価（USD/1M tokens）
// 5. EffectiveFrom (time.Time): 有効開始日時
//
// 【制約条件】
// - Provider、Modelは空文字不可
// - 料金は0以上（負の値不可）
// - EffectiveToが設定される場合、EffectiveFromより後でなければならない
//
// 【料金計算ロジック】
// - 計算式: (promptTokens / 1,000,000 × PromptCostPer1M) + (completionTokens / 1,000,000 × CompletionCostPer1M)
// - 負のトークン数は0として扱う（エラー回避）
// - 結果はUSD単位
//
// 【有効期間管理】
// - IsActive: 料金が有効かどうか
// - EffectiveFrom: この日時から有効
// - EffectiveTo: この日時まで有効（nilの場合は無期限）
// - IsEffectiveAt(t): 指定日時に有効かを判定
//
// 【料金無効化】
// - Deactivate(effectiveTo): 料金を無効化
// - IsActiveがfalseになり、EffectiveToが設定される
// - EffectiveToはEffectiveFromより後でなければならない
//
// 【使用箇所】
// - ユーザーのトークン使用量から課金額を計算
// - 管理者ダッシュボードでの料金管理
// - 利益率計算（販売単価 - 仕入れ単価）
// ============================================

func TestNewLLMPricing(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name           string
		provider       string
		model          string
		promptCost     float64
		completionCost float64
		effectiveFrom  time.Time
		notes          string
		wantErr        bool
	}{
		{
			name:           "Valid LLM pricing",
			provider:       "openai",
			model:          "gpt-4o",
			promptCost:     2.50,
			completionCost: 10.00,
			effectiveFrom:  now,
			notes:          "Standard pricing",
			wantErr:        false,
		},
		{
			name:           "Valid with zero costs",
			provider:       "google",
			model:          "gemini-free",
			promptCost:     0,
			completionCost: 0,
			effectiveFrom:  now,
			notes:          "Free tier",
			wantErr:        false,
		},
		{
			name:           "Empty provider",
			provider:       "",
			model:          "gpt-4o",
			promptCost:     2.50,
			completionCost: 10.00,
			effectiveFrom:  now,
			notes:          "",
			wantErr:        true,
		},
		{
			name:           "Empty model",
			provider:       "openai",
			model:          "",
			promptCost:     2.50,
			completionCost: 10.00,
			effectiveFrom:  now,
			notes:          "",
			wantErr:        true,
		},
		{
			name:           "Negative prompt cost",
			provider:       "openai",
			model:          "gpt-4o",
			promptCost:     -1.00,
			completionCost: 10.00,
			effectiveFrom:  now,
			notes:          "",
			wantErr:        true,
		},
		{
			name:           "Negative completion cost",
			provider:       "openai",
			model:          "gpt-4o",
			promptCost:     2.50,
			completionCost: -5.00,
			effectiveFrom:  now,
			notes:          "",
			wantErr:        true,
		},
		{
			name:           "Both costs negative",
			provider:       "openai",
			model:          "gpt-4o",
			promptCost:     -2.50,
			completionCost: -10.00,
			effectiveFrom:  now,
			notes:          "",
			wantErr:        true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pricing, err := NewLLMPricing(
				tt.provider,
				tt.model,
				tt.promptCost,
				tt.completionCost,
				tt.effectiveFrom,
				tt.notes,
			)

			// エラーチェック
			if (err != nil) != tt.wantErr {
				t.Errorf("NewLLMPricing() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			// 正常系の検証
			if !tt.wantErr {
				if pricing == nil {
					t.Fatal("Expected non-nil pricing for valid input")
				}

				// デフォルト値の確認
				if !pricing.IsActive {
					t.Error("New pricing should be active by default")
				}
				if pricing.EffectiveTo != nil {
					t.Error("New pricing should not have EffectiveTo set")
				}
				if pricing.Provider != tt.provider {
					t.Errorf("Provider = %q, want %q", pricing.Provider, tt.provider)
				}
				if pricing.Model != tt.model {
					t.Errorf("Model = %q, want %q", pricing.Model, tt.model)
				}
				if pricing.PromptCostPer1M != tt.promptCost {
					t.Errorf("PromptCostPer1M = %f, want %f", pricing.PromptCostPer1M, tt.promptCost)
				}
				if pricing.CompletionCostPer1M != tt.completionCost {
					t.Errorf("CompletionCostPer1M = %f, want %f", pricing.CompletionCostPer1M, tt.completionCost)
				}
			}
		})
	}
}

func TestCalculateCost(t *testing.T) {
	pricing := &LLMPricing{
		Provider:            "openai",
		Model:               "gpt-4o",
		PromptCostPer1M:     2.50,  // $2.50 per 1M tokens
		CompletionCostPer1M: 10.00, // $10.00 per 1M tokens
	}

	tests := []struct {
		name             string
		promptTokens     int64
		completionTokens int64
		wantCost         float64
	}{
		{
			name:             "1M prompt + 1M completion tokens",
			promptTokens:     1_000_000,
			completionTokens: 1_000_000,
			wantCost:         12.50, // 2.50 + 10.00
		},
		{
			name:             "500K prompt + 500K completion tokens",
			promptTokens:     500_000,
			completionTokens: 500_000,
			wantCost:         6.25, // (2.50 * 0.5) + (10.00 * 0.5)
		},
		{
			name:             "100 prompt + 200 completion tokens",
			promptTokens:     100,
			completionTokens: 200,
			wantCost:         0.00225, // (2.50 * 0.0001) + (10.00 * 0.0002)
		},
		{
			name:             "Zero tokens",
			promptTokens:     0,
			completionTokens: 0,
			wantCost:         0,
		},
		{
			name:             "Only prompt tokens",
			promptTokens:     1_000_000,
			completionTokens: 0,
			wantCost:         2.50,
		},
		{
			name:             "Only completion tokens",
			promptTokens:     0,
			completionTokens: 1_000_000,
			wantCost:         10.00,
		},
		{
			name:             "Negative prompt tokens (should return 0)",
			promptTokens:     -1000,
			completionTokens: 1000,
			wantCost:         0,
		},
		{
			name:             "Negative completion tokens (should return 0)",
			promptTokens:     1000,
			completionTokens: -1000,
			wantCost:         0,
		},
		{
			name:             "Both negative (should return 0)",
			promptTokens:     -1000,
			completionTokens: -1000,
			wantCost:         0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cost := pricing.CalculateCost(tt.promptTokens, tt.completionTokens)

			// 浮動小数点の比較（誤差を考慮）
			const epsilon = 0.000001
			if diff := cost - tt.wantCost; diff > epsilon || diff < -epsilon {
				t.Errorf("CalculateCost() = %f, want %f", cost, tt.wantCost)
			}
		})
	}
}

func TestDeactivate(t *testing.T) {
	now := time.Now()
	effectiveFrom := now.Add(-24 * time.Hour) // 1日前から有効

	tests := []struct {
		name        string
		effectiveTo time.Time
		wantErr     bool
	}{
		{
			name:        "Valid deactivation - future date",
			effectiveTo: now.Add(24 * time.Hour),
			wantErr:     false,
		},
		{
			name:        "Valid deactivation - current time",
			effectiveTo: now,
			wantErr:     false,
		},
		{
			name:        "Invalid - effective_to before effective_from",
			effectiveTo: now.Add(-48 * time.Hour), // 2日前（effective_fromより前）
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pricing := &LLMPricing{
				Provider:      "openai",
				Model:         "gpt-4o",
				EffectiveFrom: effectiveFrom,
				IsActive:      true,
			}

			err := pricing.Deactivate(tt.effectiveTo)

			if (err != nil) != tt.wantErr {
				t.Errorf("Deactivate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// 無効化が成功した場合
				if pricing.IsActive {
					t.Error("Pricing should be inactive after Deactivate()")
				}
				if pricing.EffectiveTo == nil {
					t.Error("EffectiveTo should be set after Deactivate()")
				}
				if !pricing.EffectiveTo.Equal(tt.effectiveTo) {
					t.Errorf("EffectiveTo = %v, want %v", pricing.EffectiveTo, tt.effectiveTo)
				}
			}
		})
	}
}

func TestIsEffectiveAt(t *testing.T) {
	now := time.Now()
	effectiveFrom := now.Add(-7 * 24 * time.Hour) // 7日前から有効

	tests := []struct {
		name        string
		isActive    bool
		effectiveTo *time.Time
		checkAt     time.Time
		want        bool
	}{
		{
			name:        "Active and within period (no end date)",
			isActive:    true,
			effectiveTo: nil,
			checkAt:     now,
			want:        true,
		},
		{
			name:        "Active and within period (with end date)",
			isActive:    true,
			effectiveTo: timePtr(now.Add(7 * 24 * time.Hour)),
			checkAt:     now,
			want:        true,
		},
		{
			name:        "Inactive",
			isActive:    false,
			effectiveTo: nil,
			checkAt:     now,
			want:        false,
		},
		{
			name:        "Before effective_from",
			isActive:    true,
			effectiveTo: nil,
			checkAt:     now.Add(-14 * 24 * time.Hour), // 14日前
			want:        false,
		},
		{
			name:        "After effective_to",
			isActive:    true,
			effectiveTo: timePtr(now.Add(-1 * 24 * time.Hour)), // 昨日まで有効
			checkAt:     now,
			want:        false,
		},
		{
			name:        "Exactly at effective_from",
			isActive:    true,
			effectiveTo: nil,
			checkAt:     effectiveFrom,
			want:        true,
		},
		{
			name:        "One second before effective_to",
			isActive:    true,
			effectiveTo: timePtr(now),
			checkAt:     now.Add(-1 * time.Second),
			want:        true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pricing := &LLMPricing{
				Provider:      "openai",
				Model:         "gpt-4o",
				EffectiveFrom: effectiveFrom,
				EffectiveTo:   tt.effectiveTo,
				IsActive:      tt.isActive,
			}

			got := pricing.IsEffectiveAt(tt.checkAt)
			if got != tt.want {
				t.Errorf("IsEffectiveAt() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestValidate(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name    string
		pricing *LLMPricing
		wantErr bool
	}{
		{
			name: "Valid pricing",
			pricing: &LLMPricing{
				Provider:            "openai",
				Model:               "gpt-4o",
				PromptCostPer1M:     2.50,
				CompletionCostPer1M: 10.00,
				EffectiveFrom:       now,
				EffectiveTo:         nil,
			},
			wantErr: false,
		},
		{
			name: "Valid with effective_to",
			pricing: &LLMPricing{
				Provider:            "openai",
				Model:               "gpt-4o",
				PromptCostPer1M:     2.50,
				CompletionCostPer1M: 10.00,
				EffectiveFrom:       now,
				EffectiveTo:         timePtr(now.Add(30 * 24 * time.Hour)),
			},
			wantErr: false,
		},
		{
			name: "Empty provider",
			pricing: &LLMPricing{
				Provider:            "",
				Model:               "gpt-4o",
				PromptCostPer1M:     2.50,
				CompletionCostPer1M: 10.00,
				EffectiveFrom:       now,
			},
			wantErr: true,
		},
		{
			name: "Empty model",
			pricing: &LLMPricing{
				Provider:            "openai",
				Model:               "",
				PromptCostPer1M:     2.50,
				CompletionCostPer1M: 10.00,
				EffectiveFrom:       now,
			},
			wantErr: true,
		},
		{
			name: "Negative prompt cost",
			pricing: &LLMPricing{
				Provider:            "openai",
				Model:               "gpt-4o",
				PromptCostPer1M:     -1.0,
				CompletionCostPer1M: 10.00,
				EffectiveFrom:       now,
			},
			wantErr: true,
		},
		{
			name: "Negative completion cost",
			pricing: &LLMPricing{
				Provider:            "openai",
				Model:               "gpt-4o",
				PromptCostPer1M:     2.50,
				CompletionCostPer1M: -1.0,
				EffectiveFrom:       now,
			},
			wantErr: true,
		},
		{
			name: "effective_to before effective_from",
			pricing: &LLMPricing{
				Provider:            "openai",
				Model:               "gpt-4o",
				PromptCostPer1M:     2.50,
				CompletionCostPer1M: 10.00,
				EffectiveFrom:       now,
				EffectiveTo:         timePtr(now.Add(-24 * time.Hour)),
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.pricing.Validate()

			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// ヘルパー関数
func timePtr(t time.Time) *time.Time {
	return &t
}
