package request

// CreateAgentRequest はAI Agent作成リクエスト
type CreateAgentRequest struct {
	Name             string  `json:"name" binding:"required"`
	PersonaType      string  `json:"persona_type" binding:"required"`
	Provider         string  `json:"provider"`
	Model            string  `json:"model"`
	Description      *string `json:"description"`
	StreamingEnabled *bool   `json:"streaming_enabled"` // nilの場合はtrueがデフォルト
}
