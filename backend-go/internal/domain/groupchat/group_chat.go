package groupchat

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// GroupChat はグループチャットエンティティ
type GroupChat struct {
	ID            uuid.UUID
	UserID        uuid.UUID
	Name          string
	Description   string
	IconURL       string
	SystemPrompt  string     // グループ共通のシステムプロンプト
	MessageCount  int
	LastMessageAt *time.Time
	IsActive      bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
	// 関連データ（リレーション）
	Members     []*GroupMember
	LastMessage *GroupMessage // 最後のメッセージ（リスト表示用）
}

// NewGroupChat は新しいグループチャットを作成
func NewGroupChat(userID uuid.UUID, name, description string) (*GroupChat, error) {
	if userID == uuid.Nil {
		return nil, errors.New("user ID is required")
	}
	if name == "" {
		return nil, errors.New("name is required")
	}

	now := time.Now()
	return &GroupChat{
		ID:           uuid.New(),
		UserID:       userID,
		Name:         name,
		Description:  description,
		MessageCount: 0,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}, nil
}

// Update はグループチャット情報を更新
func (g *GroupChat) Update(name, description, iconURL, systemPrompt string) error {
	if name != "" {
		g.Name = name
	}
	if description != "" {
		g.Description = description
	}
	if iconURL != "" {
		g.IconURL = iconURL
	}
	// システムプロンプトは空文字列も許可（空にすることで削除可能）
	g.SystemPrompt = systemPrompt
	g.UpdatedAt = time.Now()
	return nil
}

// IncrementMessageCount はメッセージカウントをインクリメント
func (g *GroupChat) IncrementMessageCount() {
	g.MessageCount++
	now := time.Now()
	g.LastMessageAt = &now
	g.UpdatedAt = now
}

// Deactivate はグループチャットを無効化
func (g *GroupChat) Deactivate() {
	g.IsActive = false
	g.UpdatedAt = time.Now()
}

// Validate はグループチャットのバリデーション
func (g *GroupChat) Validate() error {
	if g.UserID == uuid.Nil {
		return errors.New("user ID is required")
	}
	if g.Name == "" {
		return errors.New("name is required")
	}
	if len(g.Members) == 0 {
		return errors.New("at least one member is required")
	}
	return nil
}
