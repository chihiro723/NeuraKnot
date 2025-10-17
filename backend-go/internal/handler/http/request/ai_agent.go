package request

// ServiceConfigRequest はAI Agentのサービス設定リクエスト
type ServiceConfigRequest struct {
	ServiceClass      string   `json:"service_class" binding:"required"`
	ToolSelectionMode string   `json:"tool_selection_mode" binding:"required"` // "all" or "selected"
	SelectedTools     []string `json:"selected_tools,omitempty"`
}

// CreateAgentRequest はAI Agent作成リクエスト
type CreateAgentRequest struct {
	Name             string                 `json:"name" binding:"required"`
	PersonaType      string                 `json:"persona_type" binding:"required"`
	Provider         string                 `json:"provider"`
	Model            string                 `json:"model"`
	Description      *string                `json:"description"`
	SystemPrompt     *string                `json:"system_prompt"`      // カスタムシステムプロンプト
	StreamingEnabled *bool                  `json:"streaming_enabled"`  // nilの場合はtrueがデフォルト
	Services         []ServiceConfigRequest `json:"services,omitempty"` // サービス設定
}

// UpdateAgentRequest はAI Agent更新リクエスト
type UpdateAgentRequest struct {
	Name             *string  `json:"name,omitempty"`
	Description      *string  `json:"description,omitempty"`
	AvatarURL        *string  `json:"avatar_url,omitempty"`
	PersonaType      *string  `json:"persona_type,omitempty"`
	Provider         *string  `json:"provider,omitempty"`
	Model            *string  `json:"model,omitempty"`
	Temperature      *float64 `json:"temperature,omitempty"`
	MaxTokens        *int     `json:"max_tokens,omitempty"`
	SystemPrompt     *string  `json:"system_prompt,omitempty"`
	ToolsEnabled     *bool    `json:"tools_enabled,omitempty"`
	StreamingEnabled *bool    `json:"streaming_enabled,omitempty"`
}
