package response

import (
	"time"

	"backend-go/internal/domain/conversation"
)

// ConversationResponse は会話レスポンス
type ConversationResponse struct {
	ID            string  `json:"id"`
	UserID        string  `json:"user_id"`
	AIAgentID     string  `json:"ai_agent_id"`
	MessageCount  int     `json:"message_count"`
	LastMessageAt *string `json:"last_message_at,omitempty"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     string  `json:"updated_at"`
}

// ToConversationResponse は会話エンティティをConversationResponseに変換
func ToConversationResponse(conv *conversation.Conversation) *ConversationResponse {
	resp := &ConversationResponse{
		ID:           conv.ID.String(),
		UserID:       conv.UserID.String(),
		AIAgentID:    conv.AIAgentID.String(),
		MessageCount: conv.MessageCount,
		CreatedAt:    conv.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    conv.UpdatedAt.Format(time.RFC3339),
	}

	if conv.LastMessageAt != nil {
		lastMessageAt := conv.LastMessageAt.Format(time.RFC3339)
		resp.LastMessageAt = &lastMessageAt
	}

	return resp
}

// ToolUsageResponse はツール使用履歴レスポンス
type ToolUsageResponse struct {
	ID              string  `json:"id"`
	ToolName        string  `json:"tool_name"`
	ToolCategory    string  `json:"tool_category"`
	InputData       string  `json:"input_data"`
	OutputData      *string `json:"output_data,omitempty"`
	Status          string  `json:"status"`
	ErrorMessage    *string `json:"error_message,omitempty"`
	ExecutionTimeMs *int    `json:"execution_time_ms,omitempty"`
	InsertPosition  *int    `json:"insert_position,omitempty"`
	ExecutedAt      string  `json:"executed_at"`
}

// MessageResponse はメッセージレスポンス
type MessageResponse struct {
	ID             string               `json:"id"`
	ConversationID string               `json:"conversation_id"`
	SenderType     string               `json:"sender_type"`
	SenderID       string               `json:"sender_id"`
	Content        string               `json:"content"`
	AISessionID    *string              `json:"ai_session_id,omitempty"`
	ToolUsages     []*ToolUsageResponse `json:"tool_usages,omitempty"`
	CreatedAt      string               `json:"created_at"`
}

// ToMessageResponse はメッセージエンティティをMessageResponseに変換
func ToMessageResponse(msg *conversation.Message) *MessageResponse {
	resp := &MessageResponse{
		ID:             msg.ID.String(),
		ConversationID: msg.ConversationID.String(),
		SenderType:     msg.SenderType.String(),
		SenderID:       msg.SenderID.String(),
		Content:        msg.Content,
		CreatedAt:      msg.CreatedAt.Format(time.RFC3339),
	}

	if msg.AISessionID != nil {
		sessionID := msg.AISessionID.String()
		resp.AISessionID = &sessionID
	}

	return resp
}

// ToMessageResponseWithTools はメッセージエンティティをツール使用履歴付きのMessageResponseに変換
func ToMessageResponseWithTools(msg *conversation.Message, toolUsages []*conversation.ToolUsage) *MessageResponse {
	resp := ToMessageResponse(msg)

	if len(toolUsages) > 0 {
		resp.ToolUsages = make([]*ToolUsageResponse, len(toolUsages))
		for i, tu := range toolUsages {
			resp.ToolUsages[i] = &ToolUsageResponse{
				ID:              tu.ID.String(),
				ToolName:        tu.ToolName,
				ToolCategory:    string(tu.ToolCategory),
				InputData:       string(tu.InputData),
				OutputData:      tu.OutputData,
				Status:          string(tu.Status),
				ErrorMessage:    tu.ErrorMessage,
				ExecutionTimeMs: tu.ExecutionTimeMs,
				InsertPosition:  tu.InsertPosition,
				ExecutedAt:      tu.ExecutedAt.Format(time.RFC3339),
			}
		}
	}

	return resp
}

// MessagesResponse はメッセージリストレスポンス
type MessagesResponse struct {
	Messages []*MessageResponse `json:"messages"`
	Total    int                `json:"total"`
}

// ToMessagesResponse はメッセージリストをMessagesResponseに変換
func ToMessagesResponse(messages []*conversation.Message) *MessagesResponse {
	resp := make([]*MessageResponse, len(messages))
	for i, msg := range messages {
		resp[i] = ToMessageResponse(msg)
	}
	return &MessagesResponse{
		Messages: resp,
		Total:    len(resp),
	}
}

// SendMessageResponse はメッセージ送信レスポンス
type SendMessageResponse struct {
	UserMessage *MessageResponse `json:"user_message"`
	AIMessage   *MessageResponse `json:"ai_message"`
	Metadata    interface{}      `json:"metadata"`
}

// ConversationWithDetailsResponse は会話詳細レスポンス（最終メッセージ付き）
type ConversationWithDetailsResponse struct {
	ID            string           `json:"id"`
	UserID        string           `json:"user_id"`
	AIAgentID     string           `json:"ai_agent_id"`
	AIAgentName   string           `json:"ai_agent_name"`
	AIAgentAvatar *string          `json:"ai_agent_avatar,omitempty"`
	MessageCount  int              `json:"message_count"`
	LastMessage   *MessageResponse `json:"last_message,omitempty"`
	CreatedAt     string           `json:"created_at"`
	UpdatedAt     string           `json:"updated_at"`
}

// ConversationsListResponse は会話一覧レスポンス
type ConversationsListResponse struct {
	Conversations []*ConversationWithDetailsResponse `json:"conversations"`
	Total         int                                `json:"total"`
}

// ToConversationsListResponse は会話一覧をConversationsListResponseに変換
func ToConversationsListResponse(conversations []*conversation.Conversation) *ConversationsListResponse {
	resp := make([]*ConversationWithDetailsResponse, len(conversations))
	for i, conv := range conversations {
		resp[i] = &ConversationWithDetailsResponse{
			ID:           conv.ID.String(),
			UserID:       conv.UserID.String(),
			AIAgentID:    conv.AIAgentID.String(),
			MessageCount: conv.MessageCount,
			CreatedAt:    conv.CreatedAt.Format(time.RFC3339),
			UpdatedAt:    conv.UpdatedAt.Format(time.RFC3339),
		}
	}
	return &ConversationsListResponse{
		Conversations: resp,
		Total:         len(resp),
	}
}
