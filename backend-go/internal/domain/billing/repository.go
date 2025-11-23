package billing

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// TokenUsageRepository トークン使用量リポジトリ
type TokenUsageRepository interface {
	// Create トークン使用量レコードを作成
	Create(ctx context.Context, usage *TokenUsage) error

	// FindByID IDでトークン使用量を取得
	FindByID(ctx context.Context, id uuid.UUID) (*TokenUsage, error)

	// FindByUserAndPeriod ユーザーと期間でトークン使用量を取得
	FindByUserAndPeriod(ctx context.Context, userID uuid.UUID, periodStart, periodEnd time.Time) (*TokenUsage, error)

	// FindCurrentByUser ユーザーの現在の課金期間のトークン使用量を取得
	FindCurrentByUser(ctx context.Context, userID uuid.UUID) (*TokenUsage, error)

	// Update トークン使用量を更新
	Update(ctx context.Context, usage *TokenUsage) error

	// ListByUser ユーザーのトークン使用量履歴を取得
	ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*TokenUsage, error)

	// Delete トークン使用量を削除
	Delete(ctx context.Context, id uuid.UUID) error
}

// LLMPricingRepository LLM料金マスタリポジトリ
type LLMPricingRepository interface {
	// Create LLM料金情報を作成
	Create(ctx context.Context, pricing *LLMPricing) error

	// FindByID IDでLLM料金情報を取得
	FindByID(ctx context.Context, id uuid.UUID) (*LLMPricing, error)

	// FindByProviderAndModel プロバイダーとモデルでLLM料金情報を取得
	FindByProviderAndModel(ctx context.Context, provider, model string) (*LLMPricing, error)

	// FindEffectiveAt 指定日時に有効なLLM料金情報を取得
	FindEffectiveAt(ctx context.Context, provider, model string, at time.Time) (*LLMPricing, error)

	// ListAll すべてのLLM料金情報を取得
	ListAll(ctx context.Context) ([]*LLMPricing, error)

	// ListActive 有効なLLM料金情報を取得
	ListActive(ctx context.Context) ([]*LLMPricing, error)

	// Update LLM料金情報を更新
	Update(ctx context.Context, pricing *LLMPricing) error

	// Delete LLM料金情報を削除
	Delete(ctx context.Context, id uuid.UUID) error
}
