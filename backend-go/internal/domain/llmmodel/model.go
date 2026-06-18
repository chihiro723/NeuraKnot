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
	Metadata          []byte
	CreatedAt         time.Time
	UpdatedAt         time.Time
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
	metadata []byte,
) (*Model, error) {
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
	case "openai", "anthropic", "google":
	default:
		return ErrInvalidProvider
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
