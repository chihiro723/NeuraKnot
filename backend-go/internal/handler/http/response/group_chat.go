package response

import (
	"time"

	"backend-go/internal/domain/groupchat"
)

// GroupMemberResponse はグループメンバーレスポンス
type GroupMemberResponse struct {
	ID           string `json:"id"`
	GroupChatID  string `json:"group_chat_id"`
	AIAgentID    string `json:"ai_agent_id"`
	AIAgentName  string `json:"ai_agent_name"`
	AIAgentIcon  string `json:"ai_agent_icon"`
	AIAgentModel string `json:"ai_agent_model"`
	DisplayOrder int    `json:"display_order"`
	JoinedAt     string `json:"joined_at"`
}

// ToGroupMemberResponse はグループメンバーエンティティをGroupMemberResponseに変換
func ToGroupMemberResponse(member *groupchat.GroupMember) *GroupMemberResponse {
	return &GroupMemberResponse{
		ID:           member.ID.String(),
		GroupChatID:  member.GroupChatID.String(),
		AIAgentID:    member.AIAgentID.String(),
		AIAgentName:  member.AIAgentName,
		AIAgentIcon:  member.AIAgentIcon,
		AIAgentModel: member.AIAgentModel,
		DisplayOrder: member.DisplayOrder,
		JoinedAt:     member.JoinedAt.Format(time.RFC3339),
	}
}

// LastMessageResponse はグループチャットの最後のメッセージ
type LastMessageResponse struct {
	Content    string `json:"content"`
	SenderType string `json:"sender_type"`
	SenderName string `json:"sender_name"`
}

// GroupChatResponse はグループチャットレスポンス
type GroupChatResponse struct {
	ID            string                 `json:"id"`
	UserID        string                 `json:"user_id"`
	Name          string                 `json:"name"`
	Description   string                 `json:"description"`
	IconURL       string                 `json:"icon_url"`
	SystemPrompt  string                 `json:"system_prompt"`
	MessageCount  int                    `json:"message_count"`
	LastMessageAt *string                `json:"last_message_at,omitempty"`
	LastMessage   *LastMessageResponse   `json:"last_message,omitempty"`
	IsActive      bool                   `json:"is_active"`
	Members       []*GroupMemberResponse `json:"members"`
	CreatedAt     string                 `json:"created_at"`
	UpdatedAt     string                 `json:"updated_at"`
}

// ToGroupChatResponse はグループチャットエンティティをGroupChatResponseに変換
func ToGroupChatResponse(gc *groupchat.GroupChat) *GroupChatResponse {
	resp := &GroupChatResponse{
		ID:           gc.ID.String(),
		UserID:       gc.UserID.String(),
		Name:         gc.Name,
		Description:  gc.Description,
		IconURL:      gc.IconURL,
		SystemPrompt: gc.SystemPrompt,
		MessageCount: gc.MessageCount,
		IsActive:     gc.IsActive,
		CreatedAt:    gc.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    gc.UpdatedAt.Format(time.RFC3339),
	}

	if gc.LastMessageAt != nil {
		lastMessageAt := gc.LastMessageAt.Format(time.RFC3339)
		resp.LastMessageAt = &lastMessageAt
	}

	// 最後のメッセージを変換
	if gc.LastMessage != nil {
		resp.LastMessage = &LastMessageResponse{
			Content:    gc.LastMessage.Content,
			SenderType: string(gc.LastMessage.SenderType),
			SenderName: gc.LastMessage.SenderName,
		}
	}

	// メンバーを変換
	if len(gc.Members) > 0 {
		resp.Members = make([]*GroupMemberResponse, len(gc.Members))
		for i, member := range gc.Members {
			resp.Members[i] = ToGroupMemberResponse(member)
		}
	}

	return resp
}

// GroupChatsListResponse はグループチャットリストレスポンス
type GroupChatsListResponse struct {
	GroupChats []*GroupChatResponse `json:"group_chats"`
	Total      int                  `json:"total"`
}

// ToGroupChatsListResponse はグループチャットリストをGroupChatsListResponseに変換
func ToGroupChatsListResponse(groupChats []*groupchat.GroupChat) *GroupChatsListResponse {
	resp := make([]*GroupChatResponse, len(groupChats))
	for i, gc := range groupChats {
		resp[i] = ToGroupChatResponse(gc)
	}
	return &GroupChatsListResponse{
		GroupChats: resp,
		Total:      len(resp),
	}
}

// GroupMessageResponse はグループメッセージレスポンス
type GroupMessageResponse struct {
	ID               string               `json:"id"`
	GroupChatID      string               `json:"group_chat_id"`
	SenderType       string               `json:"sender_type"`
	SenderID         string               `json:"sender_id"`
	SenderName       string               `json:"sender_name"`
	SenderIcon       string               `json:"sender_icon"`
	Content          string               `json:"content"`
	ParentMessageID  *string              `json:"parent_message_id,omitempty"`
	AISessionID      *string              `json:"ai_session_id,omitempty"`
	ProcessingStatus string               `json:"processing_status"`
	CreatedAt        string               `json:"created_at"`
	ToolUsages       []*ToolUsageResponse `json:"tool_usages,omitempty"`
}

// ToGroupMessageResponse はグループメッセージエンティティをGroupMessageResponseに変換
func ToGroupMessageResponse(msg *groupchat.GroupMessage) *GroupMessageResponse {
	resp := &GroupMessageResponse{
		ID:               msg.ID.String(),
		GroupChatID:      msg.GroupChatID.String(),
		SenderType:       string(msg.SenderType),
		SenderID:         msg.SenderID.String(),
		SenderName:       msg.SenderName,
		SenderIcon:       msg.SenderIcon,
		Content:          msg.Content,
		ProcessingStatus: string(msg.ProcessingStatus),
		CreatedAt:        msg.CreatedAt.Format(time.RFC3339),
	}

	if msg.ParentMessageID != nil {
		parentID := msg.ParentMessageID.String()
		resp.ParentMessageID = &parentID
	}

	if msg.AISessionID != nil {
		sessionID := msg.AISessionID.String()
		resp.AISessionID = &sessionID
	}

	// ツール使用情報を追加
	if len(msg.ToolUsages) > 0 {
		resp.ToolUsages = make([]*ToolUsageResponse, len(msg.ToolUsages))
		for i, tu := range msg.ToolUsages {
			resp.ToolUsages[i] = ToToolUsageResponse(tu)
		}
	}

	return resp
}

// GroupMessagesResponse はグループメッセージリストレスポンス
type GroupMessagesResponse struct {
	Messages []*GroupMessageResponse `json:"messages"`
	Total    int                     `json:"total"`
}

// ToGroupMessagesResponse はグループメッセージリストをGroupMessagesResponseに変換
func ToGroupMessagesResponse(messages []*groupchat.GroupMessage) *GroupMessagesResponse {
	resp := make([]*GroupMessageResponse, len(messages))
	for i, msg := range messages {
		resp[i] = ToGroupMessageResponse(msg)
	}
	return &GroupMessagesResponse{
		Messages: resp,
		Total:    len(resp),
	}
}

// TokenUsage はトークン使用量
type TokenUsage struct {
	Prompt     int `json:"prompt"`
	Completion int `json:"completion"`
	Total      int `json:"total"`
}

// SuggestedQuestionsResponse は質問候補生成レスポンス
type SuggestedQuestionsResponse struct {
	Suggestions []string               `json:"suggestions"`
	TokenUsage  *TokenUsage            `json:"token_usage,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}
