package response

// EnhancePromptResponse はプロンプト強化レスポンス
type EnhancePromptResponse struct {
	EnhancedPrompt string                 `json:"enhanced_prompt"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
}
