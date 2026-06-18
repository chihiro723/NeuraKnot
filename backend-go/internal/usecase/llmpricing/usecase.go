package llmpricing

import (
	"context"
	"errors"
	"fmt"
	"time"

	"backend-go/internal/domain/billing"
	"backend-go/internal/domain/llmmodel"

	"github.com/google/uuid"
)

var (
	// ErrModelNotRegistered は単価対象のモデルが llm_models に未登録の場合のエラー
	ErrModelNotRegistered = errors.New("llm model is not registered")
	// ErrPricingNotFound は単価が見つからない場合のエラー
	ErrPricingNotFound = errors.New("llm pricing not found")
	// ErrPricingAlreadyExists は初回登録時に既に有効な単価が存在する場合のエラー
	ErrPricingAlreadyExists = errors.New("active llm pricing already exists")
)

// Usecase はLLM単価マスタの管理ユースケース。
//
// 単価は版管理（旧行 close + 新行 insert）で履歴を保持し、過去コストの不変性を担保する。
// アクティブ行の in-place な単価書き換えは行わない。
type Usecase struct {
	pricingRepo billing.LLMPricingRepository
	modelRepo   llmmodel.Repository
}

// NewUsecase は単価管理ユースケースを作成
func NewUsecase(pricingRepo billing.LLMPricingRepository, modelRepo llmmodel.Repository) *Usecase {
	return &Usecase{
		pricingRepo: pricingRepo,
		modelRepo:   modelRepo,
	}
}

// GetCurrentPricing は現在有効な単価を取得
func (u *Usecase) GetCurrentPricing(ctx context.Context, provider, model string) (*billing.LLMPricing, error) {
	pricing, err := u.pricingRepo.FindEffectiveAt(ctx, provider, model, time.Now())
	if err != nil || pricing == nil {
		return nil, ErrPricingNotFound
	}
	return pricing, nil
}

// ListCurrentPricing は全モデルの現行単価を返す（モデルごとに最新の有効版のみ）
func (u *Usecase) ListCurrentPricing(ctx context.Context) ([]*billing.LLMPricing, error) {
	active, err := u.pricingRepo.ListActive(ctx)
	if err != nil {
		return nil, err
	}

	// ListActive は provider, model, effective_from DESC 順なので、各キーで最初の行が最新
	seen := make(map[string]struct{})
	current := make([]*billing.LLMPricing, 0, len(active))
	for _, p := range active {
		key := p.Provider + "\x00" + p.Model
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		current = append(current, p)
	}
	return current, nil
}

// CreateInitialPricing は新規モデルの初回単価を登録する。
// モデルが llm_models に存在すること、まだ有効な単価が無いことを検証する。
func (u *Usecase) CreateInitialPricing(
	ctx context.Context,
	provider, model string,
	promptCost, completionCost float64,
	notes string,
) (*billing.LLMPricing, error) {
	if err := u.ensureModelRegistered(ctx, provider, model); err != nil {
		return nil, err
	}

	if existing, err := u.pricingRepo.FindEffectiveAt(ctx, provider, model, time.Now()); err == nil && existing != nil {
		return nil, ErrPricingAlreadyExists
	}

	pricing, err := billing.NewLLMPricing(provider, model, promptCost, completionCost, time.Now(), notes)
	if err != nil {
		return nil, err
	}

	if err := u.pricingRepo.Create(ctx, pricing); err != nil {
		return nil, fmt.Errorf("failed to create llm pricing: %w", err)
	}

	return pricing, nil
}

// RevisePricing は単価を改定する。指定IDの行を effectiveFrom で close し、新しい行を作成する。
// 過去のコストスナップショットには影響しない。
func (u *Usecase) RevisePricing(
	ctx context.Context,
	currentID uuid.UUID,
	promptCost, completionCost float64,
	effectiveFrom time.Time,
	notes string,
) (*billing.LLMPricing, error) {
	current, err := u.pricingRepo.FindByID(ctx, currentID)
	if err != nil || current == nil {
		return nil, ErrPricingNotFound
	}

	// 旧行を close（effective_to = effectiveFrom, is_active = false）
	if err := current.Deactivate(effectiveFrom); err != nil {
		return nil, err
	}
	if err := u.pricingRepo.Update(ctx, current); err != nil {
		return nil, fmt.Errorf("failed to deactivate current pricing: %w", err)
	}

	// 新行を作成
	revised, err := billing.NewLLMPricing(current.Provider, current.Model, promptCost, completionCost, effectiveFrom, notes)
	if err != nil {
		return nil, err
	}
	if err := u.pricingRepo.Create(ctx, revised); err != nil {
		return nil, fmt.Errorf("failed to create revised pricing: %w", err)
	}

	return revised, nil
}

// ListPricingHistory は指定モデルの単価履歴を返す（新しい順）
func (u *Usecase) ListPricingHistory(ctx context.Context, provider, model string) ([]*billing.LLMPricing, error) {
	all, err := u.pricingRepo.ListAll(ctx)
	if err != nil {
		return nil, err
	}

	history := make([]*billing.LLMPricing, 0)
	for _, p := range all {
		if p.Provider == provider && p.Model == model {
			history = append(history, p)
		}
	}
	return history, nil
}

// DeactivatePricing は単価を論理無効化する
func (u *Usecase) DeactivatePricing(ctx context.Context, id uuid.UUID) error {
	pricing, err := u.pricingRepo.FindByID(ctx, id)
	if err != nil || pricing == nil {
		return ErrPricingNotFound
	}

	if err := pricing.Deactivate(time.Now()); err != nil {
		return err
	}

	return u.pricingRepo.Update(ctx, pricing)
}

func (u *Usecase) ensureModelRegistered(ctx context.Context, provider, model string) error {
	m, err := u.modelRepo.FindByProviderAndModel(ctx, provider, model)
	if err != nil {
		if errors.Is(err, llmmodel.ErrModelNotFound) {
			return fmt.Errorf("%w: provider=%s model=%s", ErrModelNotRegistered, provider, model)
		}
		return fmt.Errorf("failed to verify llm model: %w", err)
	}
	if m == nil {
		return fmt.Errorf("%w: provider=%s model=%s", ErrModelNotRegistered, provider, model)
	}
	return nil
}
