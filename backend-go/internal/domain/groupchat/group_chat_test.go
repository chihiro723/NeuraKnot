package groupchat

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

// GroupChatエンティティの仕様
// ============================================
// 【目的】
// - 複数のAI Agentが参加するグループチャットを表すエンティティ
// - ユーザーが複数のAIと同時に会話できる機能
//
// 【必須項目】
// 1. UserID (uuid.UUID): グループ作成者のユーザーID（uuid.Nil不可）
// 2. Name (string): グループ名（空文字不可）
//
// 【オプション項目】
// - Description (string): グループの説明
// - IconURL (string): グループアイコンのURL
// - SystemPrompt (string): グループ共通のシステムプロンプト
//
// 【管理データ】
// - MessageCount (int): メッセージ数
// - LastMessageAt (*time.Time): 最後のメッセージ送信日時
// - IsActive (bool): グループが有効か（デフォルト: true）
// - Members ([]*GroupMember): メンバー（AI Agent）のリスト
//
// 【メソッド】
// - Update(name, description, iconURL, systemPrompt): 情報更新
// - IncrementMessageCount(): メッセージ数を増やす
// - Deactivate(): グループを無効化
//
// 【バリデーション】
// - Membersが最低1つ必要（空のグループは不可）
//
// 【使用箇所】
// - グループチャット一覧画面
// - 複数AIとの会話機能
// - グループ設定画面
// ============================================

func TestNewGroupChat(t *testing.T) {
	userID := uuid.New()

	tests := []struct {
		name        string
		userID      uuid.UUID
		groupName   string
		description string
		wantErr     bool
	}{
		{
			name:        "Valid group chat",
			userID:      userID,
			groupName:   "AI Team",
			description: "My AI team",
			wantErr:     false,
		},
		{
			name:        "Valid without description",
			userID:      userID,
			groupName:   "Test Group",
			description: "",
			wantErr:     false,
		},
		{
			name:        "Nil user ID",
			userID:      uuid.Nil,
			groupName:   "Test Group",
			description: "Test",
			wantErr:     true,
		},
		{
			name:        "Empty name",
			userID:      userID,
			groupName:   "",
			description: "Test",
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			groupChat, err := NewGroupChat(tt.userID, tt.groupName, tt.description)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewGroupChat() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if groupChat == nil {
					t.Fatal("Expected non-nil group chat for valid input")
				}

				// デフォルト値の確認
				if groupChat.MessageCount != 0 {
					t.Errorf("MessageCount = %d, want 0", groupChat.MessageCount)
				}
				if groupChat.LastMessageAt != nil {
					t.Error("LastMessageAt should be nil initially")
				}
				if !groupChat.IsActive {
					t.Error("IsActive should be true by default")
				}
				if groupChat.IconURL != "" {
					t.Error("IconURL should be empty by default")
				}
				if groupChat.SystemPrompt != "" {
					t.Error("SystemPrompt should be empty by default")
				}

				// 入力値の確認
				if groupChat.UserID != tt.userID {
					t.Errorf("UserID = %v, want %v", groupChat.UserID, tt.userID)
				}
				if groupChat.Name != tt.groupName {
					t.Errorf("Name = %q, want %q", groupChat.Name, tt.groupName)
				}
				if groupChat.Description != tt.description {
					t.Errorf("Description = %q, want %q", groupChat.Description, tt.description)
				}

				// IDが生成されているか確認
				if groupChat.ID == uuid.Nil {
					t.Error("ID should be generated")
				}
			}
		})
	}
}

func TestGroupChatUpdate(t *testing.T) {
	userID := uuid.New()
	groupChat, _ := NewGroupChat(userID, "Original Name", "Original Description")

	originalUpdatedAt := groupChat.UpdatedAt
	time.Sleep(10 * time.Millisecond)

	// 更新
	err := groupChat.Update(
		"New Name",
		"New Description",
		"https://example.com/icon.png",
		"You are a helpful AI team",
	)

	if err != nil {
		t.Fatalf("Update() unexpected error: %v", err)
	}

	// 値が更新されているか確認
	if groupChat.Name != "New Name" {
		t.Errorf("Name = %q, want %q", groupChat.Name, "New Name")
	}
	if groupChat.Description != "New Description" {
		t.Errorf("Description = %q, want %q", groupChat.Description, "New Description")
	}
	if groupChat.IconURL != "https://example.com/icon.png" {
		t.Errorf("IconURL = %q, want %q", groupChat.IconURL, "https://example.com/icon.png")
	}
	if groupChat.SystemPrompt != "You are a helpful AI team" {
		t.Errorf("SystemPrompt = %q, want %q", groupChat.SystemPrompt, "You are a helpful AI team")
	}

	// UpdatedAtが更新されているか確認
	if !groupChat.UpdatedAt.After(originalUpdatedAt) {
		t.Error("UpdatedAt should be updated after Update()")
	}
}

