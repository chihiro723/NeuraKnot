package http

import (
	"errors"
	"net/http"
	"time"

	"backend-go/internal/handler/http/request"
	"backend-go/internal/handler/http/response"
	llmpricingusecase "backend-go/internal/usecase/llmpricing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// LLMPricingHandler はLLM単価マスタのハンドラー
type LLMPricingHandler struct {
	usecase *llmpricingusecase.Usecase
}

// NewLLMPricingHandler はLLM単価ハンドラーを作成
func NewLLMPricingHandler(usecase *llmpricingusecase.Usecase) *LLMPricingHandler {
	return &LLMPricingHandler{usecase: usecase}
}

func mapPricingErrorStatus(err error) int {
	switch {
	case errors.Is(err, llmpricingusecase.ErrPricingNotFound):
		return http.StatusNotFound
	case errors.Is(err, llmpricingusecase.ErrPricingAlreadyExists):
		return http.StatusConflict
	case errors.Is(err, llmpricingusecase.ErrModelNotRegistered):
		return http.StatusBadRequest
	default:
		return http.StatusInternalServerError
	}
}

// ListCurrentPricing は全モデルの現行単価一覧を返す（認証ユーザー向け）
func (h *LLMPricingHandler) ListCurrentPricing(c *gin.Context) {
	pricings, err := h.usecase.ListCurrentPricing(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToLLMPricingListResponse(pricings))
}

// CreatePricing は初回単価を登録する（管理者向け）
func (h *LLMPricingHandler) CreatePricing(c *gin.Context) {
	var req request.CreateLLMPricingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	pricing, err := h.usecase.CreateInitialPricing(
		c.Request.Context(),
		req.Provider,
		req.Model,
		*req.PromptCostPer1M,
		*req.CompletionCostPer1M,
		req.Notes,
	)
	if err != nil {
		status := mapPricingErrorStatus(err)
		c.JSON(status, response.NewErrorResponse(err, status))
		return
	}

	c.JSON(http.StatusCreated, response.ToLLMPricingResponse(pricing))
}

// RevisePricing は単価を改定する（版追加・管理者向け）
func (h *LLMPricingHandler) RevisePricing(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid pricing ID"))
		return
	}

	var req request.ReviseLLMPricingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	effectiveFrom := time.Now()
	if req.EffectiveFrom != nil {
		effectiveFrom = *req.EffectiveFrom
	}

	pricing, err := h.usecase.RevisePricing(
		c.Request.Context(),
		id,
		*req.PromptCostPer1M,
		*req.CompletionCostPer1M,
		effectiveFrom,
		req.Notes,
	)
	if err != nil {
		status := mapPricingErrorStatus(err)
		c.JSON(status, response.NewErrorResponse(err, status))
		return
	}

	c.JSON(http.StatusCreated, response.ToLLMPricingResponse(pricing))
}

// GetPricingHistory は指定モデルの単価履歴を返す（管理者向け）
func (h *LLMPricingHandler) GetPricingHistory(c *gin.Context) {
	provider := c.Query("provider")
	model := c.Query("model")
	if provider == "" || model == "" {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("provider and model are required"))
		return
	}

	pricings, err := h.usecase.ListPricingHistory(c.Request.Context(), provider, model)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToLLMPricingListResponse(pricings))
}

// DeactivatePricing は単価を論理無効化する（管理者向け）
func (h *LLMPricingHandler) DeactivatePricing(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid pricing ID"))
		return
	}

	if err := h.usecase.DeactivatePricing(c.Request.Context(), id); err != nil {
		status := mapPricingErrorStatus(err)
		c.JSON(status, response.NewErrorResponse(err, status))
		return
	}

	c.Status(http.StatusNoContent)
}
