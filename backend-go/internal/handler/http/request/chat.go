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

// GetMessagesParams はメッセージ取得のクエリパラメータ
type GetMessagesParams struct {
	Limit int `form:"limit"`
}

// ParseAIAgentID はAI Agent IDをパース
func (r *GetOrCreateConversationRequest) ParseAIAgentID() (uuid.UUID, error) {
	return uuid.Parse(r.AIAgentID)
}
