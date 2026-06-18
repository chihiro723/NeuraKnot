package usage

import (
	"context"
	"errors"
	"testing"
	"time"

	"backend-go/internal/domain/billing"
	"backend-go/internal/domain/conversation"

	"github.com/google/uuid"
)

// fakePricingRepo は started_at に応じて異なる単価を返すテスト用リポジトリ。
type fakePricingRepo struct {
	// effectiveAt(at) が返す単価。nil を返すと「単価未登録」を表す。
	effectiveAt func(at time.Time) *billing.LLMPricing
}

func (f *fakePricingRepo) Create(context.Context, *billing.LLMPricing) error { return nil }
func (f *fakePricingRepo) FindByID(context.Context, uuid.UUID) (*billing.LLMPricing, error) {
	return nil, nil
}
func (f *fakePricingRepo) FindByProviderAndModel(context.Context, string, string) (*billing.LLMPricing, error) {
	return nil, nil
}
func (f *fakePricingRepo) FindEffectiveAt(_ context.Context, _, _ string, at time.Time) (*billing.LLMPricing, error) {
	if f.effectiveAt == nil {
		return nil, nil
	}
	p := f.effectiveAt(at)
	if p == nil {
		return nil, nil
	}
	return p, nil
}
func (f *fakePricingRepo) ListAll(context.Context) ([]*billing.LLMPricing, error)    { return nil, nil }
func (f *fakePricingRepo) ListActive(context.Context) ([]*billing.LLMPricing, error) { return nil, nil }
func (f *fakePricingRepo) Update(context.Context, *billing.LLMPricing) error         { return nil }
func (f *fakePricingRepo) Delete(context.Context, uuid.UUID) error                   { return nil }

// fakeChatSessionRepo は Save された ChatSession を記録する。
type fakeChatSessionRepo struct {
	saved *conversation.ChatSession
}

func (f *fakeChatSessionRepo) Save(_ context.Context, s *conversation.ChatSession) error {
	f.saved = s
	return nil
}
func (f *fakeChatSessionRepo) FindByID(context.Context, uuid.UUID) (*conversation.ChatSession, error) {
	return nil, nil
}
func (f *fakeChatSessionRepo) FindByMessageID(context.Context, uuid.UUID) (*conversation.ChatSession, error) {
	return nil, nil
}

// unusedTokenUsageRepo は RecordSessionUsage では参照されないことを保証するためのスタブ。
type unusedTokenUsageRepo struct{}

func (unusedTokenUsageRepo) Create(context.Context, *billing.TokenUsage) error { return nil }
func (unusedTokenUsageRepo) FindByID(context.Context, uuid.UUID) (*billing.TokenUsage, error) {
	return nil, nil
}
func (unusedTokenUsageRepo) FindByUserAndPeriod(context.Context, uuid.UUID, time.Time, time.Time) (*billing.TokenUsage, error) {
	return nil, nil
}
func (unusedTokenUsageRepo) FindCurrentByUser(context.Context, uuid.UUID) (*billing.TokenUsage, error) {
	return nil, nil
}
func (unusedTokenUsageRepo) Update(context.Context, *billing.TokenUsage) error { return nil }
func (unusedTokenUsageRepo) ListByUser(context.Context, uuid.UUID, int, int) ([]*billing.TokenUsage, error) {
	return nil, nil
}
func (unusedTokenUsageRepo) Delete(context.Context, uuid.UUID) error { return nil }

func newSession(startedAt time.Time, promptTokens, completionTokens int) *conversation.ChatSession {
	return &conversation.ChatSession{
		ID:               uuid.New(),
		Provider:         "openai",
		Model:            "gpt-4.1",
		TokensPrompt:     promptTokens,
		TokensCompletion: completionTokens,
		StartedAt:        startedAt,
		Status:           "completed",
	}
}

func TestRecordSessionUsage_AppliesPricingSnapshot(t *testing.T) {
	pricing, _ := billing.NewLLMPricing("openai", "gpt-4.1", 2.0, 8.0, time.Now(), "")
	repo := &fakePricingRepo{effectiveAt: func(time.Time) *billing.LLMPricing { return pricing }}
	sessionRepo := &fakeChatSessionRepo{}
	r := NewRecorder(repo, sessionRepo, unusedTokenUsageRepo{})

	session := newSession(time.Now(), 1_000_000, 1_000_000)
	if err := r.RecordSessionUsage(context.Background(), session); err != nil {
		t.Fatalf("RecordSessionUsage returned error: %v", err)
	}

	if sessionRepo.saved == nil {
		t.Fatal("session was not saved")
	}
	// 100万トークンずつなので cost = 2.0 + 8.0 = 10.0
	if sessionRepo.saved.CostUSD != 10.0 {
		t.Errorf("CostUSD = %v, want 10.0", sessionRepo.saved.CostUSD)
	}
	if sessionRepo.saved.PromptCostPer1M != 2.0 || sessionRepo.saved.CompletionCostPer1M != 8.0 {
		t.Errorf("cost snapshot not applied: prompt=%v completion=%v",
			sessionRepo.saved.PromptCostPer1M, sessionRepo.saved.CompletionCostPer1M)
	}
	if sessionRepo.saved.PricingID == nil || *sessionRepo.saved.PricingID != pricing.ID {
		t.Errorf("PricingID snapshot not applied")
	}
}

