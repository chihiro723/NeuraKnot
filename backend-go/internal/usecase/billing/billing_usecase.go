package billing

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"backend-go/internal/domain/billing"
	"backend-go/internal/domain/user"
	"backend-go/internal/infrastructure/external"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
)

// BillingUseCase 課金ユースケース
type BillingUseCase struct {
	tokenUsageRepo     billing.TokenUsageRepository
	llmPricingRepo     billing.LLMPricingRepository
	userRepo           user.UserRepository
	stripeClient       *external.StripeClient
	db                 *sql.DB
	priceIDPro         string
	priceIDMax         string
	enableSubscription bool
}

// NewBillingUseCase 課金ユースケースを作成
func NewBillingUseCase(
	tokenUsageRepo billing.TokenUsageRepository,
	llmPricingRepo billing.LLMPricingRepository,
	userRepo user.UserRepository,
	stripeClient *external.StripeClient,
	db *sql.DB,
	priceIDPro string,
	priceIDMax string,
	enableSubscription bool,
) *BillingUseCase {
	return &BillingUseCase{
		tokenUsageRepo:     tokenUsageRepo,
		llmPricingRepo:     llmPricingRepo,
		userRepo:           userRepo,
		stripeClient:       stripeClient,
		db:                 db,
		priceIDPro:         priceIDPro,
		priceIDMax:         priceIDMax,
		enableSubscription: enableSubscription,
	}
}

// CreateCustomer Stripe Customerを作成し、ユーザーに紐付ける
func (uc *BillingUseCase) CreateCustomer(ctx context.Context, userID uuid.UUID) (string, error) {
	// ユーザーを取得
	uid, err := user.ParseUserID(userID.String())
	if err != nil {
		return "", fmt.Errorf("invalid user id: %w", err)
	}

	u, err := uc.userRepo.GetByID(ctx, uid)
	if err != nil {
		return "", fmt.Errorf("failed to find user: %w", err)
	}

	// すでにStripe Customerが存在する場合はそのIDを返す
	if u.StripeCustomerID != nil && *u.StripeCustomerID != "" {
		return *u.StripeCustomerID, nil
	}

	// Stripe Customerを作成
	metadata := map[string]string{
		"user_id": userID.String(),
	}

	customer, err := uc.stripeClient.CreateCustomer(u.Email.String(), u.DisplayName, metadata)
	if err != nil {
		return "", fmt.Errorf("failed to create stripe customer: %w", err)
	}

	// ユーザーにStripe Customer IDを設定
	u.StripeCustomerID = &customer.ID
	if err := uc.userRepo.Update(ctx, u); err != nil {
		return "", fmt.Errorf("failed to update user with stripe customer id: %w", err)
	}

	return customer.ID, nil
}

// CreateCheckoutSession Checkout Sessionを作成
func (uc *BillingUseCase) CreateCheckoutSession(
	ctx context.Context,
	userID uuid.UUID,
	tier billing.SubscriptionTier,
	successURL, cancelURL string,
) (*stripe.CheckoutSession, error) {
	// Stripe Customerを取得または作成
	customerID, err := uc.CreateCustomer(ctx, userID)
	if err != nil {
		return nil, err
	}

	// ティアの制限情報を取得
	limits, err := billing.GetTierLimits(tier)
	if err != nil {
		return nil, fmt.Errorf("invalid tier: %w", err)
	}

	// 環境変数から取得したPrice IDで上書き
	switch tier {
	case billing.TierPro:
		limits.StripePriceID = uc.priceIDPro
	case billing.TierMax:
		limits.StripePriceID = uc.priceIDMax
	}

	if limits.StripePriceID == "" {
		return nil, errors.New("tier does not have a stripe price id")
	}

	// Checkout Sessionパラメータを作成
	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(customerID),
		Mode:     stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(limits.StripePriceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		Metadata: map[string]string{
			"user_id": userID.String(),
			"tier":    tier.String(),
		},
	}

	// Checkout Sessionを作成
	session, err := uc.stripeClient.CreateCheckoutSession(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create checkout session: %w", err)
	}

	return session, nil
}

