package response

import (
	"time"

	"backend-go/internal/domain/ai"
)

// AgentResponse はAI Agentレスポンス
type AgentResponse struct {
	ID           string  `json:"id"`
	UserID       string  `json:"user_id"`
	Name         string  `json:"name"`
	Description  *string `json:"description,omitempty"`
	AvatarURL    *string `json:"avatar_url,omitempty"`
	PersonaType  string  `json:"persona_type"`
	Provider     string  `json:"provider"`
	Model        string  `json:"model"`
	Temperature  float64 `json:"temperature"`
	MaxTokens    int     `json:"max_tokens"`
	SystemPrompt *string `json:"system_prompt,omitempty"`
	ToolsEnabled bool    `json:"tools_enabled"`
	MessageCount int     `json:"message_count"`
	LastChatAt   *string `json:"last_chat_at,omitempty"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

// ToAgentResponse はAI AgentエンティティをAgentResponseに変換
func ToAgentResponse(agent *ai.Agent) *AgentResponse {
	resp := &AgentResponse{
		ID:           agent.ID.String(),
		UserID:       agent.UserID.String(),
		Name:         agent.Name,
		Description:  agent.Description,
		AvatarURL:    agent.AvatarURL,
		PersonaType:  agent.PersonaType.String(),
		Provider:     agent.Provider.String(),
		Model:        agent.Model,
		Temperature:  agent.Temperature,
		MaxTokens:    agent.MaxTokens,
		SystemPrompt: agent.SystemPrompt,
		ToolsEnabled: agent.ToolsEnabled,
		MessageCount: agent.MessageCount,
		CreatedAt:    agent.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    agent.UpdatedAt.Format(time.RFC3339),
	}

	if agent.LastChatAt != nil {
		lastChatAt := agent.LastChatAt.Format(time.RFC3339)
		resp.LastChatAt = &lastChatAt
	}

	return resp
}

// AgentsResponse はAI Agentリストレスポンス
type AgentsResponse struct {
	Agents []*AgentResponse `json:"agents"`
	Total  int              `json:"total"`
}

// ToAgentsResponse はAI AgentリストをAgentsResponseに変換
func ToAgentsResponse(agents []*ai.Agent) *AgentsResponse {
	resp := make([]*AgentResponse, len(agents))
	for i, agent := range agents {
		resp[i] = ToAgentResponse(agent)
	}
	return &AgentsResponse{
		Agents: resp,
		Total:  len(resp),
	}
}
