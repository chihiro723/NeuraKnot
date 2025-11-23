package http

import (
	"net/http"

	"backend-go/internal/domain/billing"
	"backend-go/internal/handler/http/request"
	"backend-go/internal/handler/http/response"
	billingUseCase "backend-go/internal/usecase/billing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// BillingHandler 課金関連のHTTPハンドラ
type BillingHandler struct {
	billingUseCase *billingUseCase.BillingUseCase
}

// NewBillingHandler 課金ハンドラを作成
func NewBillingHandler(billingUseCase *billingUseCase.BillingUseCase) *BillingHandler {
	return &BillingHandler{
		billingUseCase: billingUseCase,
	}
}

// CreateCheckoutSession Checkout Sessionを作成
// @Summary Checkout Sessionを作成
// @Tags billing
// @Accept json
// @Produce json
// @Param request body request.CreateCheckoutSessionRequest true "Checkout Session作成リクエスト"
// @Success 200 {object} response.CheckoutSessionResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/billing/checkout [post]
func (h *BillingHandler) CreateCheckoutSession(c *gin.Context) {
	// ユーザーIDを取得
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("unauthorized"))
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid user id"))
		return
	}

	// リクエストをバインド
	var req request.CreateCheckoutSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// ティアをパース
	tier, err := billing.ParseSubscriptionTier(req.Tier)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid subscription tier"))
		return
	}

	// Checkout Sessionを作成
	session, err := h.billingUseCase.CreateCheckoutSession(
		c.Request.Context(),
		userID,
		tier,
		req.SuccessURL,
		req.CancelURL,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewInternalServerErrorResponse(err.Error()))
		return
	}

	// レスポンスを返す
	c.JSON(http.StatusOK, response.CheckoutSessionResponse{
		SessionID:  session.ID,
		SessionURL: session.URL,
	})
}

// CreateBillingPortalSession Billing Portal Sessionを作成
// @Summary Billing Portal Sessionを作成
// @Tags billing
// @Accept json
// @Produce json
// @Param request body request.CreateBillingPortalSessionRequest true "Billing Portal Session作成リクエスト"
// @Success 200 {object} response.BillingPortalSessionResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/billing/portal [post]
func (h *BillingHandler) CreateBillingPortalSession(c *gin.Context) {
	// ユーザーIDを取得
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("unauthorized"))
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid user id"))
		return
	}

	// リクエストをバインド
	var req request.CreateBillingPortalSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// Billing Portal Sessionを作成
	session, err := h.billingUseCase.CreateBillingPortalSession(
		c.Request.Context(),
		userID,
		req.ReturnURL,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewInternalServerErrorResponse(err.Error()))
		return
	}

	// レスポンスを返す
	c.JSON(http.StatusOK, response.BillingPortalSessionResponse{
		URL: session.URL,
	})
}

// ChangeSubscriptionPlan サブスクリプションプランを変更
// @Summary サブスクリプションプランを変更
// @Tags billing
// @Accept json
// @Produce json
// @Param request body request.ChangeSubscriptionPlanRequest true "プラン変更リクエスト"
// @Success 200 {object} map[string]string
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/billing/subscription/change [post]
func (h *BillingHandler) ChangeSubscriptionPlan(c *gin.Context) {
	// ユーザーIDを取得
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("unauthorized"))
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid user id"))
		return
	}

	// リクエストをバインド
	var req request.ChangeSubscriptionPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// ティアをパース
	tier, err := billing.ParseSubscriptionTier(req.Tier)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid subscription tier"))
		return
	}

	// プラン変更
	if err := h.billingUseCase.ChangeSubscriptionPlan(c.Request.Context(), userID, tier); err != nil {
		c.JSON(http.StatusInternalServerError, response.NewInternalServerErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// CancelSubscription サブスクリプションを解約
// @Summary サブスクリプションを解約
// @Tags billing
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/billing/subscription/cancel [post]
func (h *BillingHandler) CancelSubscription(c *gin.Context) {
	// ユーザーIDを取得
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("unauthorized"))
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid user id"))
		return
	}

	// 解約
	if err := h.billingUseCase.CancelSubscription(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, response.NewInternalServerErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// GetCurrentUsage 現在のトークン使用量を取得
// @Summary 現在のトークン使用量を取得
// @Tags billing
// @Produce json
// @Success 200 {object} response.TokenUsageResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/billing/usage [get]
func (h *BillingHandler) GetCurrentUsage(c *gin.Context) {
	// ユーザーIDを取得
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("unauthorized"))
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid user id"))
		return
	}

	// CheckTokenLimitを使ってユーザーのティアと制限を取得
	_, _, limits, err := h.billingUseCase.CheckTokenLimit(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewInternalServerErrorResponse(err.Error()))
		return
	}
	tier := limits.Tier

	// ai_chat_sessionsから当月の使用量を取得
	usage, err := h.billingUseCase.GetCurrentUsageFromSessions(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewInternalServerErrorResponse(err.Error()))
		return
	}

	// 残り予算を計算
	remainingBudget := limits.MonthlyBudgetUSD - usage.CostUSD
	if remainingBudget < 0 {
		remainingBudget = 0
	}

	// レスポンスを返す
	c.JSON(http.StatusOK, response.TokenUsageResponse{
		PeriodStart:       usage.PeriodStart,
		PeriodEnd:         usage.PeriodEnd,
		TokensPrompt:      usage.TokensPrompt,
		TokensCompletion:  usage.TokensCompletion,
		TokensTotal:       usage.TokensTotal,
		CostUSD:           usage.CostUSD,
		CostJPY:           usage.CostUSD * 150.0, // 固定レート
		RequestCount:      usage.RequestCount,
		ProviderBreakdown: convertProviderBreakdown(usage.ProviderBreakdown),
		LimitUSD:          limits.MonthlyBudgetUSD,
		RemainingUSD:      remainingBudget,
		CurrentTier:       tier.String(),
	})
}

