package request

import "github.com/google/uuid"

// CreateGroupChatRequest はグループチャット作成リクエスト
type CreateGroupChatRequest struct {
	Name        string   `json:"name" binding:"required"`
	Description string   `json:"description"`
	IconURL     string   `json:"icon_url"`
	MemberIDs   []string `json:"member_ids" binding:"required,min=1"`
}

// ParseMemberIDs はメンバーIDをパース
func (r *CreateGroupChatRequest) ParseMemberIDs() ([]uuid.UUID, error) {
	ids := make([]uuid.UUID, 0, len(r.MemberIDs))
	for _, id := range r.MemberIDs {
		uid, err := uuid.Parse(id)
		if err != nil {
			return nil, err
		}
		ids = append(ids, uid)
	}
	return ids, nil
}

// UpdateGroupChatRequest はグループチャット更新リクエスト
type UpdateGroupChatRequest struct {
	Name         string `json:"name"`
	Description  string `json:"description"`
	IconURL      string `json:"icon_url"`
	SystemPrompt string `json:"system_prompt"`
}

// AddMemberRequest はメンバー追加リクエスト
type AddMemberRequest struct {
	AIAgentID string `json:"ai_agent_id" binding:"required"`
}

// ParseAIAgentID はAI Agent IDをパース
func (r *AddMemberRequest) ParseAIAgentID() (uuid.UUID, error) {
	return uuid.Parse(r.AIAgentID)
}

// ReorderMembersRequest はメンバー順序変更リクエスト
type ReorderMembersRequest struct {
	Orders map[string]int `json:"orders" binding:"required"` // memberID -> order
}

// ParseOrders は順序をパース
func (r *ReorderMembersRequest) ParseOrders() (map[uuid.UUID]int, error) {
	orders := make(map[uuid.UUID]int, len(r.Orders))
	for id, order := range r.Orders {
		uid, err := uuid.Parse(id)
		if err != nil {
			return nil, err
		}
		orders[uid] = order
	}
	return orders, nil
}

// MentionItem はメンション項目
type MentionItem struct {
	AIAgentID string `json:"ai_agent_id" binding:"required"`
	Order     int    `json:"order" binding:"required,min=1"`
}

// SendGroupMessageRequest はグループメッセージ送信リクエスト
type SendGroupMessageRequest struct {
	Content  string        `json:"content" binding:"required"`
	Mentions interface{}   `json:"mentions" binding:"required"` // "all" or []MentionItem
}

// GetGroupMessagesParams はグループメッセージ取得のクエリパラメータ
type GetGroupMessagesParams struct {
	Limit  int    `form:"limit"`
	Before string `form:"before"`
}

// ParseBefore はbeforeパラメータをパース
func (p *GetGroupMessagesParams) ParseBefore() (*uuid.UUID, error) {
	if p.Before == "" {
		return nil, nil
	}
	id, err := uuid.Parse(p.Before)
	if err != nil {
		return nil, err
	}
	return &id, nil
}