// CreateBillingPortalSession Customer Portalセッションを作成
func (uc *BillingUseCase) CreateBillingPortalSession(
	ctx context.Context,
	userID uuid.UUID,
	returnURL string,
) (*stripe.BillingPortalSession, error) {
	// ユーザーを取得
	uid, err := user.ParseUserID(userID.String())
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}

	u, err := uc.userRepo.GetByID(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// Stripe Customer IDが存在しない場合はエラー
	if u.StripeCustomerID == nil || *u.StripeCustomerID == "" {
		return nil, errors.New("user does not have a stripe customer id")
	}

	// Billing Portal Sessionを作成
	session, err := uc.stripeClient.CreateBillingPortalSession(*u.StripeCustomerID, returnURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create billing portal session: %w", err)
	}

	return session, nil
}

// ChangeSubscriptionPlan サブスクリプションプランを変更
func (uc *BillingUseCase) ChangeSubscriptionPlan(
	ctx context.Context,
	userID uuid.UUID,
	newTier billing.SubscriptionTier,
) error {
	// ユーザーを取得
	uid, err := user.ParseUserID(userID.String())
	if err != nil {
		return fmt.Errorf("invalid user id: %w", err)
	}

	u, err := uc.userRepo.GetByID(ctx, uid)
	if err != nil {
		return fmt.Errorf("failed to find user: %w", err)
	}

	// Stripe Subscription IDが存在しない場合はエラー
	if u.StripeSubscriptionID == nil || *u.StripeSubscriptionID == "" {
		return errors.New("user does not have an active subscription")
	}

	// 現在のサブスクリプションを取得
	sub, err := uc.stripeClient.GetSubscription(*u.StripeSubscriptionID)
	if err != nil {
		return fmt.Errorf("failed to get subscription: %w", err)
	}

	// 新しいプランのPrice IDを取得
	limits, err := billing.GetTierLimits(newTier)
	if err != nil {
		return fmt.Errorf("invalid tier: %w", err)
	}

	// 環境変数から取得したPrice IDで上書き
	switch newTier {
	case billing.TierPro:
		limits.StripePriceID = uc.priceIDPro
	case billing.TierMax:
		limits.StripePriceID = uc.priceIDMax
	}

	if limits.StripePriceID == "" {
		return errors.New("tier does not have a stripe price id")
	}

	// 更新パラメータを作成
	// 既存のアイテムを更新する
	params := &stripe.SubscriptionParams{
		Items: []*stripe.SubscriptionItemsParams{
			{
				ID:    stripe.String(sub.Items.Data[0].ID),
				Price: stripe.String(limits.StripePriceID),
			},
		},
	}

	// サブスクリプションを更新
	_, err = uc.stripeClient.UpdateSubscription(*u.StripeSubscriptionID, params)
	if err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// DB更新はWebhookに任せるが、念のためここでも更新しておく
	u.SubscriptionTier = newTier.String()
	if err := uc.userRepo.Update(ctx, u); err != nil {
		return fmt.Errorf("failed to update user tier: %w", err)
	}

	return nil
}

// CancelSubscription サブスクリプションを解約
func (uc *BillingUseCase) CancelSubscription(ctx context.Context, userID uuid.UUID) error {
	// ユーザーを取得
	uid, err := user.ParseUserID(userID.String())
	if err != nil {
		return fmt.Errorf("invalid user id: %w", err)
	}

	u, err := uc.userRepo.GetByID(ctx, uid)
	if err != nil {
		return fmt.Errorf("failed to find user: %w", err)
	}

	// Stripe Subscription IDが存在しない場合はエラー
	if u.StripeSubscriptionID == nil || *u.StripeSubscriptionID == "" {
		return errors.New("user does not have an active subscription")
	}

	// 期間終了後にキャンセル
	_, err = uc.stripeClient.CancelSubscription(*u.StripeSubscriptionID, true)
	if err != nil {
		return fmt.Errorf("failed to cancel subscription: %w", err)
	}

	return nil
}