func TestRecordSessionUsage_NoPricingSavesWithZeroCost(t *testing.T) {
	repo := &fakePricingRepo{effectiveAt: func(time.Time) *billing.LLMPricing { return nil }}
	sessionRepo := &fakeChatSessionRepo{}
	r := NewRecorder(repo, sessionRepo, unusedTokenUsageRepo{})

	session := newSession(time.Now(), 1_000_000, 1_000_000)
	if err := r.RecordSessionUsage(context.Background(), session); err != nil {
		t.Fatalf("RecordSessionUsage returned error: %v", err)
	}

	if sessionRepo.saved == nil {
		t.Fatal("session should still be saved without pricing")
	}
	if sessionRepo.saved.CostUSD != 0 {
		t.Errorf("CostUSD = %v, want 0 when pricing is missing", sessionRepo.saved.CostUSD)
	}
	if sessionRepo.saved.PricingID != nil {
		t.Errorf("PricingID should be nil when pricing is missing")
	}
}

func TestRecordSessionUsage_UsesPricingEffectiveAtStartedAt(t *testing.T) {
	cutoff := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	oldPricing, _ := billing.NewLLMPricing("openai", "gpt-4.1", 1.0, 1.0, cutoff.AddDate(0, -1, 0), "old")
	newPricing, _ := billing.NewLLMPricing("openai", "gpt-4.1", 5.0, 5.0, cutoff, "new")

	repo := &fakePricingRepo{
		effectiveAt: func(at time.Time) *billing.LLMPricing {
			if at.Before(cutoff) {
				return oldPricing
			}
			return newPricing
		},
	}

	// 改定前に開始されたセッションは旧単価
	beforeRepo := &fakeChatSessionRepo{}
	rBefore := NewRecorder(repo, beforeRepo, unusedTokenUsageRepo{})
	beforeSession := newSession(cutoff.AddDate(0, 0, -1), 1_000_000, 0)
	if err := rBefore.RecordSessionUsage(context.Background(), beforeSession); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if beforeRepo.saved.CostUSD != 1.0 {
		t.Errorf("before-revision cost = %v, want 1.0 (old pricing)", beforeRepo.saved.CostUSD)
	}

	// 改定後に開始されたセッションは新単価
	afterRepo := &fakeChatSessionRepo{}
	rAfter := NewRecorder(repo, afterRepo, unusedTokenUsageRepo{})
	afterSession := newSession(cutoff.AddDate(0, 0, 1), 1_000_000, 0)
	if err := rAfter.RecordSessionUsage(context.Background(), afterSession); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if afterRepo.saved.CostUSD != 5.0 {
		t.Errorf("after-revision cost = %v, want 5.0 (new pricing)", afterRepo.saved.CostUSD)
	}
}

// errPricingRepo は FindEffectiveAt がエラーを返すケース（記録は継続する）。
type errPricingRepo struct {
	fakePricingRepo
}

func (errPricingRepo) FindEffectiveAt(context.Context, string, string, time.Time) (*billing.LLMPricing, error) {
	return nil, errors.New("db error")
}

func TestRecordSessionUsage_PricingLookupErrorStillSaves(t *testing.T) {
	sessionRepo := &fakeChatSessionRepo{}
	r := NewRecorder(&errPricingRepo{}, sessionRepo, unusedTokenUsageRepo{})

	session := newSession(time.Now(), 100, 100)
	if err := r.RecordSessionUsage(context.Background(), session); err != nil {
		t.Fatalf("RecordSessionUsage returned error: %v", err)
	}
	if sessionRepo.saved == nil {
		t.Fatal("session should be saved even if pricing lookup fails")
	}
	if sessionRepo.saved.CostUSD != 0 {
		t.Errorf("CostUSD = %v, want 0 on pricing lookup error", sessionRepo.saved.CostUSD)
	}
}
