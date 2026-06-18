package llmpricing

import (
	"context"
	"errors"
	"testing"
	"time"

	"backend-go/internal/domain/billing"
	"backend-go/internal/domain/llmmodel"

	"github.com/google/uuid"
)

// stubPricingRepo は Create/Update の呼び出しを記録するテスト用リポジトリ。
type stubPricingRepo struct {
	byID        map[uuid.UUID]*billing.LLMPricing
	effective   *billing.LLMPricing
	created     []*billing.LLMPricing
	updated     []*billing.LLMPricing
	createError error
}

func newStubPricingRepo() *stubPricingRepo {
	return &stubPricingRepo{byID: make(map[uuid.UUID]*billing.LLMPricing)}
}

func (s *stubPricingRepo) Create(_ context.Context, p *billing.LLMPricing) error {
	if s.createError != nil {
		return s.createError
	}
	s.created = append(s.created, p)
	s.byID[p.ID] = p
	return nil
}
func (s *stubPricingRepo) FindByID(_ context.Context, id uuid.UUID) (*billing.LLMPricing, error) {
	if p, ok := s.byID[id]; ok {
		return p, nil
	}
	return nil, nil
}
func (s *stubPricingRepo) FindByProviderAndModel(context.Context, string, string) (*billing.LLMPricing, error) {
	return nil, nil
}
func (s *stubPricingRepo) FindEffectiveAt(context.Context, string, string, time.Time) (*billing.LLMPricing, error) {
	return s.effective, nil
}
func (s *stubPricingRepo) ListAll(context.Context) ([]*billing.LLMPricing, error)    { return nil, nil }
func (s *stubPricingRepo) ListActive(context.Context) ([]*billing.LLMPricing, error) { return nil, nil }
func (s *stubPricingRepo) Update(_ context.Context, p *billing.LLMPricing) error {
	s.updated = append(s.updated, p)
	s.byID[p.ID] = p
	return nil
}
func (s *stubPricingRepo) Delete(context.Context, uuid.UUID) error { return nil }

// stubModelRepo は provider+model がモデルマスタに存在するかどうかだけを制御する。
type stubModelRepo struct {
	registered bool
}

func (s *stubModelRepo) List(context.Context, *string, bool) ([]*llmmodel.Model, error) {
	return nil, nil
}
func (s *stubModelRepo) FindByID(context.Context, uuid.UUID) (*llmmodel.Model, error) {
	return nil, nil
}
func (s *stubModelRepo) FindByProviderAndModel(context.Context, string, string) (*llmmodel.Model, error) {
	if s.registered {
		return &llmmodel.Model{}, nil
	}
	return nil, llmmodel.ErrModelNotFound
}
func (s *stubModelRepo) Create(context.Context, *llmmodel.Model) error            { return nil }
func (s *stubModelRepo) Update(context.Context, *llmmodel.Model) error            { return nil }
func (s *stubModelRepo) UpdateEnabled(context.Context, uuid.UUID, bool) error     { return nil }
func (s *stubModelRepo) Delete(context.Context, uuid.UUID) error                  { return nil }

func TestCreateInitialPricing_RejectsUnregisteredModel(t *testing.T) {
	u := NewUsecase(newStubPricingRepo(), &stubModelRepo{registered: false})

	_, err := u.CreateInitialPricing(context.Background(), "openai", "ghost-model", 1.0, 2.0, "")
	if !errors.Is(err, ErrModelNotRegistered) {
		t.Fatalf("err = %v, want ErrModelNotRegistered", err)
	}
}

func TestCreateInitialPricing_RejectsWhenActivePricingExists(t *testing.T) {
	repo := newStubPricingRepo()
	existing, _ := billing.NewLLMPricing("openai", "gpt-4.1", 1.0, 2.0, time.Now(), "")
	repo.effective = existing

	u := NewUsecase(repo, &stubModelRepo{registered: true})

	_, err := u.CreateInitialPricing(context.Background(), "openai", "gpt-4.1", 1.0, 2.0, "")
	if !errors.Is(err, ErrPricingAlreadyExists) {
		t.Fatalf("err = %v, want ErrPricingAlreadyExists", err)
	}
}

func TestCreateInitialPricing_Success(t *testing.T) {
	repo := newStubPricingRepo()
	u := NewUsecase(repo, &stubModelRepo{registered: true})

	pricing, err := u.CreateInitialPricing(context.Background(), "openai", "gpt-4.1", 2.5, 10.0, "init")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(repo.created) != 1 {
		t.Fatalf("expected 1 created pricing, got %d", len(repo.created))
	}
	if !pricing.IsActive {
		t.Errorf("created pricing should be active")
	}
	if pricing.PromptCostPer1M != 2.5 || pricing.CompletionCostPer1M != 10.0 {
		t.Errorf("unexpected costs: %+v", pricing)
	}
}

func TestRevisePricing_ClosesOldAndCreatesNew(t *testing.T) {
	repo := newStubPricingRepo()
	current, _ := billing.NewLLMPricing("openai", "gpt-4.1", 2.0, 8.0, time.Now().AddDate(0, -1, 0), "old")
	repo.byID[current.ID] = current

	u := NewUsecase(repo, &stubModelRepo{registered: true})

	effectiveFrom := time.Now()
	revised, err := u.RevisePricing(context.Background(), current.ID, 3.0, 12.0, effectiveFrom, "revised")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 旧行が close されている
	if len(repo.updated) != 1 {
		t.Fatalf("expected 1 update (deactivation), got %d", len(repo.updated))
	}
	if repo.updated[0].IsActive {
		t.Errorf("old pricing should be deactivated")
	}
	if repo.updated[0].EffectiveTo == nil || !repo.updated[0].EffectiveTo.Equal(effectiveFrom) {
		t.Errorf("old pricing effective_to should equal effectiveFrom")
	}

	// 新行が作成されている
	if len(repo.created) != 1 {
		t.Fatalf("expected 1 created (revision), got %d", len(repo.created))
	}
	if revised.PromptCostPer1M != 3.0 || revised.CompletionCostPer1M != 12.0 {
		t.Errorf("revised costs incorrect: %+v", revised)
	}
	if !revised.IsActive {
		t.Errorf("revised pricing should be active")
	}
	if revised.Provider != current.Provider || revised.Model != current.Model {
		t.Errorf("revised pricing should keep provider/model")
	}
}

func TestRevisePricing_NotFound(t *testing.T) {
	repo := newStubPricingRepo()
	u := NewUsecase(repo, &stubModelRepo{registered: true})

	_, err := u.RevisePricing(context.Background(), uuid.New(), 1.0, 2.0, time.Now(), "")
	if !errors.Is(err, ErrPricingNotFound) {
		t.Fatalf("err = %v, want ErrPricingNotFound", err)
	}
}
