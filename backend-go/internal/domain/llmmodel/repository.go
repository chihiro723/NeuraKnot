package llmmodel

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	List(ctx context.Context, provider *string, enabledOnly bool) ([]*Model, error)
	FindByID(ctx context.Context, id uuid.UUID) (*Model, error)
	FindByProviderAndModel(ctx context.Context, provider, model string) (*Model, error)
	Create(ctx context.Context, model *Model) error
	Update(ctx context.Context, model *Model) error
	UpdateEnabled(ctx context.Context, id uuid.UUID, isEnabled bool) error
	Delete(ctx context.Context, id uuid.UUID) error
}
