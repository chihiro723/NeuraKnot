package billing

import (
	"errors"
	"fmt"
)

// SubscriptionTier サブスクリプションティア
type SubscriptionTier string

const (
	TierFree SubscriptionTier = "free"
	TierPro  SubscriptionTier = "pro"
	TierMax  SubscriptionTier = "max"
)

// String ティアを文字列に変換
func (t SubscriptionTier) String() string {
	return string(t)
}

// IsValid 有効なティアかどうかを検証
func (t SubscriptionTier) IsValid() bool {
	switch t {
	case TierFree, TierPro, TierMax:
		return true
	default:
		return false
	}
}

// Equals 同じティアかどうかを比較
func (t SubscriptionTier) Equals(other SubscriptionTier) bool {
	return t == other
}

// ParseSubscriptionTier 文字列からティアを解析
func ParseSubscriptionTier(s string) (SubscriptionTier, error) {
	tier := SubscriptionTier(s)
	if !tier.IsValid() {
		return "", fmt.Errorf("invalid subscription tier: %s", s)
	}
	return tier, nil
}

// TierLimits ティアごとの制限値
type TierLimits struct {
	Tier             SubscriptionTier
	MonthlyBudgetUSD float64 // 実制限：月間利用可能予算（USD）
	PriceJPY         int64   // 月額料金（円）
	PriceUSD         float64 // 月額料金（ドル）
	StripePriceID    string  // Stripe Price ID
	MaxAIAgents      int     // 作成可能なAIエージェント数（0=無制限）
	MaxGroupChats    int     // 作成可能なグループチャット数（0=無制限）
}

var (
	// FreeTierLimits Freeティアの制限
	FreeTierLimits = TierLimits{
		Tier:             TierFree,
		MonthlyBudgetUSD: 0.33, // 予算：$0.33（約50円）
		PriceJPY:         0,    // 無料
		PriceUSD:         0,    // 無料
		StripePriceID:    "",   // Stripe Price IDなし
		MaxAIAgents:      3,    // 3体まで
		MaxGroupChats:    1,    // 1つまで
	}

	// ProTierLimits Proティアの制限
	ProTierLimits = TierLimits{
		Tier:             TierPro,
		MonthlyBudgetUSD: 3.33,        // 予算：$3.33（約500円）
		PriceJPY:         980,         // 980円/月
		PriceUSD:         6.5,         // $6.5/月
		StripePriceID:    "price_pro", // Stripe Price ID
		MaxAIAgents:      20,          // 20体まで
		MaxGroupChats:    10,          // 10個まで
	}

	// MaxTierLimits Maxティアの制限
	MaxTierLimits = TierLimits{
		Tier:             TierMax,
		MonthlyBudgetUSD: 13.33,       // 予算：$13.33（約2000円）
		PriceJPY:         2_980,       // 2,980円/月
		PriceUSD:         19.9,        // $19.9/月
		StripePriceID:    "price_max", // Stripe Price ID
		MaxAIAgents:      0,           // 無制限
		MaxGroupChats:    0,           // 無制限
	}
)

// GetTierLimits ティアの制限値を取得
func GetTierLimits(tier SubscriptionTier) (TierLimits, error) {
	switch tier {
	case TierFree:
		return FreeTierLimits, nil
	case TierPro:
		return ProTierLimits, nil
	case TierMax:
		return MaxTierLimits, nil
	default:
		return TierLimits{}, errors.New("invalid subscription tier")
	}
}