// CheckTokenLimit トークン制限をチェック
func (uc *BillingUseCase) CheckTokenLimit(ctx context.Context, userID uuid.UUID) (bool, *billing.TokenUsage, billing.TierLimits, error) {
	// ユーザーを取得
	uid, err := user.ParseUserID(userID.String())
	if err != nil {
		return false, nil, billing.TierLimits{}, fmt.Errorf("invalid user id: %w", err)
	}

	u, err := uc.userRepo.GetByID(ctx, uid)
	if err != nil {
		return false, nil, billing.TierLimits{}, fmt.Errorf("failed to find user: %w", err)
	}

	// 現在の使用量を取得
	usage, err := uc.GetCurrentUsage(ctx, userID)
	if err != nil {
		// 使用量レコードが存在しない場合は新規ユーザーとして扱う
		if err.Error() == "no current token usage found" {
			now := time.Now()
			emptyUsage := &billing.TokenUsage{
				UserID:      userID,
				TokensTotal: 0,
				PeriodEnd:   now.AddDate(0, 1, 0), // 1ヶ月後
			}

			// サブスクリプション機能が無効の場合は常に許可（MaxTier相当）
			if !uc.enableSubscription {
				return true, emptyUsage, billing.MaxTierLimits, nil
			}

			// デフォルトはFreeTierLimits
			return true, emptyUsage, billing.FreeTierLimits, nil
		}
		return false, nil, billing.TierLimits{}, fmt.Errorf("failed to get token usage: %w", err)
	}

	// サブスクリプション機能が無効の場合は常に許可（MaxTier相当として扱う）
	if !uc.enableSubscription {
		return true, usage, billing.MaxTierLimits, nil
	}

	// サブスクリプションティアを取得
	tier, err := billing.ParseSubscriptionTier(u.SubscriptionTier)
	if err != nil {
		return false, nil, billing.TierLimits{}, fmt.Errorf("invalid subscription tier: %w", err)
	}

	// ティアの制限を取得
	limits, err := billing.GetTierLimits(tier)
	if err != nil {
		return false, nil, billing.TierLimits{}, err
	}

	// 残り予算をチェック
	remainingBudget := limits.MonthlyBudgetUSD - usage.CostUSD
	canSend := remainingBudget > 0

	return canSend, usage, limits, nil
}

// RecordTokenUsage トークン使用量を記録
func (uc *BillingUseCase) RecordTokenUsage(
	ctx context.Context,
	userID uuid.UUID,
	provider, model string,
	promptTokens, completionTokens int64,
) error {
	// ユーザーを取得
	uid, err := user.ParseUserID(userID.String())
	if err != nil {
		return fmt.Errorf("invalid user id: %w", err)
	}

	u, err := uc.userRepo.GetByID(ctx, uid)
	if err != nil {
		return fmt.Errorf("failed to find user: %w", err)
	}

	// 課金期間を決定
	var periodStart, periodEnd time.Time
	if u.CurrentPeriodStart != nil && u.CurrentPeriodEnd != nil {
		periodStart = *u.CurrentPeriodStart
		periodEnd = *u.CurrentPeriodEnd
	} else {
		// 課金期間が設定されていない場合は月初〜月末を使用
		now := time.Now()
		periodStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		periodEnd = periodStart.AddDate(0, 1, 0)
	}

	// LLM料金情報を取得
	pricing, err := uc.llmPricingRepo.FindEffectiveAt(ctx, provider, model, time.Now())
	if err != nil {
		return fmt.Errorf("failed to get llm pricing: %w", err)
	}

	// コストを計算
	cost := pricing.CalculateCost(promptTokens, completionTokens)

	// トークン使用量レコードを取得または作成
	usage, err := uc.tokenUsageRepo.FindByUserAndPeriod(ctx, userID, periodStart, periodEnd)
	if err != nil {
		// レコードが存在しない場合は新規作成
		usage, err = billing.NewTokenUsage(userID, periodStart, periodEnd)
		if err != nil {
			return fmt.Errorf("failed to create token usage: %w", err)
		}

		// 使用量を追加
		if err := usage.AddUsage(provider, promptTokens, completionTokens, cost); err != nil {
			return fmt.Errorf("failed to add usage: %w", err)
		}

		// DBに保存
		if err := uc.tokenUsageRepo.Create(ctx, usage); err != nil {
			return fmt.Errorf("failed to save token usage: %w", err)
		}

		return nil
	}

	// 既存レコードに使用量を追加
	if err := usage.AddUsage(provider, promptTokens, completionTokens, cost); err != nil {
		return fmt.Errorf("failed to add usage: %w", err)
	}

	// DBを更新
	if err := uc.tokenUsageRepo.Update(ctx, usage); err != nil {
		return fmt.Errorf("failed to update token usage: %w", err)
	}

	return nil
}

