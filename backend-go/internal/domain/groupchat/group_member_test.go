package groupchat

import (
	"testing"

	"github.com/google/uuid"
)

// GroupMemberエンティティの仕様
// ============================================
// 【目的】
// - グループチャットに参加するAI Agentを表すエンティティ
// - グループ内でのAI Agentの表示順序を管理
//
// 【必須項目】
// 1. GroupChatID (uuid.UUID): グループチャットID（uuid.Nil不可）
// 2. AIAgentID (uuid.UUID): AI AgentのID（uuid.Nil不可）
// 3. DisplayOrder (int): 表示順序（0から始まる）
//
// 【関連データ（リレーション）】
// - AIAgentName (string): AI Agentの名前
// - AIAgentIcon (string): AI AgentのアイコンURL
// - AIAgentModel (string): AI Agentが使用するモデル
//
// 【メソッド】
// - UpdateDisplayOrder(order): 表示順序を更新
//
// 【使用箇所】
// - グループチャット画面でのメンバー表示
// - メンバー並び替え機能
// - グループ設定画面
// ============================================

func TestNewGroupMember(t *testing.T) {
	groupChatID := uuid.New()
	aiAgentID := uuid.New()

	tests := []struct {
		name         string
		groupChatID  uuid.UUID
		aiAgentID    uuid.UUID
		displayOrder int
		wantErr      bool
	}{
		{
			name:         "Valid group member",
			groupChatID:  groupChatID,
			aiAgentID:    aiAgentID,
			displayOrder: 0,
			wantErr:      false,
		},
		{
			name:         "Valid with display order 5",
			groupChatID:  groupChatID,
			aiAgentID:    aiAgentID,
			displayOrder: 5,
			wantErr:      false,
		},
		{
			name:         "Nil group chat ID",
			groupChatID:  uuid.Nil,
			aiAgentID:    aiAgentID,
			displayOrder: 0,
			wantErr:      true,
		},
		{
			name:         "Nil AI agent ID",
			groupChatID:  groupChatID,
			aiAgentID:    uuid.Nil,
			displayOrder: 0,
			wantErr:      true,
		},
		{
			name:         "Both nil",
			groupChatID:  uuid.Nil,
			aiAgentID:    uuid.Nil,
			displayOrder: 0,
			wantErr:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			member, err := NewGroupMember(tt.groupChatID, tt.aiAgentID, tt.displayOrder)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewGroupMember() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if member == nil {
					t.Fatal("Expected non-nil member for valid input")
				}

				// 入力値の確認
				if member.GroupChatID != tt.groupChatID {
					t.Errorf("GroupChatID = %v, want %v", member.GroupChatID, tt.groupChatID)
				}
				if member.AIAgentID != tt.aiAgentID {
					t.Errorf("AIAgentID = %v, want %v", member.AIAgentID, tt.aiAgentID)
				}
				if member.DisplayOrder != tt.displayOrder {
					t.Errorf("DisplayOrder = %d, want %d", member.DisplayOrder, tt.displayOrder)
				}

				// IDが生成されているか確認
				if member.ID == uuid.Nil {
					t.Error("ID should be generated")
				}

				// JoinedAtが設定されているか確認
				if member.JoinedAt.IsZero() {
					t.Error("JoinedAt should be set")
				}
			}
		})
	}
}

func TestGroupMemberUpdateDisplayOrder(t *testing.T) {
	groupChatID := uuid.New()
	aiAgentID := uuid.New()
	member, _ := NewGroupMember(groupChatID, aiAgentID, 0)

	// 初期値の確認
	if member.DisplayOrder != 0 {
		t.Errorf("Initial DisplayOrder = %d, want 0", member.DisplayOrder)
	}

	// 表示順序を更新
	member.UpdateDisplayOrder(3)

	// 更新されたか確認
	if member.DisplayOrder != 3 {
		t.Errorf("DisplayOrder = %d, want 3", member.DisplayOrder)
	}

	// さらに更新
	member.UpdateDisplayOrder(10)

	if member.DisplayOrder != 10 {
		t.Errorf("DisplayOrder = %d, want 10", member.DisplayOrder)
	}
}

func TestGroupMemberValidate(t *testing.T) {
	groupChatID := uuid.New()
	aiAgentID := uuid.New()

	tests := []struct {
		name    string
		member  *GroupMember
		wantErr bool
	}{
		{
			name: "Valid member",
			member: &GroupMember{
				ID:          uuid.New(),
				GroupChatID: groupChatID,
				AIAgentID:   aiAgentID,
			},
			wantErr: false,
		},
		{
			name: "Nil group chat ID",
			member: &GroupMember{
				ID:          uuid.New(),
				GroupChatID: uuid.Nil,
				AIAgentID:   aiAgentID,
			},
			wantErr: true,
		},
		{
			name: "Nil AI agent ID",
			member: &GroupMember{
				ID:          uuid.New(),
				GroupChatID: groupChatID,
				AIAgentID:   uuid.Nil,
			},
			wantErr: true,
		},
		{
			name: "Both nil",
			member: &GroupMember{
				ID:          uuid.New(),
				GroupChatID: uuid.Nil,
				AIAgentID:   uuid.Nil,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.member.Validate()

			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
