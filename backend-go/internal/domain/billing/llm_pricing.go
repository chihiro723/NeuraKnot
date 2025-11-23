package billing

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// LLMPricing LLMモデルの料金情報
type LLMPricing struct {
	ID                    uuid.UUID
	Provider              string
	Model                 string
	PromptCostPer1M       float64
	CompletionCostPer1M   float64
	EffectiveFrom         time.Time
	EffectiveTo           *time.Time
	IsActive              bool
	Notes                 string
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

// NewLLMPricing 新しいLLM料金情報を作成
func NewLLMPricing(
	provider, model string,
	promptCost, completionCost float64,
	effectiveFrom time.Time,
	notes string,
) (*LLMPricing, error) {
	if provider == "" {
		return nil, errors.New("provider is required")
	}

	if model == "" {
		return nil, errors.New("model is required")
	}

	if promptCost < 0 || completionCost < 0 {
		return nil, errors.New("costs must be non-negative")
	}

	now := time.Now()
	return &LLMPricing{
		ID:                  uuid.New(),
		Provider:            provider,
		Model:               model,
		PromptCostPer1M:     promptCost,
		CompletionCostPer1M: completionCost,
		EffectiveFrom:       effectiveFrom,
		EffectiveTo:         nil,
		IsActive:            true,
		Notes:               notes,
		CreatedAt:           now,
		UpdatedAt:           now,
	}, nil
}

// CalculateCost トークン使用量からコストを計算（USD）
func (lp *LLMPricing) CalculateCost(promptTokens, completionTokens int64) float64 {
	if promptTokens < 0 || completionTokens < 0 {
		return 0
	}

	// 1Mトークンあたりの料金なので、トークン数を100万で割る
	promptCost := float64(promptTokens) / 1_000_000.0 * lp.PromptCostPer1M
	completionCost := float64(completionTokens) / 1_000_000.0 * lp.CompletionCostPer1M

	return promptCost + completionCost
}

// Deactivate 料金情報を無効化
func (lp *LLMPricing) Deactivate(effectiveTo time.Time) error {
	if effectiveTo.Before(lp.EffectiveFrom) {
		return errors.New("effective_to must be after effective_from")
	}

	lp.IsActive = false
	lp.EffectiveTo = &effectiveTo
	lp.UpdatedAt = time.Now()

	return nil
}

// IsEffectiveAt 指定日時に有効な料金情報かどうかを判定
func (lp *LLMPricing) IsEffectiveAt(t time.Time) bool {
	if !lp.IsActive {
		return false
	}

	// effective_from <= t
	if t.Before(lp.EffectiveFrom) {
		return false
	}

	// effective_to が設定されている場合、t < effective_to
	if lp.EffectiveTo != nil && !t.Before(*lp.EffectiveTo) {
		return false
	}

	return true
}

// Validate LLM料金情報を検証
func (lp *LLMPricing) Validate() error {
	if lp.Provider == "" {
		return errors.New("provider is required")
	}

	if lp.Model == "" {
		return errors.New("model is required")
	}

	if lp.PromptCostPer1M < 0 {
		return errors.New("prompt cost must be non-negative")
	}

	if lp.CompletionCostPer1M < 0 {
		return errors.New("completion cost must be non-negative")
	}

	if lp.EffectiveTo != nil && lp.EffectiveTo.Before(lp.EffectiveFrom) {
		return errors.New("effective_to must be after effective_from")
	}

	return nil
}
