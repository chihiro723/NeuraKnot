package billing

import (
	"testing"
)

// SubscriptionTier値オブジェクトの仕様
// ============================================
// 【目的】
// - ユーザーのサブスクリプションプランを表す
// - プランごとの制限値（予算、エージェント数など）を管理
//
// 【定義済みティア】
// 1. "free" (TierFree): 無料プラン
//    - 月間予算: $0.33（約50円）
//    - AI Agent: 3体まで
//    - グループチャット: 1つまで
//    - 月額: 無料
//
// 2. "pro" (TierPro): Proプラン
//    - 月間予算: $3.33（約500円）
//    - AI Agent: 20体まで
//    - グループチャット: 10個まで
//    - 月額: 980円（$6.5）
//
// 3. "max" (TierMax): Maxプラン
//    - 月間予算: $13.33（約2000円）
//    - AI Agent: 無制限（0）
//    - グループチャット: 無制限（0）
//    - 月額: 2,980円（$19.9）
//
// 【制限値の意味】
// - MonthlyBudgetUSD: 月間のLLM API使用予算（USD）
// - MaxAIAgents: 作成可能なAIエージェント数（0=無制限）
// - MaxGroupChats: 作成可能なグループチャット数（0=無制限）
// - StripePriceID: Stripe決済用のPrice ID
//
// 【使用箇所】
// - ユーザー登録時（デフォルト: free）
// - サブスクリプションアップグレード/ダウングレード
// - 制限チェック（エージェント作成時、API使用時）
// - Stripe決済処理
// ============================================

