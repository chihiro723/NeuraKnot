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
	StreamingEnabled *bool                  `json:"streaming_enabled"`  // nilの場合はtrueがデフォルト
	Services         []ServiceConfigRequest `json:"services,omitempty"` // サービス設定
}
