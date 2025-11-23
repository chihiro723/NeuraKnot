package groupchat

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// GroupMember はグループチャットメンバーエンティティ
type GroupMember struct {
	ID           uuid.UUID
	GroupChatID  uuid.UUID
	AIAgentID    uuid.UUID
	DisplayOrder int
	JoinedAt     time.Time
	// 関連データ（リレーション）
	AIAgentName  string
	AIAgentIcon  string
	AIAgentModel string
}

// NewGroupMember は新しいグループメンバーを作成
func NewGroupMember(groupChatID, aiAgentID uuid.UUID, displayOrder int) (*GroupMember, error) {
	if groupChatID == uuid.Nil {
		return nil, errors.New("group chat ID is required")
	}
	if aiAgentID == uuid.Nil {
		return nil, errors.New("AI agent ID is required")
	}

	return &GroupMember{
		ID:           uuid.New(),
		GroupChatID:  groupChatID,
		AIAgentID:    aiAgentID,
		DisplayOrder: displayOrder,
		JoinedAt:     time.Now(),
	}, nil
}

// UpdateDisplayOrder は表示順序を更新
func (m *GroupMember) UpdateDisplayOrder(order int) {
	m.DisplayOrder = order
}

// Validate はメンバーのバリデーション
func (m *GroupMember) Validate() error {
	if m.GroupChatID == uuid.Nil {
		return errors.New("group chat ID is required")
	}
	if m.AIAgentID == uuid.Nil {
		return errors.New("AI agent ID is required")
	}
	return nil
}
