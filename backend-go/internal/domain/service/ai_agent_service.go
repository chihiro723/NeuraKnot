package service

import (
	"time"

	"github.com/google/uuid"
)

// AIAgentService AI Agentとサービスの紐付け
type AIAgentService struct {
	ID                uuid.UUID `json:"id"`
	AIAgentID         uuid.UUID `json:"ai_agent_id"`
	ServiceClass      string    `json:"service_class"`
	ToolSelectionMode string    `json:"tool_selection_mode"` // "all" or "selected"
	SelectedTools     []string  `json:"selected_tools"`
	Enabled           bool      `json:"enabled"`
	CreatedAt         time.Time `json:"created_at"`
}

// AIAgentServiceRepository AI Agentとサービスの紐付けリポジトリインターフェース
type AIAgentServiceRepository interface {
	Create(agentService *AIAgentService) error
	FindByAgentID(agentID uuid.UUID) ([]AIAgentService, error)
	FindByAgentAndClass(agentID uuid.UUID, serviceClass string) (*AIAgentService, error)
	Update(agentService *AIAgentService) error
	Delete(id uuid.UUID) error
	DeleteByAgentID(agentID uuid.UUID) error
}

// CreateAIAgentServiceInput AI Agentサービス紐付け作成時の入力
type CreateAIAgentServiceInput struct {
	ServiceClass      string   `json:"service_class" binding:"required"`
	ToolSelectionMode string   `json:"tool_selection_mode"` // "all" or "selected"
	SelectedTools     []string `json:"selected_tools"`
	Enabled           bool     `json:"enabled"`
}

// UpdateAIAgentServiceInput AI Agentサービス紐付け更新時の入力
type UpdateAIAgentServiceInput struct {
	ToolSelectionMode string   `json:"tool_selection_mode"`
	SelectedTools     []string `json:"selected_tools"`
	Enabled           *bool    `json:"enabled"`
}











