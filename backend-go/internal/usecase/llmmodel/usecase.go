package llmmodel

import (
	"context"
	"errors"
	"fmt"

	"backend-go/internal/domain/llmmodel"

	"github.com/google/uuid"
)

type Usecase struct {
	repo llmmodel.Repository
}

func NewUsecase(repo llmmodel.Repository) *Usecase {
	return &Usecase{repo: repo}
}

func (u *Usecase) ListModels(ctx context.Context, provider *string, enabledOnly bool) ([]*llmmodel.Model, error) {
	return u.repo.List(ctx, provider, enabledOnly)
}

func (u *Usecase) CreateModel(
	ctx context.Context,
	provider string,
	modelID string,
	displayName string,
	isEnabled bool,
	temperatureMin float64,
	temperatureMax float64,
	maxTokensMin int,
	maxTokensMax int,
	supportsStreaming bool,
	executionLocation string,
	metadata []byte,
) (*llmmodel.Model, error) {
	existing, err := u.repo.FindByProviderAndModel(ctx, provider, modelID)
	if err == nil && existing != nil {
		return nil, llmmodel.ErrModelAlreadyExists
	}
	if err != nil && !errors.Is(err, llmmodel.ErrModelNotFound) {
		return nil, err
	}

	model, err := llmmodel.NewModel(
		provider,
		modelID,
		displayName,
		isEnabled,
		temperatureMin,
		temperatureMax,
		maxTokensMin,
		maxTokensMax,
		supportsStreaming,
		executionLocation,
		metadata,
	)
	if err != nil {
		return nil, err
	}

	if err := u.repo.Create(ctx, model); err != nil {
		return nil, err
	}

	return model, nil
}

func (u *Usecase) SetModelEnabled(ctx context.Context, id uuid.UUID, isEnabled bool) error {
	return u.repo.UpdateEnabled(ctx, id, isEnabled)
}

func (u *Usecase) UpdateModel(
	ctx context.Context,
	id uuid.UUID,
	provider string,
	modelID string,
	displayName string,
	temperatureMin, temperatureMax float64,
	maxTokensMin, maxTokensMax int,
	supportsStreaming bool,
	executionLocation string,
) error {
	model, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	existing, err := u.repo.FindByProviderAndModel(ctx, provider, modelID)
	if err == nil && existing != nil && existing.ID != id {
		return llmmodel.ErrModelAlreadyExists
	}
	if err != nil && !errors.Is(err, llmmodel.ErrModelNotFound) {
		return err
	}

	model.Provider = provider
	model.Model = modelID
	model.DisplayName = displayName
	model.TemperatureMin = temperatureMin
	model.TemperatureMax = temperatureMax
	model.MaxTokensMin = maxTokensMin
	model.MaxTokensMax = maxTokensMax
	model.SupportsStreaming = supportsStreaming
	if executionLocation != "" {
		model.ExecutionLocation = executionLocation
	}

	if err := model.Validate(); err != nil {
		return err
	}

	return u.repo.Update(ctx, model)
}

func (u *Usecase) DeleteModel(ctx context.Context, id uuid.UUID) error {
	return u.repo.Delete(ctx, id)
}

func (u *Usecase) ValidateRuntimeConfig(ctx context.Context, provider, model string, temperature float64, maxTokens int) error {
	m, err := u.repo.FindByProviderAndModel(ctx, provider, model)
	if err != nil {
		if errors.Is(err, llmmodel.ErrModelNotFound) {
			return fmt.Errorf("%w: provider=%s model=%s", llmmodel.ErrModelNotFound, provider, model)
		}
		return fmt.Errorf("failed to load llm model: %w", err)
	}

	if err := m.ValidateRuntimeConfig(temperature, maxTokens); err != nil {
		switch {
		case errors.Is(err, llmmodel.ErrModelDisabled):
			return fmt.Errorf("%w: provider=%s model=%s", llmmodel.ErrModelDisabled, provider, model)
		case errors.Is(err, llmmodel.ErrTemperatureOutOfRange):
			return fmt.Errorf(
				"%w: expected %.2f-%.2f got %.2f",
				llmmodel.ErrTemperatureOutOfRange,
				m.TemperatureMin,
				m.TemperatureMax,
				temperature,
			)
		case errors.Is(err, llmmodel.ErrMaxTokensOutOfRange):
			return fmt.Errorf(
				"%w: expected %d-%d got %d",
				llmmodel.ErrMaxTokensOutOfRange,
				m.MaxTokensMin,
				m.MaxTokensMax,
				maxTokens,
			)
		default:
			return err
		}
	}

	return nil
}
