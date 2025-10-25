package request

// EnhancePromptRequest はプロンプト強化リクエスト
type EnhancePromptRequest struct {
	CurrentPrompt string `json:"current_prompt" binding:"required,max=5000"`
}
