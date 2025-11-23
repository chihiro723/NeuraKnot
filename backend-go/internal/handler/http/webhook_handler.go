package http

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"backend-go/internal/domain/billing"
	"backend-go/internal/domain/user"
	"backend-go/internal/handler/http/response"
	"backend-go/internal/infrastructure/config"
	billingUseCase "backend-go/internal/usecase/billing"
	"backend-go/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/webhook"
)

// WebhookHandler Webhookハンドラ
type WebhookHandler struct {
	billingUseCase *billingUseCase.BillingUseCase
	userRepo       user.UserRepository
	webhookSecret  string
	config         *config.Config
	logger         logger.Logger
}

// NewWebhookHandler Webhookハンドラを作成
func NewWebhookHandler(
	billingUseCase *billingUseCase.BillingUseCase,
	userRepo user.UserRepository,
	webhookSecret string,
	cfg *config.Config,
	log logger.Logger,
) *WebhookHandler {
	return &WebhookHandler{
		billingUseCase: billingUseCase,
		userRepo:       userRepo,
		webhookSecret:  webhookSecret,
		config:         cfg,
		logger:         log,
	}
}

// HandleStripeWebhook Stripe Webhookを処理
// @Summary Stripe Webhookを処理
// @Tags webhook
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/webhooks/stripe [post]
func (h *WebhookHandler) HandleStripeWebhook(c *gin.Context) {
	// リクエストボディを読み取り
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		h.logger.Error("Failed to read webhook payload: %v", err)
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid payload"))
		return
	}

	// Stripe署名を検証
	signatureHeader := c.GetHeader("Stripe-Signature")
	event, err := webhook.ConstructEvent(payload, signatureHeader, h.webhookSecret)
	if err != nil {
		h.logger.Error("Failed to verify webhook signature: %v", err)
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid signature"))
		return
	}

	h.logger.Info("Received Stripe webhook event: %s", event.Type)

	// イベントタイプごとに処理を分岐
	switch event.Type {
	case "customer.subscription.created":
		h.handleSubscriptionCreated(c, event)
	case "customer.subscription.updated":
		h.handleSubscriptionUpdated(c, event)
	case "customer.subscription.deleted":
		h.handleSubscriptionDeleted(c, event)
	case "invoice.payment_succeeded":
		h.handleInvoicePaymentSucceeded(c, event)
	case "invoice.payment_failed":
		h.handleInvoicePaymentFailed(c, event)
	default:
		h.logger.Info("Unhandled webhook event type: %s", event.Type)
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

// handleSubscriptionCreated サブスクリプション作成イベントを処理
func (h *WebhookHandler) handleSubscriptionCreated(c *gin.Context, event stripe.Event) {
	var subscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
		h.logger.Error("Failed to unmarshal subscription: %v", err)
		return
	}

	h.logger.Info("Subscription created: %s for customer: %s", subscription.ID, subscription.Customer.ID)

	// ユーザーを取得
	u, err := h.getUserByStripeCustomerID(c, subscription.Customer.ID)
	if err != nil {
		h.logger.Error("Failed to get user by stripe customer id: %v", err)
		return
	}

	// サブスクリプション情報を更新
	tier := h.getTierFromPriceID(subscription.Items.Data[0].Price.ID)
	u.SubscriptionTier = tier.String()
	u.SubscriptionStatus = string(subscription.Status)
	u.StripeSubscriptionID = &subscription.ID
	periodStart := time.Unix(subscription.CurrentPeriodStart, 0)
	periodEnd := time.Unix(subscription.CurrentPeriodEnd, 0)
	u.CurrentPeriodStart = &periodStart
	u.CurrentPeriodEnd = &periodEnd

	if err := h.userRepo.Update(c.Request.Context(), u); err != nil {
		h.logger.Error("Failed to update user subscription: %v", err)
		return
	}

	h.logger.Info("User subscription updated: user_id=%s tier=%s", u.ID.String(), tier.String())
}

// handleSubscriptionUpdated サブスクリプション更新イベントを処理
func (h *WebhookHandler) handleSubscriptionUpdated(c *gin.Context, event stripe.Event) {
	var subscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
		h.logger.Error("Failed to unmarshal subscription: %v", err)
		return
	}

	h.logger.Info("Subscription updated: %s for customer: %s", subscription.ID, subscription.Customer.ID)

	// ユーザーを取得
	u, err := h.getUserByStripeCustomerID(c, subscription.Customer.ID)
	if err != nil {
		h.logger.Error("Failed to get user by stripe customer id: %v", err)
		return
	}

	// サブスクリプション情報を更新
	tier := h.getTierFromPriceID(subscription.Items.Data[0].Price.ID)
	u.SubscriptionTier = tier.String()
	u.SubscriptionStatus = string(subscription.Status)
	periodStart := time.Unix(subscription.CurrentPeriodStart, 0)
	periodEnd := time.Unix(subscription.CurrentPeriodEnd, 0)
	u.CurrentPeriodStart = &periodStart
	u.CurrentPeriodEnd = &periodEnd

	if err := h.userRepo.Update(c.Request.Context(), u); err != nil {
		h.logger.Error("Failed to update user subscription: %v", err)
		return
	}

	h.logger.Info("User subscription updated: user_id=%s tier=%s status=%s", u.ID.String(), tier.String(), subscription.Status)
}