// CheckTokenLimit トークン上限をチェック
// @Summary トークン上限をチェック
// @Tags billing
// @Produce json
// @Success 200 {object} response.TokenLimitCheckResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/billing/check-limit [get]
func (h *BillingHandler) CheckTokenLimit(c *gin.Context) {
	// ユーザーIDを取得
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("unauthorized"))
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid user id"))
		return
	}

	// トークン上限をチェック
	canSend, usage, limits, err := h.billingUseCase.CheckTokenLimit(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewInternalServerErrorResponse(err.Error()))
		return
	}

	// 残り予算と使用率を計算
	remainingBudget := limits.MonthlyBudgetUSD - usage.CostUSD
	if remainingBudget < 0 {
		remainingBudget = 0
	}
	// 使用率はコストベースで計算
	var usagePercentage float64
	if limits.MonthlyBudgetUSD > 0 {
		usagePercentage = (usage.CostUSD / limits.MonthlyBudgetUSD) * 100
	} else {
		usagePercentage = 0
	}

	// レスポンスを返す
	c.JSON(http.StatusOK, response.TokenLimitCheckResponse{
		CanSend:            canSend,
		CurrentTier:        string(limits.Tier),
		TokensUsed:         usage.TokensTotal,
		CostUSD:            usage.CostUSD,
		BudgetLimitUSD:     limits.MonthlyBudgetUSD,
		RemainingBudgetUSD: remainingBudget,
		UsagePercentage:    usagePercentage,
		PeriodEnd:          usage.PeriodEnd,
	})
}

// GetTierLimits プラン制限情報を取得
// @Summary プラン制限情報を取得
// @Tags billing
// @Produce json
// @Success 200 {array} response.TierLimitsResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/billing/tiers [get]
func (h *BillingHandler) GetTierLimits(c *gin.Context) {
	tiers := []billing.SubscriptionTier{
		billing.TierFree,
		billing.TierPro,
		billing.TierMax,
	}

	var responses []response.TierLimitsResponse

	for _, tier := range tiers {
		limits, err := billing.GetTierLimits(tier)
		if err != nil {
			continue
		}

		responses = append(responses, response.TierLimitsResponse{
			Tier:             tier.String(),
			MonthlyBudgetUSD: limits.MonthlyBudgetUSD,
			PriceJPY:         limits.PriceJPY,
			PriceUSD:         limits.PriceUSD,
			MaxAIAgents:      limits.MaxAIAgents,
			MaxGroupChats:    limits.MaxGroupChats,
		})
	}

	c.JSON(http.StatusOK, responses)
}

// convertProviderBreakdown プロバイダー内訳を変換
func convertProviderBreakdown(breakdown map[string]billing.ProviderUsage) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range breakdown {
		result[k] = map[string]interface{}{
			"tokens": v.Tokens,
			"cost":   v.Cost,
		}
	}
	return result
}
