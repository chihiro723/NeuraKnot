package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"backend-go/internal/domain/billing"
	"github.com/google/uuid"
)

// LLMPricingRepository LLM料金マスタリポジトリの実装
type LLMPricingRepository struct {
	db *sql.DB
}

// NewLLMPricingRepository LLM料金マスタリポジトリを作成
func NewLLMPricingRepository(db *sql.DB) *LLMPricingRepository {
	return &LLMPricingRepository{db: db}
}

// Create LLM料金情報を作成
func (r *LLMPricingRepository) Create(ctx context.Context, pricing *billing.LLMPricing) error {
	if err := pricing.Validate(); err != nil {
		return fmt.Errorf("validation error: %w", err)
	}

	query := `
		INSERT INTO llm_pricing (
			id, provider, model,
			prompt_cost_per_1m, completion_cost_per_1m,
			effective_from, effective_to, is_active, notes,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err := r.db.ExecContext(ctx, query,
		pricing.ID,
		pricing.Provider,
		pricing.Model,
		pricing.PromptCostPer1M,
		pricing.CompletionCostPer1M,
		pricing.EffectiveFrom,
		pricing.EffectiveTo,
		pricing.IsActive,
		pricing.Notes,
		pricing.CreatedAt,
		pricing.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create llm pricing: %w", err)
	}

	return nil
}

// FindByID IDでLLM料金情報を取得
func (r *LLMPricingRepository) FindByID(ctx context.Context, id uuid.UUID) (*billing.LLMPricing, error) {
	query := `
		SELECT
			id, provider, model,
			prompt_cost_per_1m, completion_cost_per_1m,
			effective_from, effective_to, is_active, notes,
			created_at, updated_at
		FROM llm_pricing
		WHERE id = $1
	`

	var pricing billing.LLMPricing

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&pricing.ID,
		&pricing.Provider,
		&pricing.Model,
		&pricing.PromptCostPer1M,
		&pricing.CompletionCostPer1M,
		&pricing.EffectiveFrom,
		&pricing.EffectiveTo,
		&pricing.IsActive,
		&pricing.Notes,
		&pricing.CreatedAt,
		&pricing.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("llm pricing not found: %s", id)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to find llm pricing: %w", err)
	}

	return &pricing, nil
}

// FindByProviderAndModel プロバイダーとモデルでLLM料金情報を取得（最新の有効な料金）
func (r *LLMPricingRepository) FindByProviderAndModel(ctx context.Context, provider, model string) (*billing.LLMPricing, error) {
	query := `
		SELECT
			id, provider, model,
			prompt_cost_per_1m, completion_cost_per_1m,
			effective_from, effective_to, is_active, notes,
			created_at, updated_at
		FROM llm_pricing
		WHERE provider = $1 AND model = $2 AND is_active = true
		ORDER BY effective_from DESC
		LIMIT 1
	`

	var pricing billing.LLMPricing

	err := r.db.QueryRowContext(ctx, query, provider, model).Scan(
		&pricing.ID,
		&pricing.Provider,
		&pricing.Model,
		&pricing.PromptCostPer1M,
		&pricing.CompletionCostPer1M,
		&pricing.EffectiveFrom,
		&pricing.EffectiveTo,
		&pricing.IsActive,
		&pricing.Notes,
		&pricing.CreatedAt,
		&pricing.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("llm pricing not found for provider=%s model=%s", provider, model)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to find llm pricing: %w", err)
	}

	return &pricing, nil
}

// FindEffectiveAt 指定日時に有効なLLM料金情報を取得
func (r *LLMPricingRepository) FindEffectiveAt(ctx context.Context, provider, model string, at time.Time) (*billing.LLMPricing, error) {
	query := `
		SELECT
			id, provider, model,
			prompt_cost_per_1m, completion_cost_per_1m,
			effective_from, effective_to, is_active, notes,
			created_at, updated_at
		FROM llm_pricing
		WHERE
			provider = $1
			AND model = $2
			AND is_active = true
			AND effective_from <= $3
			AND (effective_to IS NULL OR effective_to > $3)
		ORDER BY effective_from DESC
		LIMIT 1
	`

	var pricing billing.LLMPricing

	err := r.db.QueryRowContext(ctx, query, provider, model, at).Scan(
		&pricing.ID,
		&pricing.Provider,
		&pricing.Model,
		&pricing.PromptCostPer1M,
		&pricing.CompletionCostPer1M,
		&pricing.EffectiveFrom,
		&pricing.EffectiveTo,
		&pricing.IsActive,
		&pricing.Notes,
		&pricing.CreatedAt,
		&pricing.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("llm pricing not found for provider=%s model=%s at=%s", provider, model, at)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to find llm pricing: %w", err)
	}

	return &pricing, nil
}

// ListAll すべてのLLM料金情報を取得
func (r *LLMPricingRepository) ListAll(ctx context.Context) ([]*billing.LLMPricing, error) {
	query := `
		SELECT
			id, provider, model,
			prompt_cost_per_1m, completion_cost_per_1m,
			effective_from, effective_to, is_active, notes,
			created_at, updated_at
		FROM llm_pricing
		ORDER BY provider, model, effective_from DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list llm pricing: %w", err)
	}
	defer rows.Close()

	var pricings []*billing.LLMPricing

	for rows.Next() {
		var pricing billing.LLMPricing

		err := rows.Scan(
			&pricing.ID,
			&pricing.Provider,
			&pricing.Model,
			&pricing.PromptCostPer1M,
			&pricing.CompletionCostPer1M,
			&pricing.EffectiveFrom,
			&pricing.EffectiveTo,
			&pricing.IsActive,
			&pricing.Notes,
			&pricing.CreatedAt,
			&pricing.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan llm pricing: %w", err)
		}

		pricings = append(pricings, &pricing)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return pricings, nil
}

