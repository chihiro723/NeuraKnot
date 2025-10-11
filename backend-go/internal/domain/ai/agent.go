package ai

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Agent はAI Agentエンティティ
type Agent struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	Name         string
	Description  *string
	AvatarURL    *string
	PersonaType  PersonaType
	Provider     Provider
	Model        string
	Temperature  float64
	MaxTokens    int
	SystemPrompt *string
	ToolsEnabled bool
	IsActive     bool
	MessageCount int
	LastChatAt   *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// NewAgent は新しいAI Agentを作成
func NewAgent(
	userID uuid.UUID,
	name string,
	personaType PersonaType,
	provider Provider,
	model string,
) (*Agent, error) {
	if userID == uuid.Nil {
		return nil, errors.New("user ID is required")
	}
	if name == "" {
		return nil, errors.New("name is required")
	}
	if !personaType.IsValid() {
		return nil, errors.New("invalid persona type")
	}
	if !provider.IsValid() {
		return nil, errors.New("invalid provider")
	}
	if model == "" {
		return nil, errors.New("model is required")
	}

	now := time.Now()
	return &Agent{
		ID:           uuid.New(),
		UserID:       userID,
		Name:         name,
		PersonaType:  personaType,
		Provider:     provider,
		Model:        model,
		Temperature:  0.7,
		MaxTokens:    2000,
		ToolsEnabled: true,
		IsActive:     true,
		MessageCount: 0,
		CreatedAt:    now,
		UpdatedAt:    now,
	}, nil
}

// GetSystemPrompt はシステムプロンプトを取得（カスタムがなければデフォルト）
func (a *Agent) GetSystemPrompt() string {
	if a.SystemPrompt != nil && *a.SystemPrompt != "" {
		return *a.SystemPrompt
	}
	return DefaultSystemPrompts[a.PersonaType]
}

// SetSystemPrompt はカスタムシステムプロンプトを設定
func (a *Agent) SetSystemPrompt(prompt string) {
	if prompt == "" {
		a.SystemPrompt = nil
	} else {
		a.SystemPrompt = &prompt
	}
	a.UpdatedAt = time.Now()
}

// SetDescription は説明を設定
func (a *Agent) SetDescription(description string) {
	if description == "" {
		a.Description = nil
	} else {
		a.Description = &description
	}
	a.UpdatedAt = time.Now()
}

// IncrementMessageCount はメッセージカウントをインクリメント
func (a *Agent) IncrementMessageCount() {
	a.MessageCount++
	now := time.Now()
	a.LastChatAt = &now
	a.UpdatedAt = now
}

// Validate はAgentのバリデーション
func (a *Agent) Validate() error {
	if a.UserID == uuid.Nil {
		return errors.New("user ID is required")
	}
	if a.Name == "" {
		return errors.New("name is required")
	}
	if !a.PersonaType.IsValid() {
		return errors.New("invalid persona type")
	}
	if !a.Provider.IsValid() {
		return errors.New("invalid provider")
	}
	if a.Model == "" {
		return errors.New("model is required")
	}
	if a.Temperature < 0 || a.Temperature > 2 {
		return errors.New("temperature must be between 0 and 2")
	}
	if a.MaxTokens < 100 || a.MaxTokens > 8000 {
		return errors.New("max tokens must be between 100 and 8000")
	}
	return nil
}
