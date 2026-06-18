package http

import (
	"errors"
	"net/http"

	"backend-go/internal/domain/billing"
	"backend-go/internal/domain/llmmodel"
	"backend-go/internal/handler/http/request"
	"backend-go/internal/handler/http/response"
	llmmodelusecase "backend-go/internal/usecase/llmmodel"
	llmpricingusecase "backend-go/internal/usecase/llmpricing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type LLMModelHandler struct {
	usecase        *llmmodelusecase.Usecase
	pricingUsecase *llmpricingusecase.Usecase
}

func NewLLMModelHandler(usecase *llmmodelusecase.Usecase, pricingUsecase *llmpricingusecase.Usecase) *LLMModelHandler {
	return &LLMModelHandler{usecase: usecase, pricingUsecase: pricingUsecase}
}

func (h *LLMModelHandler) ListModels(c *gin.Context) {
	provider := c.Query("provider")
	enabledOnly := c.DefaultQuery("enabled", "true") != "false"

	var providerPtr *string
	if provider != "" {
		providerPtr = &provider
	}

	models, err := h.usecase.ListModels(c.Request.Context(), providerPtr, enabledOnly)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// 各モデルの現行単価を付与（取得失敗時は単価なしで返す）
	pricingByKey := make(map[string]*billing.LLMPricing)
	if pricings, perr := h.pricingUsecase.ListCurrentPricing(c.Request.Context()); perr == nil {
		for _, p := range pricings {
			pricingByKey[p.Provider+"\x00"+p.Model] = p
		}
	}

	c.JSON(http.StatusOK, response.ToLLMModelsResponseWithPricing(models, pricingByKey))
}

func (h *LLMModelHandler) CreateModel(c *gin.Context) {
	var req request.CreateLLMModelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	isEnabled := true
	if req.IsEnabled != nil {
		isEnabled = *req.IsEnabled
	}

	temperatureMin := 0.0
	if req.TemperatureMin != nil {
		temperatureMin = *req.TemperatureMin
	}

	temperatureMax := 2.0
	if req.TemperatureMax != nil {
		temperatureMax = *req.TemperatureMax
	}

	maxTokensMin := 100
	if req.MaxTokensMin != nil {
		maxTokensMin = *req.MaxTokensMin
	}

	maxTokensMax := 8000
	if req.MaxTokensMax != nil {
		maxTokensMax = *req.MaxTokensMax
	}

	supportsStreaming := true
	if req.SupportsStreaming != nil {
		supportsStreaming = *req.SupportsStreaming
	}

	metadata := []byte("{}")
	if len(req.Metadata) > 0 {
		metadata = req.Metadata
	}

	model, err := h.usecase.CreateModel(
		c.Request.Context(),
		req.Provider,
		req.Model,
		req.DisplayName,
		isEnabled,
		temperatureMin,
		temperatureMax,
		maxTokensMin,
		maxTokensMax,
		supportsStreaming,
		metadata,
	)
	if err != nil {
		status := http.StatusBadRequest
		if !errors.Is(err, llmmodel.ErrInvalidProvider) &&
			!errors.Is(err, llmmodel.ErrInvalidModelID) &&
			!errors.Is(err, llmmodel.ErrInvalidDisplayName) &&
			!errors.Is(err, llmmodel.ErrInvalidTemperatureSetting) &&
			!errors.Is(err, llmmodel.ErrInvalidMaxTokensSetting) &&
			!errors.Is(err, llmmodel.ErrModelAlreadyExists) {
			status = http.StatusInternalServerError
		}
		if errors.Is(err, llmmodel.ErrModelAlreadyExists) {
			status = http.StatusConflict
		}
		c.JSON(status, response.NewErrorResponse(err, status))
		return
	}

	resp := response.ToLLMModelResponse(model)

	// 初回単価が指定されていれば、同一フローで登録する（orchestration）。
	// 単価登録に失敗した場合は作成したモデルを取り消し、原子性を保つ。
	if req.InitialPromptCostPer1M != nil && req.InitialCompletionCostPer1M != nil {
		pricing, perr := h.pricingUsecase.CreateInitialPricing(
			c.Request.Context(),
			model.Provider,
			model.Model,
			*req.InitialPromptCostPer1M,
			*req.InitialCompletionCostPer1M,
			"",
		)
		if perr != nil {
			_ = h.usecase.DeleteModel(c.Request.Context(), model.ID)
			status := mapPricingErrorStatus(perr)
			c.JSON(status, response.NewErrorResponse(perr, status))
			return
		}
		resp.CurrentPricing = response.ToLLMPricingResponse(pricing)
	}

	c.JSON(http.StatusCreated, resp)
}

func (h *LLMModelHandler) UpdateModel(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid model ID"))
		return
	}

	var req request.UpdateLLMModelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}
	if req.TemperatureMin == nil || req.TemperatureMax == nil || req.MaxTokensMin == nil || req.MaxTokensMax == nil || req.SupportsStreaming == nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("provider/model/display_name/temperature/max_tokens/supports_streaming are required"))
		return
	}

	err = h.usecase.UpdateModel(
		c.Request.Context(),
		id,
		req.Provider,
		req.Model,
		req.DisplayName,
		*req.TemperatureMin,
		*req.TemperatureMax,
		*req.MaxTokensMin,
		*req.MaxTokensMax,
		*req.SupportsStreaming,
	)
	if err != nil {
		status := http.StatusInternalServerError
		switch {
		case errors.Is(err, llmmodel.ErrModelNotFound):
			status = http.StatusNotFound
		case errors.Is(err, llmmodel.ErrModelAlreadyExists):
			status = http.StatusConflict
		case errors.Is(err, llmmodel.ErrInvalidProvider),
			errors.Is(err, llmmodel.ErrInvalidModelID),
			errors.Is(err, llmmodel.ErrInvalidDisplayName),
			errors.Is(err, llmmodel.ErrInvalidTemperatureSetting),
			errors.Is(err, llmmodel.ErrInvalidMaxTokensSetting):
			status = http.StatusBadRequest
		}
		c.JSON(status, response.NewErrorResponse(err, status))
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *LLMModelHandler) UpdateModelEnabled(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid model ID"))
		return
	}

	var req request.UpdateLLMModelEnabledRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}
	if req.IsEnabled == nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("is_enabled is required"))
		return
	}

	if err := h.usecase.SetModelEnabled(c.Request.Context(), id, *req.IsEnabled); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, llmmodel.ErrModelNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, response.NewErrorResponse(err, status))
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *LLMModelHandler) DeleteModel(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid model ID"))
		return
	}

	if err := h.usecase.DeleteModel(c.Request.Context(), id); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, llmmodel.ErrModelNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, response.NewErrorResponse(err, status))
		return
	}

	c.Status(http.StatusNoContent)
}
