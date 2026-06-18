package persistence

import (
	"context"
	"database/sql"
	"fmt"

	"backend-go/internal/domain/llmmodel"

	"github.com/google/uuid"
)

type LLMModelRepository struct {
	db *sql.DB
}

func NewLLMModelRepository(db *sql.DB) *LLMModelRepository {
	return &LLMModelRepository{db: db}
}

func (r *LLMModelRepository) List(ctx context.Context, provider *string, enabledOnly bool) ([]*llmmodel.Model, error) {
	query := `
		SELECT
			id, provider, model, display_name, is_enabled,
			temperature_min, temperature_max, max_tokens_min, max_tokens_max,
			supports_streaming, metadata, created_at, updated_at
		FROM llm_models
		WHERE ($1::text IS NULL OR provider = $1)
			AND ($2::boolean = false OR is_enabled = true)
		ORDER BY provider ASC, display_name ASC
	`

	var providerValue interface{}
	if provider != nil {
		providerValue = *provider
	} else {
		providerValue = nil
	}

	rows, err := r.db.QueryContext(ctx, query, providerValue, enabledOnly)
	if err != nil {
		return nil, fmt.Errorf("failed to list llm models: %w", err)
	}
	defer rows.Close()

	models := make([]*llmmodel.Model, 0)
	for rows.Next() {
		model, scanErr := r.scanModel(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		models = append(models, model)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate llm models: %w", err)
	}

	return models, nil
}

func (r *LLMModelRepository) FindByID(ctx context.Context, id uuid.UUID) (*llmmodel.Model, error) {
	query := `
		SELECT
			id, provider, model, display_name, is_enabled,
			temperature_min, temperature_max, max_tokens_min, max_tokens_max,
			supports_streaming, metadata, created_at, updated_at
		FROM llm_models
		WHERE id = $1
	`

	row := r.db.QueryRowContext(ctx, query, id)
	model, err := r.scanModel(row)
	if err == sql.ErrNoRows {
		return nil, llmmodel.ErrModelNotFound
	}
	if err != nil {
		return nil, err
	}

	return model, nil
}

func (r *LLMModelRepository) FindByProviderAndModel(ctx context.Context, provider, model string) (*llmmodel.Model, error) {
	query := `
		SELECT
			id, provider, model, display_name, is_enabled,
			temperature_min, temperature_max, max_tokens_min, max_tokens_max,
			supports_streaming, metadata, created_at, updated_at
		FROM llm_models
		WHERE provider = $1 AND model = $2
	`

	row := r.db.QueryRowContext(ctx, query, provider, model)
	result, err := r.scanModel(row)
	if err == sql.ErrNoRows {
		return nil, llmmodel.ErrModelNotFound
	}
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (r *LLMModelRepository) Create(ctx context.Context, model *llmmodel.Model) error {
	if err := model.Validate(); err != nil {
		return err
	}

	query := `
		INSERT INTO llm_models (
			id, provider, model, display_name, is_enabled,
			temperature_min, temperature_max, max_tokens_min, max_tokens_max,
			supports_streaming, metadata, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13
		)
	`

	_, err := r.db.ExecContext(
		ctx,
		query,
		model.ID,
		model.Provider,
		model.Model,
		model.DisplayName,
		model.IsEnabled,
		model.TemperatureMin,
		model.TemperatureMax,
		model.MaxTokensMin,
		model.MaxTokensMax,
		model.SupportsStreaming,
		model.Metadata,
		model.CreatedAt,
		model.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create llm model: %w", err)
	}

	return nil
}

func (r *LLMModelRepository) Update(ctx context.Context, model *llmmodel.Model) error {
	if err := model.Validate(); err != nil {
		return err
	}

	query := `
		UPDATE llm_models
		SET
			provider = $1,
			model = $2,
			display_name = $3,
			temperature_min = $4,
			temperature_max = $5,
			max_tokens_min = $6,
			max_tokens_max = $7,
			supports_streaming = $8,
			updated_at = NOW()
		WHERE id = $9
	`

	result, err := r.db.ExecContext(
		ctx,
		query,
		model.Provider,
		model.Model,
		model.DisplayName,
		model.TemperatureMin,
		model.TemperatureMax,
		model.MaxTokensMin,
		model.MaxTokensMax,
		model.SupportsStreaming,
		model.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update llm model: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to read rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return llmmodel.ErrModelNotFound
	}

	return nil
}

func (r *LLMModelRepository) UpdateEnabled(ctx context.Context, id uuid.UUID, isEnabled bool) error {
	query := `UPDATE llm_models SET is_enabled = $1 WHERE id = $2`
	result, err := r.db.ExecContext(ctx, query, isEnabled, id)
	if err != nil {
		return fmt.Errorf("failed to update llm model enabled status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to read rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return llmmodel.ErrModelNotFound
	}

	return nil
}

func (r *LLMModelRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM llm_models WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete llm model: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to read rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return llmmodel.ErrModelNotFound
	}

	return nil
}

type scanner interface {
	Scan(dest ...interface{}) error
}

func (r *LLMModelRepository) scanModel(s scanner) (*llmmodel.Model, error) {
	var model llmmodel.Model
	var metadata []byte

	err := s.Scan(
		&model.ID,
		&model.Provider,
		&model.Model,
		&model.DisplayName,
		&model.IsEnabled,
		&model.TemperatureMin,
		&model.TemperatureMax,
		&model.MaxTokensMin,
		&model.MaxTokensMax,
		&model.SupportsStreaming,
		&metadata,
		&model.CreatedAt,
		&model.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, fmt.Errorf("failed to scan llm model: %w", err)
	}

	model.Metadata = metadata
	return &model, nil
}
