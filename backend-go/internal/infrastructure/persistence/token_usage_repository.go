package persistence

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"backend-go/internal/domain/billing"
	"github.com/google/uuid"
)

// TokenUsageRepository トークン使用量リポジトリの実装
type TokenUsageRepository struct {
	db *sql.DB
}

// NewTokenUsageRepository トークン使用量リポジトリを作成
func NewTokenUsageRepository(db *sql.DB) *TokenUsageRepository {
	return &TokenUsageRepository{db: db}
}

// Create トークン使用量レコードを作成
func (r *TokenUsageRepository) Create(ctx context.Context, usage *billing.TokenUsage) error {
	if err := usage.Validate(); err != nil {
		return fmt.Errorf("validation error: %w", err)
	}

	providerBreakdownJSON, err := usage.MarshallProviderBreakdown()
	if err != nil {
		return fmt.Errorf("failed to marshal provider breakdown: %w", err)
	}

	query := `
		INSERT INTO token_usage (
			id, user_id, period_start, period_end,
			tokens_prompt, tokens_completion, tokens_total,
			cost_usd, request_count, provider_breakdown,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	_, err = r.db.ExecContext(ctx, query,
		usage.ID,
		usage.UserID,
		usage.PeriodStart,
		usage.PeriodEnd,
		usage.TokensPrompt,
		usage.TokensCompletion,
		usage.TokensTotal,
		usage.CostUSD,
		usage.RequestCount,
		providerBreakdownJSON,
		usage.CreatedAt,
		usage.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create token usage: %w", err)
	}

	return nil
}

// FindByID IDでトークン使用量を取得
func (r *TokenUsageRepository) FindByID(ctx context.Context, id uuid.UUID) (*billing.TokenUsage, error) {
	query := `
		SELECT
			id, user_id, period_start, period_end,
			tokens_prompt, tokens_completion, tokens_total,
			cost_usd, request_count, provider_breakdown,
			created_at, updated_at
		FROM token_usage
		WHERE id = $1
	`

	var usage billing.TokenUsage
	var providerBreakdownJSON string

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&usage.ID,
		&usage.UserID,
		&usage.PeriodStart,
		&usage.PeriodEnd,
		&usage.TokensPrompt,
		&usage.TokensCompletion,
		&usage.TokensTotal,
		&usage.CostUSD,
		&usage.RequestCount,
		&providerBreakdownJSON,
		&usage.CreatedAt,
		&usage.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("token usage not found: %s", id)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to find token usage: %w", err)
	}

	if err := usage.UnmarshallProviderBreakdown(providerBreakdownJSON); err != nil {
		return nil, fmt.Errorf("failed to unmarshal provider breakdown: %w", err)
	}

	return &usage, nil
}

// FindByUserAndPeriod ユーザーと期間でトークン使用量を取得
func (r *TokenUsageRepository) FindByUserAndPeriod(ctx context.Context, userID uuid.UUID, periodStart, periodEnd time.Time) (*billing.TokenUsage, error) {
	query := `
		SELECT
			id, user_id, period_start, period_end,
			tokens_prompt, tokens_completion, tokens_total,
			cost_usd, request_count, provider_breakdown,
			created_at, updated_at
		FROM token_usage
		WHERE user_id = $1 AND period_start = $2 AND period_end = $3
	`

	var usage billing.TokenUsage
	var providerBreakdownJSON string

	err := r.db.QueryRowContext(ctx, query, userID, periodStart, periodEnd).Scan(
		&usage.ID,
		&usage.UserID,
		&usage.PeriodStart,
		&usage.PeriodEnd,
		&usage.TokensPrompt,
		&usage.TokensCompletion,
		&usage.TokensTotal,
		&usage.CostUSD,
		&usage.RequestCount,
		&providerBreakdownJSON,
		&usage.CreatedAt,
		&usage.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("token usage not found for the specified period")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to find token usage: %w", err)
	}

	if err := usage.UnmarshallProviderBreakdown(providerBreakdownJSON); err != nil {
		return nil, fmt.Errorf("failed to unmarshal provider breakdown: %w", err)
	}

	return &usage, nil
}

// FindCurrentByUser ユーザーの現在の課金期間のトークン使用量を取得
func (r *TokenUsageRepository) FindCurrentByUser(ctx context.Context, userID uuid.UUID) (*billing.TokenUsage, error) {
	now := time.Now()

	query := `
		SELECT
			id, user_id, period_start, period_end,
			tokens_prompt, tokens_completion, tokens_total,
			cost_usd, request_count, provider_breakdown,
			created_at, updated_at
		FROM token_usage
		WHERE user_id = $1 AND period_start <= $2 AND period_end > $2
		ORDER BY period_start DESC
		LIMIT 1
	`

	var usage billing.TokenUsage
	var providerBreakdownJSON string

	err := r.db.QueryRowContext(ctx, query, userID, now).Scan(
		&usage.ID,
		&usage.UserID,
		&usage.PeriodStart,
		&usage.PeriodEnd,
		&usage.TokensPrompt,
		&usage.TokensCompletion,
		&usage.TokensTotal,
		&usage.CostUSD,
		&usage.RequestCount,
		&providerBreakdownJSON,
		&usage.CreatedAt,
		&usage.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("no current token usage found")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to find current token usage: %w", err)
	}

	if err := usage.UnmarshallProviderBreakdown(providerBreakdownJSON); err != nil {
		return nil, fmt.Errorf("failed to unmarshal provider breakdown: %w", err)
	}

	return &usage, nil
}

// Update トークン使用量を更新
func (r *TokenUsageRepository) Update(ctx context.Context, usage *billing.TokenUsage) error {
	if err := usage.Validate(); err != nil {
		return fmt.Errorf("validation error: %w", err)
	}

	providerBreakdownJSON, err := usage.MarshallProviderBreakdown()
	if err != nil {
		return fmt.Errorf("failed to marshal provider breakdown: %w", err)
	}

	usage.UpdatedAt = time.Now()

	query := `
		UPDATE token_usage
		SET
			tokens_prompt = $1,
			tokens_completion = $2,
			tokens_total = $3,
			cost_usd = $4,
			request_count = $5,
			provider_breakdown = $6,
			updated_at = $7
		WHERE id = $8
	`

	result, err := r.db.ExecContext(ctx, query,
		usage.TokensPrompt,
		usage.TokensCompletion,
		usage.TokensTotal,
		usage.CostUSD,
		usage.RequestCount,
		providerBreakdownJSON,
		usage.UpdatedAt,
		usage.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update token usage: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("token usage not found: %s", usage.ID)
	}

	return nil
}

// ListByUser ユーザーのトークン使用量履歴を取得
func (r *TokenUsageRepository) ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*billing.TokenUsage, error) {
	query := `
		SELECT
			id, user_id, period_start, period_end,
			tokens_prompt, tokens_completion, tokens_total,
			cost_usd, request_count, provider_breakdown,
			created_at, updated_at
		FROM token_usage
		WHERE user_id = $1
		ORDER BY period_start DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list token usage: %w", err)
	}
	defer rows.Close()

	var usages []*billing.TokenUsage

	for rows.Next() {
		var usage billing.TokenUsage
		var providerBreakdownJSON string

		err := rows.Scan(
			&usage.ID,
			&usage.UserID,
			&usage.PeriodStart,
			&usage.PeriodEnd,
			&usage.TokensPrompt,
			&usage.TokensCompletion,
			&usage.TokensTotal,
			&usage.CostUSD,
			&usage.RequestCount,
			&providerBreakdownJSON,
			&usage.CreatedAt,
			&usage.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan token usage: %w", err)
		}

		if err := usage.UnmarshallProviderBreakdown(providerBreakdownJSON); err != nil {
			return nil, fmt.Errorf("failed to unmarshal provider breakdown: %w", err)
		}

		usages = append(usages, &usage)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return usages, nil
}

// Delete トークン使用量を削除
func (r *TokenUsageRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM token_usage WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete token usage: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("token usage not found: %s", id)
	}

	return nil
}