func TestSubscriptionTierIsValid(t *testing.T) {
	tests := []struct {
		name string
		tier SubscriptionTier
		want bool
	}{
		{
			name: "Free is valid",
			tier: TierFree,
			want: true,
		},
		{
			name: "Pro is valid",
			tier: TierPro,
			want: true,
		},
		{
			name: "Max is valid",
			tier: TierMax,
			want: true,
		},
		{
			name: "Unknown tier is invalid",
			tier: SubscriptionTier("unknown"),
			want: false,
		},
		{
			name: "Empty string is invalid",
			tier: SubscriptionTier(""),
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.tier.IsValid(); got != tt.want {
				t.Errorf("IsValid() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSubscriptionTierString(t *testing.T) {
	tests := []struct {
		name string
		tier SubscriptionTier
		want string
	}{
		{
			name: "Free to string",
			tier: TierFree,
			want: "free",
		},
		{
			name: "Pro to string",
			tier: TierPro,
			want: "pro",
		},
		{
			name: "Max to string",
			tier: TierMax,
			want: "max",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.tier.String(); got != tt.want {
				t.Errorf("String() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestSubscriptionTierEquals(t *testing.T) {
	tests := []struct {
		name  string
		tier1 SubscriptionTier
		tier2 SubscriptionTier
		want  bool
	}{
		{
			name:  "Same free tier",
			tier1: TierFree,
			tier2: TierFree,
			want:  true,
		},
		{
			name:  "Different tiers",
			tier1: TierFree,
			tier2: TierPro,
			want:  false,
		},
		{
			name:  "Pro vs Max",
			tier1: TierPro,
			tier2: TierMax,
			want:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.tier1.Equals(tt.tier2); got != tt.want {
				t.Errorf("Equals() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestParseSubscriptionTier(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    SubscriptionTier
		wantErr bool
	}{
		{
			name:    "Parse free",
			input:   "free",
			want:    TierFree,
			wantErr: false,
		},
		{
			name:    "Parse pro",
			input:   "pro",
			want:    TierPro,
			wantErr: false,
		},
		{
			name:    "Parse max",
			input:   "max",
			want:    TierMax,
			wantErr: false,
		},
		{
			name:    "Parse unknown returns error",
			input:   "unknown",
			want:    "",
			wantErr: true,
		},
		{
			name:    "Parse empty string returns error",
			input:   "",
			want:    "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseSubscriptionTier(tt.input)

			if (err != nil) != tt.wantErr {
				t.Errorf("ParseSubscriptionTier() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if got != tt.want {
				t.Errorf("ParseSubscriptionTier() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetTierLimits(t *testing.T) {
	tests := []struct {
		name    string
		tier    SubscriptionTier
		wantErr bool
	}{
		{
			name:    "Get free tier limits",
			tier:    TierFree,
			wantErr: false,
		},
		{
			name:    "Get pro tier limits",
			tier:    TierPro,
			wantErr: false,
		},
		{
			name:    "Get max tier limits",
			tier:    TierMax,
			wantErr: false,
		},
		{
			name:    "Get invalid tier returns error",
			tier:    SubscriptionTier("invalid"),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			limits, err := GetTierLimits(tt.tier)

			if (err != nil) != tt.wantErr {
				t.Errorf("GetTierLimits() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// ティアが正しいか確認
				if limits.Tier != tt.tier {
					t.Errorf("TierLimits.Tier = %v, want %v", limits.Tier, tt.tier)
				}

				// 制限値が設定されているか確認
				if limits.MonthlyBudgetUSD < 0 {
					t.Errorf("MonthlyBudgetUSD = %f, should be non-negative", limits.MonthlyBudgetUSD)
				}
				if limits.PriceJPY < 0 {
					t.Errorf("PriceJPY = %d, should be non-negative", limits.PriceJPY)
				}
				if limits.PriceUSD < 0 {
					t.Errorf("PriceUSD = %f, should be non-negative", limits.PriceUSD)
				}
			}
		})
	}
}

func TestTierLimitsValues(t *testing.T) {
	// Free Tierの制限値を確認
	t.Run("Free tier limits", func(t *testing.T) {
		if FreeTierLimits.Tier != TierFree {
			t.Errorf("FreeTierLimits.Tier = %v, want %v", FreeTierLimits.Tier, TierFree)
		}
		if FreeTierLimits.MonthlyBudgetUSD != 0.33 {
			t.Errorf("FreeTierLimits.MonthlyBudgetUSD = %f, want 0.33", FreeTierLimits.MonthlyBudgetUSD)
		}
		if FreeTierLimits.PriceJPY != 0 {
			t.Errorf("FreeTierLimits.PriceJPY = %d, want 0", FreeTierLimits.PriceJPY)
		}
		if FreeTierLimits.MaxAIAgents != 3 {
			t.Errorf("FreeTierLimits.MaxAIAgents = %d, want 3", FreeTierLimits.MaxAIAgents)
		}
		if FreeTierLimits.MaxGroupChats != 1 {
			t.Errorf("FreeTierLimits.MaxGroupChats = %d, want 1", FreeTierLimits.MaxGroupChats)
		}
	})

	// Pro Tierの制限値を確認
	t.Run("Pro tier limits", func(t *testing.T) {
		if ProTierLimits.Tier != TierPro {
			t.Errorf("ProTierLimits.Tier = %v, want %v", ProTierLimits.Tier, TierPro)
		}
		if ProTierLimits.MonthlyBudgetUSD != 3.33 {
			t.Errorf("ProTierLimits.MonthlyBudgetUSD = %f, want 3.33", ProTierLimits.MonthlyBudgetUSD)
		}
		if ProTierLimits.PriceJPY != 980 {
			t.Errorf("ProTierLimits.PriceJPY = %d, want 980", ProTierLimits.PriceJPY)
		}
		if ProTierLimits.MaxAIAgents != 20 {
			t.Errorf("ProTierLimits.MaxAIAgents = %d, want 20", ProTierLimits.MaxAIAgents)
		}
		if ProTierLimits.MaxGroupChats != 10 {
			t.Errorf("ProTierLimits.MaxGroupChats = %d, want 10", ProTierLimits.MaxGroupChats)
		}
	})

	// Max Tierの制限値を確認
	t.Run("Max tier limits", func(t *testing.T) {
		if MaxTierLimits.Tier != TierMax {
			t.Errorf("MaxTierLimits.Tier = %v, want %v", MaxTierLimits.Tier, TierMax)
		}
		if MaxTierLimits.MonthlyBudgetUSD != 13.33 {
			t.Errorf("MaxTierLimits.MonthlyBudgetUSD = %f, want 13.33", MaxTierLimits.MonthlyBudgetUSD)
		}
		if MaxTierLimits.PriceJPY != 2980 {
			t.Errorf("MaxTierLimits.PriceJPY = %d, want 2980", MaxTierLimits.PriceJPY)
		}
		// Maxティアは無制限（0）
		if MaxTierLimits.MaxAIAgents != 0 {
			t.Errorf("MaxTierLimits.MaxAIAgents = %d, want 0 (unlimited)", MaxTierLimits.MaxAIAgents)
		}
		if MaxTierLimits.MaxGroupChats != 0 {
			t.Errorf("MaxTierLimits.MaxGroupChats = %d, want 0 (unlimited)", MaxTierLimits.MaxGroupChats)
		}
	})
}

func TestSubscriptionTierConstants(t *testing.T) {
	// 定数が期待される値を持っているか確認
	tests := []struct {
		name     string
		tier     SubscriptionTier
		expected string
	}{
		{
			name:     "TierFree constant",
			tier:     TierFree,
			expected: "free",
		},
		{
			name:     "TierPro constant",
			tier:     TierPro,
			expected: "pro",
		},
		{
			name:     "TierMax constant",
			tier:     TierMax,
			expected: "max",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.tier) != tt.expected {
				t.Errorf("Constant value = %q, want %q", string(tt.tier), tt.expected)
			}
		})
	}
}
