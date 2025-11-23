package billing

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

// TokenUsage トークン使用量エンティティ
type TokenUsage struct {
	ID                uuid.UUID
	UserID            uuid.UUID
	PeriodStart       time.Time
	PeriodEnd         time.Time
	TokensPrompt      int64
	TokensCompletion  int64
	TokensTotal       int64
	CostUSD           float64
	RequestCount      int
	ProviderBreakdown map[string]ProviderUsage
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// ProviderUsage プロバイダー別の使用量
type ProviderUsage struct {
	Tokens int64   `json:"tokens"`
	Cost   float64 `json:"cost"`
}

// NewTokenUsage 新しいトークン使用量レコードを作成
func NewTokenUsage(userID uuid.UUID, periodStart, periodEnd time.Time) (*TokenUsage, error) {
	if periodEnd.Before(periodStart) || periodEnd.Equal(periodStart) {
		return nil, errors.New("period_end must be after period_start")
	}

	now := time.Now()
	return &TokenUsage{
		ID:                uuid.New(),
		UserID:            userID,
		PeriodStart:       periodStart,
		PeriodEnd:         periodEnd,
		TokensPrompt:      0,
		TokensCompletion:  0,
		TokensTotal:       0,
		CostUSD:           0,
		RequestCount:      0,
		ProviderBreakdown: make(map[string]ProviderUsage),
		CreatedAt:         now,
		UpdatedAt:         now,
	}, nil
}

// AddUsage トークン使用量を加算
func (tu *TokenUsage) AddUsage(provider string, promptTokens, completionTokens int64, cost float64) error {
	if promptTokens < 0 || completionTokens < 0 || cost < 0 {
		return errors.New("tokens and cost must be non-negative")
	}

	// 全体の使用量を更新
	tu.TokensPrompt += promptTokens
	tu.TokensCompletion += completionTokens
	tu.TokensTotal += (promptTokens + completionTokens)
	tu.CostUSD += cost
	tu.RequestCount++
	tu.UpdatedAt = time.Now()

	// プロバイダー別の内訳を更新
	if existing, ok := tu.ProviderBreakdown[provider]; ok {
		existing.Tokens += (promptTokens + completionTokens)
		existing.Cost += cost
		tu.ProviderBreakdown[provider] = existing
	} else {
		tu.ProviderBreakdown[provider] = ProviderUsage{
			Tokens: promptTokens + completionTokens,
			Cost:   cost,
		}
	}

	return nil
}

// GetRemainingTokens 残りトークン数を計算
func (tu *TokenUsage) GetRemainingTokens(limit int64) int64 {
	if limit == 0 {
		return -1 // 無制限
	}

	remaining := limit - tu.TokensTotal
	if remaining < 0 {
		return 0
	}

	return remaining
}

// GetOverageTokens 超過トークン数を計算
func (tu *TokenUsage) GetOverageTokens(limit int64) int64 {
	if limit == 0 {
		return 0 // 無制限なので超過なし
	}

	overage := tu.TokensTotal - limit
	if overage < 0 {
		return 0
	}

	return overage
}

// IsWithinLimit 制限内かどうかを判定
func (tu *TokenUsage) IsWithinLimit(limit int64) bool {
	if limit == 0 {
		return true // 無制限
	}

	return tu.TokensTotal <= limit
}

// GetRemainingBudget 残り予算を計算
func (tu *TokenUsage) GetRemainingBudget(budgetLimit float64) float64 {
	remaining := budgetLimit - tu.CostUSD
	if remaining < 0 {
		return 0
	}
	return remaining
}

// IsWithinBudget 予算内かどうかを判定
func (tu *TokenUsage) IsWithinBudget(budgetLimit float64) bool {
	return tu.CostUSD <= budgetLimit
}

// MarshallProviderBreakdown プロバイダー内訳をJSON文字列に変換
func (tu *TokenUsage) MarshallProviderBreakdown() (string, error) {
	if tu.ProviderBreakdown == nil {
		return "{}", nil
	}

	bytes, err := json.Marshal(tu.ProviderBreakdown)
	if err != nil {
		return "", err
	}

	return string(bytes), nil
}

// UnmarshallProviderBreakdown JSON文字列からプロバイダー内訳を復元
func (tu *TokenUsage) UnmarshallProviderBreakdown(jsonStr string) error {
	if jsonStr == "" || jsonStr == "{}" {
		tu.ProviderBreakdown = make(map[string]ProviderUsage)
		return nil
	}

	var breakdown map[string]ProviderUsage
	if err := json.Unmarshal([]byte(jsonStr), &breakdown); err != nil {
		return err
	}

	tu.ProviderBreakdown = breakdown
	return nil
}

// Validate トークン使用量を検証
func (tu *TokenUsage) Validate() error {
	if tu.PeriodEnd.Before(tu.PeriodStart) || tu.PeriodEnd.Equal(tu.PeriodStart) {
		return errors.New("period_end must be after period_start")
	}

	if tu.TokensPrompt < 0 || tu.TokensCompletion < 0 || tu.TokensTotal < 0 {
		return errors.New("token counts must be non-negative")
	}

	if tu.CostUSD < 0 {
		return errors.New("cost must be non-negative")
	}

	if tu.RequestCount < 0 {
		return errors.New("request count must be non-negative")
	}

	return nil
}