// handleSubscriptionDeleted サブスクリプション削除イベントを処理
func (h *WebhookHandler) handleSubscriptionDeleted(c *gin.Context, event stripe.Event) {
	var subscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
		h.logger.Error("Failed to unmarshal subscription: %v", err)
		return
	}

	h.logger.Info("Subscription deleted: %s for customer: %s", subscription.ID, subscription.Customer.ID)

	// ユーザーを取得
	u, err := h.getUserByStripeCustomerID(c, subscription.Customer.ID)
	if err != nil {
		h.logger.Error("Failed to get user by stripe customer id: %v", err)
		return
	}

	// Freeティアにダウングレード
	u.SubscriptionTier = billing.TierFree.String()
	u.SubscriptionStatus = "canceled"
	u.StripeSubscriptionID = nil
	u.CurrentPeriodStart = nil
	u.CurrentPeriodEnd = nil

	if err := h.userRepo.Update(c.Request.Context(), u); err != nil {
		h.logger.Error("Failed to update user subscription: %v", err)
		return
	}

	h.logger.Info("User downgraded to free tier: user_id=%s", u.ID.String())
}

// handleInvoicePaymentSucceeded 請求書支払い成功イベントを処理
func (h *WebhookHandler) handleInvoicePaymentSucceeded(c *gin.Context, event stripe.Event) {
	var invoice stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
		h.logger.Error("Failed to unmarshal invoice: %v", err)
		return
	}

	h.logger.Info("Invoice payment succeeded: %s for customer: %s", invoice.ID, invoice.Customer.ID)

	// サブスクリプション更新の場合は、新しい課金期間のtoken_usageレコードを作成
	if invoice.Subscription != nil {
		// ユーザーを取得
		u, err := h.getUserByStripeCustomerID(c, invoice.Customer.ID)
		if err != nil {
			h.logger.Error("Failed to get user by stripe customer id: %v", err)
			return
		}

		// 新しい課金期間のtoken_usageレコードを作成
		// （実際の実装では、BillingUseCaseに専用メソッドを追加する方が良い）
		h.logger.Info("New billing period started for user: %s", u.ID.String())
	}
}

// handleInvoicePaymentFailed 請求書支払い失敗イベントを処理
func (h *WebhookHandler) handleInvoicePaymentFailed(c *gin.Context, event stripe.Event) {
	var invoice stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
		h.logger.Error("Failed to unmarshal invoice: %v", err)
		return
	}

	h.logger.Error("Invoice payment failed: %s for customer: %s", invoice.ID, invoice.Customer.ID)

	// ユーザーを取得
	u, err := h.getUserByStripeCustomerID(c, invoice.Customer.ID)
	if err != nil {
		h.logger.Error("Failed to get user by stripe customer id: %v", err)
		return
	}

	// ステータスを更新
	u.SubscriptionStatus = "past_due"

	if err := h.userRepo.Update(c.Request.Context(), u); err != nil {
		h.logger.Error("Failed to update user subscription status: %v", err)
		return
	}

	h.logger.Info("User subscription status updated to past_due: user_id=%s", u.ID.String())
}

// getUserByStripeCustomerID Stripe Customer IDでユーザーを取得
func (h *WebhookHandler) getUserByStripeCustomerID(c *gin.Context, customerID string) (*user.User, error) {
	// リポジトリの専用メソッドを使用（効率的）
	u, err := h.userRepo.GetByStripeCustomerID(c.Request.Context(), customerID)
	if err != nil {
		return nil, fmt.Errorf("user not found for stripe customer id: %s", customerID)
	}
	return u, nil
}

// getTierFromPriceID Stripe Price IDからティアを取得
func (h *WebhookHandler) getTierFromPriceID(priceID string) billing.SubscriptionTier {
	// 環境変数から実際のPrice IDを取得して比較
	if priceID == h.config.Stripe.PriceIDPro {
		return billing.TierPro
	}
	if priceID == h.config.Stripe.PriceIDMax {
		return billing.TierMax
	}
	// デフォルトはFreeティア
	return billing.TierFree
}
