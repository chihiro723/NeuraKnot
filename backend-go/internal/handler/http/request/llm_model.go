package request

import "encoding/json"

type CreateLLMModelRequest struct {
	Provider          string          `json:"provider" binding:"required"`
	Model             string          `json:"model" binding:"required"`
	DisplayName       string          `json:"display_name" binding:"required"`
	IsEnabled         *bool           `json:"is_enabled,omitempty"`
	TemperatureMin    *float64        `json:"temperature_min,omitempty"`
	TemperatureMax    *float64        `json:"temperature_max,omitempty"`
	MaxTokensMin      *int            `json:"max_tokens_min,omitempty"`
	MaxTokensMax      *int            `json:"max_tokens_max,omitempty"`
	SupportsStreaming *bool           `json:"supports_streaming,omitempty"`
	Metadata          json.RawMessage `json:"metadata,omitempty"`

	// 任意: モデル作成と同時に初回単価を登録する（両方指定された場合のみ）
	InitialPromptCostPer1M     *float64 `json:"initial_prompt_cost_per_1m,omitempty"`
	InitialCompletionCostPer1M *float64 `json:"initial_completion_cost_per_1m,omitempty"`
}

type UpdateLLMModelEnabledRequest struct {
	IsEnabled *bool `json:"is_enabled" binding:"required"`
}

type UpdateLLMModelRequest struct {
	Provider          string   `json:"provider" binding:"required"`
	Model             string   `json:"model" binding:"required"`
	DisplayName       string   `json:"display_name" binding:"required"`
	TemperatureMin    *float64 `json:"temperature_min" binding:"required"`
	TemperatureMax    *float64 `json:"temperature_max" binding:"required"`
	MaxTokensMin      *int     `json:"max_tokens_min" binding:"required"`
	MaxTokensMax      *int     `json:"max_tokens_max" binding:"required"`
	SupportsStreaming *bool    `json:"supports_streaming" binding:"required"`
}