// GetCurrentUsage 現在の使用量を取得
func (uc *BillingUseCase) GetCurrentUsage(ctx context.Context, userID uuid.UUID) (*billing.TokenUsage, error) {
	usage, err := uc.tokenUsageRepo.FindCurrentByUser(ctx, userID)
	if err != nil {
		// レコードが存在しない場合は空のレコードを返す
		if err.Error() == "no current token usage found" {
			uid, err := user.ParseUserID(userID.String())
			if err != nil {
				return nil, fmt.Errorf("invalid user id: %w", err)
			}

			u, err := uc.userRepo.GetByID(ctx, uid)
			if err != nil {
				return nil, fmt.Errorf("failed to find user: %w", err)
			}

			// 課金期間を決定
			var periodStart, periodEnd time.Time
			if u.CurrentPeriodStart != nil && u.CurrentPeriodEnd != nil {
				periodStart = *u.CurrentPeriodStart
				periodEnd = *u.CurrentPeriodEnd
			} else {
				now := time.Now()
				periodStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
				periodEnd = periodStart.AddDate(0, 1, 0)
			}

			return billing.NewTokenUsage(userID, periodStart, periodEnd)
		}
		return nil, fmt.Errorf("failed to get token usage: %w", err)
	}

	return usage, nil
}

// GetCurrentUsageFromSessions ai_chat_sessionsとtoken_usageから当月の使用量を取得
// 統計・分析ページと同じロジックで、両テーブルのデータを合算します
func (uc *BillingUseCase) GetCurrentUsageFromSessions(ctx context.Context, userID uuid.UUID) (*billing.TokenUsage, error) {
	now := time.Now()
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0)

	// 1. ai_chat_sessionsから当月のトークン使用量を集計（会話セッション）
	sessionQuery := `
		SELECT
			COALESCE(SUM(tokens_total), 0) as total,
			COALESCE(SUM(tokens_prompt), 0) as prompt,
			COALESCE(SUM(tokens_completion), 0) as completion,
			COALESCE(SUM(cost_usd), 0) as cost,
			COUNT(*) as request_count
		FROM ai_chat_sessions
		WHERE user_id = $1
			AND status = 'completed'
			AND started_at >= $2
			AND started_at < $3
	`

	var sessionTokensTotal, sessionTokensPrompt, sessionTokensCompletion sql.NullInt64
	var sessionCostUSD sql.NullFloat64
	var sessionRequestCount int

	err := uc.db.QueryRowContext(ctx, sessionQuery, userID, periodStart, periodEnd).Scan(
		&sessionTokensTotal,
		&sessionTokensPrompt,
		&sessionTokensCompletion,
		&sessionCostUSD,
		&sessionRequestCount,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get usage from sessions: %w", err)
	}

	// 2. token_usageテーブルから当月のトークン使用量を集計（質問候補生成など）
	tokenUsageQuery := `
		SELECT
			COALESCE(SUM(tokens_total), 0) as total,
			COALESCE(SUM(tokens_prompt), 0) as prompt,
			COALESCE(SUM(tokens_completion), 0) as completion,
			COALESCE(SUM(cost_usd), 0) as cost,
			COALESCE(SUM(request_count), 0) as request_count
		FROM token_usage
		WHERE user_id = $1
			AND period_start >= $2
			AND period_start < $3
	`

	var usageTokensTotal, usageTokensPrompt, usageTokensCompletion sql.NullInt64
	var usageCostUSD sql.NullFloat64
	var usageRequestCount int

	err = uc.db.QueryRowContext(ctx, tokenUsageQuery, userID, periodStart, periodEnd).Scan(
		&usageTokensTotal,
		&usageTokensPrompt,
		&usageTokensCompletion,
		&usageCostUSD,
		&usageRequestCount,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get usage from token_usage table: %w", err)
	}

	// 3. TokenUsageオブジェクトを作成
	usage, err := billing.NewTokenUsage(userID, periodStart, periodEnd)
	if err != nil {
		return nil, fmt.Errorf("failed to create token usage: %w", err)
	}

	// 4. 両方のテーブルからのデータを合算（統計・分析ページと同じロジック）
	usage.TokensPrompt = sessionTokensPrompt.Int64 + usageTokensPrompt.Int64
	usage.TokensCompletion = sessionTokensCompletion.Int64 + usageTokensCompletion.Int64
	usage.TokensTotal = sessionTokensTotal.Int64 + usageTokensTotal.Int64
	usage.CostUSD = sessionCostUSD.Float64 + usageCostUSD.Float64
	usage.RequestCount = sessionRequestCount + usageRequestCount

	return usage, nil
}
