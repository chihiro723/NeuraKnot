package request

import "github.com/google/uuid"

// GetOrCreateConversationRequest は会話取得/作成リクエスト
type GetOrCreateConversationRequest struct {
	AIAgentID string `json:"ai_agent_id" binding:"required"`
}

// SendMessageRequest はメッセージ送信リクエスト
type SendMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

// CompleteClientInferenceRequest はクライアント(ブラウザ WebLLM)で生成した
// AI 応答を保存するためのリクエスト。
type CompleteClientInferenceRequest struct {
	// Content は生成された AI 応答本文
	Content string `json:"content" binding:"required"`
	// PromptTokens / CompletionTokens は WebLLM が返す使用トークン数（任意）
	PromptTokens     int `json:"prompt_tokens,omitempty"`
	CompletionTokens int `json:"completion_tokens,omitempty"`
	// ProcessingTimeMs は生成にかかった時間（任意）
	ProcessingTimeMs int `json:"processing_time_ms,omitempty"`
}

// GetMessagesParams はメッセージ取得のクエリパラメータ
type GetMessagesParams struct {
	Limit int `form:"limit"`
}

// UpdateToolPositionsRequest はツール位置情報更新リクエスト
type UpdateToolPositionsRequest struct {
	Positions map[string]int `json:"positions" binding:"required"` // ToolUsageID -> InsertPosition
}

// SendAgentIntroductionRequest はAIエージェント自己紹介送信リクエスト
type SendAgentIntroductionRequest struct {
	AIAgentID string `json:"ai_agent_id" binding:"required"`
	Message   string `json:"message" binding:"required"`
}

// ParseAIAgentID はAI Agent IDをパース
func (r *GetOrCreateConversationRequest) ParseAIAgentID() (uuid.UUID, error) {
	return uuid.Parse(r.AIAgentID)
}