// ListActive 有効なLLM料金情報を取得
func (r *LLMPricingRepository) ListActive(ctx context.Context) ([]*billing.LLMPricing, error) {
	query := `
		SELECT
			id, provider, model,
			prompt_cost_per_1m, completion_cost_per_1m,
			effective_from, effective_to, is_active, notes,
			created_at, updated_at
		FROM llm_pricing
		WHERE is_active = true
		ORDER BY provider, model, effective_from DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list active llm pricing: %w", err)
	}
	defer rows.Close()

	var pricings []*billing.LLMPricing

	for rows.Next() {
		var pricing billing.LLMPricing

		err := rows.Scan(
			&pricing.ID,
			&pricing.Provider,
			&pricing.Model,
			&pricing.PromptCostPer1M,
			&pricing.CompletionCostPer1M,
			&pricing.EffectiveFrom,
			&pricing.EffectiveTo,
			&pricing.IsActive,
			&pricing.Notes,
			&pricing.CreatedAt,
			&pricing.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan llm pricing: %w", err)
		}

		pricings = append(pricings, &pricing)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return pricings, nil
}

// Update LLM料金情報を更新
func (r *LLMPricingRepository) Update(ctx context.Context, pricing *billing.LLMPricing) error {
	if err := pricing.Validate(); err != nil {
		return fmt.Errorf("validation error: %w", err)
	}

	pricing.UpdatedAt = time.Now()

	query := `
		UPDATE llm_pricing
		SET
			prompt_cost_per_1m = $1,
			completion_cost_per_1m = $2,
			effective_from = $3,
			effective_to = $4,
			is_active = $5,
			notes = $6,
			updated_at = $7
		WHERE id = $8
	`

	result, err := r.db.ExecContext(ctx, query,
		pricing.PromptCostPer1M,
		pricing.CompletionCostPer1M,
		pricing.EffectiveFrom,
		pricing.EffectiveTo,
		pricing.IsActive,
		pricing.Notes,
		pricing.UpdatedAt,
		pricing.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update llm pricing: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("llm pricing not found: %s", pricing.ID)
	}

	return nil
}

// Delete LLM料金情報を削除
func (r *LLMPricingRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM llm_pricing WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete llm pricing: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("llm pricing not found: %s", id)
	}

	return nil
}