func TestGroupChatUpdatePartial(t *testing.T) {
	userID := uuid.New()
	groupChat, _ := NewGroupChat(userID, "Original Name", "Original Description")

	// 一部のフィールドのみ更新（空文字を渡す）
	err := groupChat.Update("", "New Description Only", "", "")

	if err != nil {
		t.Fatalf("Update() unexpected error: %v", err)
	}

	// 空文字を渡したフィールドは更新されない（Nameは元のまま）
	if groupChat.Name != "Original Name" {
		t.Errorf("Name = %q, should not be updated with empty string", groupChat.Name)
	}

	// 空でない値を渡したフィールドは更新される
	if groupChat.Description != "New Description Only" {
		t.Errorf("Description = %q, want %q", groupChat.Description, "New Description Only")
	}
}

func TestGroupChatUpdateClearSystemPrompt(t *testing.T) {
	userID := uuid.New()
	groupChat, _ := NewGroupChat(userID, "Test Group", "")

	// システムプロンプトを設定
	groupChat.Update("", "", "", "Initial system prompt")

	if groupChat.SystemPrompt != "Initial system prompt" {
		t.Fatalf("SystemPrompt = %q, want %q", groupChat.SystemPrompt, "Initial system prompt")
	}

	// システムプロンプトをクリア（空文字を渡すことで削除可能）
	groupChat.Update("", "", "", "")

	if groupChat.SystemPrompt != "" {
		t.Errorf("SystemPrompt = %q, should be cleared", groupChat.SystemPrompt)
	}
}

func TestGroupChatIncrementMessageCount(t *testing.T) {
	userID := uuid.New()
	groupChat, _ := NewGroupChat(userID, "Test Group", "")

	originalCount := groupChat.MessageCount
	originalUpdatedAt := groupChat.UpdatedAt

	time.Sleep(10 * time.Millisecond)

	// メッセージカウントをインクリメント
	groupChat.IncrementMessageCount()

	// メッセージ数が増えているか
	if groupChat.MessageCount != originalCount+1 {
		t.Errorf("MessageCount = %d, want %d", groupChat.MessageCount, originalCount+1)
	}

	// LastMessageAtが設定されているか
	if groupChat.LastMessageAt == nil {
		t.Error("LastMessageAt should be set after IncrementMessageCount")
	}

	// UpdatedAtが更新されているか
	if !groupChat.UpdatedAt.After(originalUpdatedAt) {
		t.Error("UpdatedAt should be updated after IncrementMessageCount")
	}

	// 複数回インクリメント
	time.Sleep(10 * time.Millisecond)
	groupChat.IncrementMessageCount()

	if groupChat.MessageCount != originalCount+2 {
		t.Errorf("MessageCount = %d, want %d after second increment", groupChat.MessageCount, originalCount+2)
	}
}

func TestGroupChatDeactivate(t *testing.T) {
	userID := uuid.New()
	groupChat, _ := NewGroupChat(userID, "Test Group", "")

	// 初期状態はアクティブ
	if !groupChat.IsActive {
		t.Error("IsActive should be true initially")
	}

	originalUpdatedAt := groupChat.UpdatedAt
	time.Sleep(10 * time.Millisecond)

	// 無効化
	groupChat.Deactivate()

	// IsActiveがfalseになっているか
	if groupChat.IsActive {
		t.Error("IsActive should be false after Deactivate()")
	}

	// UpdatedAtが更新されているか
	if !groupChat.UpdatedAt.After(originalUpdatedAt) {
		t.Error("UpdatedAt should be updated after Deactivate()")
	}
}

func TestGroupChatValidate(t *testing.T) {
	userID := uuid.New()
	groupChatID := uuid.New()
	aiAgentID := uuid.New()

	tests := []struct {
		name      string
		groupChat *GroupChat
		wantErr   bool
	}{
		{
			name: "Valid group chat with member",
			groupChat: &GroupChat{
				ID:     groupChatID,
				UserID: userID,
				Name:   "Test Group",
				Members: []*GroupMember{
					{
						ID:          uuid.New(),
						GroupChatID: groupChatID,
						AIAgentID:   aiAgentID,
					},
				},
			},
			wantErr: false,
		},
		{
			name: "Nil user ID",
			groupChat: &GroupChat{
				ID:     groupChatID,
				UserID: uuid.Nil,
				Name:   "Test Group",
				Members: []*GroupMember{
					{
						ID:          uuid.New(),
						GroupChatID: groupChatID,
						AIAgentID:   aiAgentID,
					},
				},
			},
			wantErr: true,
		},
		{
			name: "Empty name",
			groupChat: &GroupChat{
				ID:     groupChatID,
				UserID: userID,
				Name:   "",
				Members: []*GroupMember{
					{
						ID:          uuid.New(),
						GroupChatID: groupChatID,
						AIAgentID:   aiAgentID,
					},
				},
			},
			wantErr: true,
		},
		{
			name: "No members",
			groupChat: &GroupChat{
				ID:      groupChatID,
				UserID:  userID,
				Name:    "Test Group",
				Members: []*GroupMember{},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.groupChat.Validate()

			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
