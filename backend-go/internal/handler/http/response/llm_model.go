package response

import (
	"encoding/json"
	"time"

	"backend-go/internal/domain/billing"
	"backend-go/internal/domain/llmmodel"
)

type LLMModelResponse struct {
	ID                string              `json:"id"`
	Provider          string              `json:"provider"`
	Model             string              `json:"model"`
	DisplayName       string              `json:"display_name"`
	IsEnabled         bool                `json:"is_enabled"`
	TemperatureMin    float64             `json:"temperature_min"`
	TemperatureMax    float64             `json:"temperature_max"`
	MaxTokensMin      int                 `json:"max_tokens_min"`
	MaxTokensMax      int                 `json:"max_tokens_max"`
	SupportsStreaming bool                `json:"supports_streaming"`
	Metadata          json.RawMessage     `json:"metadata"`
	CurrentPricing    *LLMPricingResponse `json:"current_pricing"`
	CreatedAt         string              `json:"created_at"`
	UpdatedAt         string              `json:"updated_at"`
}

type LLMModelsResponse struct {
	Models []*LLMModelResponse `json:"models"`
	Total  int                 `json:"total"`
}

func ToLLMModelResponse(model *llmmodel.Model) *LLMModelResponse {
	metadata := json.RawMessage(model.Metadata)
	if len(metadata) == 0 {
		metadata = json.RawMessage("{}")
	}

	return &LLMModelResponse{
		ID:                model.ID.String(),
		Provider:          model.Provider,
		Model:             model.Model,
		DisplayName:       model.DisplayName,
		IsEnabled:         model.IsEnabled,
		TemperatureMin:    model.TemperatureMin,
		TemperatureMax:    model.TemperatureMax,
		MaxTokensMin:      model.MaxTokensMin,
		MaxTokensMax:      model.MaxTokensMax,
		SupportsStreaming: model.SupportsStreaming,
		Metadata:          metadata,
		CreatedAt:         model.CreatedAt.Format(time.RFC3339),
		UpdatedAt:         model.UpdatedAt.Format(time.RFC3339),
	}
}

func ToLLMModelsResponse(models []*llmmodel.Model) *LLMModelsResponse {
	resp := make([]*LLMModelResponse, len(models))
	for i, model := range models {
		resp[i] = ToLLMModelResponse(model)
	}

	return &LLMModelsResponse{
		Models: resp,
		Total:  len(resp),
	}
}

// ToLLMModelsResponseWithPricing はモデル一覧に現行単価を付与して返す。
// pricingByKey のキーは "provider\x00model"。
func ToLLMModelsResponseWithPricing(models []*llmmodel.Model, pricingByKey map[string]*billing.LLMPricing) *LLMModelsResponse {
	resp := make([]*LLMModelResponse, len(models))
	for i, model := range models {
		item := ToLLMModelResponse(model)
		if p, ok := pricingByKey[model.Provider+"\x00"+model.Model]; ok {
			item.CurrentPricing = ToLLMPricingResponse(p)
		}
		resp[i] = item
	}

	return &LLMModelsResponse{
		Models: resp,
		Total:  len(resp),
	}
}
