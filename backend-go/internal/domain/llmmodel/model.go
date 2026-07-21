package llmmodel

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrModelNotFound             = errors.New("llm model not found")
	ErrModelAlreadyExists        = errors.New("llm model already exists")
	ErrModelDisabled             = errors.New("llm model is disabled")
	ErrTemperatureOutOfRange     = errors.New("temperature is out of allowed range")
	ErrMaxTokensOutOfRange       = errors.New("max tokens is out of allowed range")
	ErrInvalidProvider           = errors.New("invalid provider")
	ErrInvalidModelID            = errors.New("invalid model")
	ErrInvalidDisplayName        = errors.New("invalid display name")
	ErrInvalidTemperatureSetting = errors.New("invalid temperature range setting")
	ErrInvalidMaxTokensSetting   = errors.New("invalid max tokens range setting")
	ErrInvalidExecutionLocation  = errors.New("invalid execution location")
)

// 実行場所（推論をどこで行うか）
const (
	// ExecutionLocationServer はサーバー(Python)で推論を実行する（openai/anthropic/google）
	ExecutionLocationServer = "server"
	// ExecutionLocationClient はブラウザ(WebLLM)で推論を実行する（webllm）
	ExecutionLocationClient = "client"
)

type Model struct {
	ID                uuid.UUID
	Provider          string
	Model             string
	DisplayName       string
	IsEnabled         bool
	TemperatureMin    float64
	TemperatureMax    float64
	MaxTokensMin      int
	MaxTokensMax      int
	SupportsStreaming bool
	// ExecutionLocation は推論の実行場所（server / client）
	ExecutionLocation string
	Metadata          []byte
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// IsClientRuntime は推論をクライアント(ブラウザ)で実行するモデルかどうかを返す。
func (m *Model) IsClientRuntime() bool {
	return m.ExecutionLocation == ExecutionLocationClient
}

func NewModel(
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
) (*Model, error) {
	// 実行場所が未指定の場合はサーバー実行をデフォルトとする
	if executionLocation == "" {
		executionLocation = ExecutionLocationServer
	}

	now := time.Now()
	m := &Model{
		ID:                uuid.New(),
		Provider:          provider,
		Model:             modelID,
		DisplayName:       displayName,
		IsEnabled:         isEnabled,
		TemperatureMin:    temperatureMin,
		TemperatureMax:    temperatureMax,
		MaxTokensMin:      maxTokensMin,
		MaxTokensMax:      maxTokensMax,
		SupportsStreaming: supportsStreaming,
		ExecutionLocation: executionLocation,
		Metadata:          metadata,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := m.Validate(); err != nil {
		return nil, err
	}

	return m, nil
}

func (m *Model) Validate() error {
	switch m.Provider {
	case "openai", "anthropic", "google", "webllm":
	default:
		return ErrInvalidProvider
	}

	switch m.ExecutionLocation {
	case ExecutionLocationServer, ExecutionLocationClient:
	default:
		return ErrInvalidExecutionLocation
	}

	// webllm はブラウザ実行専用、サーバー系プロバイダーはサーバー実行専用とする
	if m.Provider == "webllm" && m.ExecutionLocation != ExecutionLocationClient {
		return ErrInvalidExecutionLocation
	}
	if m.Provider != "webllm" && m.ExecutionLocation != ExecutionLocationServer {
		return ErrInvalidExecutionLocation
	}

	if m.Model == "" {
		return ErrInvalidModelID
	}

	if m.DisplayName == "" {
		return ErrInvalidDisplayName
	}

	if m.TemperatureMin < 0 || m.TemperatureMax > 2 || m.TemperatureMin > m.TemperatureMax {
		return ErrInvalidTemperatureSetting
	}

	if m.MaxTokensMin < 1 || m.MaxTokensMin > m.MaxTokensMax {
		return ErrInvalidMaxTokensSetting
	}

	return nil
}

func (m *Model) ValidateRuntimeConfig(temperature float64, maxTokens int) error {
	if !m.IsEnabled {
		return ErrModelDisabled
	}

	if temperature < m.TemperatureMin || temperature > m.TemperatureMax {
		return ErrTemperatureOutOfRange
	}

	if maxTokens < m.MaxTokensMin || maxTokens > m.MaxTokensMax {
		return ErrMaxTokensOutOfRange
	}

	return nil
}
