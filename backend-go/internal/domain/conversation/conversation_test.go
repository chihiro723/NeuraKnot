package conversation

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

// Conversationエンティティの仕様
// ============================================
// 【目的】
// - 1対1のチャット会話を表すエンティティ
// - ユーザーとAI Agentの会話履歴を管理
//
// 【必須項目】
// 1. UserID (uuid.UUID): ユーザーID（uuid.Nil不可）
// 2. AIAgentID (uuid.UUID): AI AgentのID（uuid.Nil不可）
//
// 【管理データ】
// - MessageCount (int): 会話内のメッセージ数
// - LastMessageAt (*time.Time): 最後のメッセージ送信日時
// - LastMessage (*Message): 最後のメッセージ（会話一覧表示用）
//
// 【メッセージカウント管理】
// - IncrementMessageCount(): メッセージ数を1増やす
// - LastMessageAt を現在時刻に更新
// - UpdatedAt を現在時刻に更新
//
// 【デフォルト値（新規作成時）】
// - MessageCount: 0
// - LastMessageAt: nil
// - LastMessage: nil
//
// 【使用箇所】
// - チャット一覧画面での会話表示
// - メッセージ送受信時の会話特定
// - ユーザーごとのAI Agent別会話管理
// ============================================

func TestNewConversation(t *testing.T) {
	userID := uuid.New()
	aiAgentID := uuid.New()

	tests := []struct {
		name       string
		userID     uuid.UUID
		aiAgentID  uuid.UUID
		wantErr    bool
	}{
		{
			name:      "Valid conversation",
			userID:    userID,
			aiAgentID: aiAgentID,
			wantErr:   false,
		},
		{
			name:      "Nil user ID",
			userID:    uuid.Nil,
			aiAgentID: aiAgentID,
			wantErr:   true,
		},
		{
			name:      "Nil AI agent ID",
			userID:    userID,
			aiAgentID: uuid.Nil,
			wantErr:   true,
		},
		{
			name:      "Both nil",
			userID:    uuid.Nil,
			aiAgentID: uuid.Nil,
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			conversation, err := NewConversation(tt.userID, tt.aiAgentID)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewConversation() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if conversation == nil {
					t.Fatal("Expected non-nil conversation for valid input")
				}

				// デフォルト値の確認
				if conversation.MessageCount != 0 {
					t.Errorf("MessageCount = %d, want 0", conversation.MessageCount)
				}
				if conversation.LastMessageAt != nil {
					t.Error("LastMessageAt should be nil initially")
				}
				if conversation.LastMessage != nil {
					t.Error("LastMessage should be nil initially")
				}

				// 入力値の確認
				if conversation.UserID != tt.userID {
					t.Errorf("UserID = %v, want %v", conversation.UserID, tt.userID)
				}
				if conversation.AIAgentID != tt.aiAgentID {
					t.Errorf("AIAgentID = %v, want %v", conversation.AIAgentID, tt.aiAgentID)
				}

				// IDが生成されているか確認
				if conversation.ID == uuid.Nil {
					t.Error("ID should be generated")
				}
			}
		})
	}
}

func TestConversationIncrementMessageCount(t *testing.T) {
	userID := uuid.New()
	aiAgentID := uuid.New()
	conversation, _ := NewConversation(userID, aiAgentID)

	originalCount := conversation.MessageCount
	originalUpdatedAt := conversation.UpdatedAt

	time.Sleep(10 * time.Millisecond)

	// メッセージカウントをインクリメント
	conversation.IncrementMessageCount()

	// メッセージ数が増えているか
	if conversation.MessageCount != originalCount+1 {
		t.Errorf("MessageCount = %d, want %d", conversation.MessageCount, originalCount+1)
	}

	// LastMessageAtが設定されているか
	if conversation.LastMessageAt == nil {
		t.Error("LastMessageAt should be set after IncrementMessageCount")
	}

	// UpdatedAtが更新されているか
	if !conversation.UpdatedAt.After(originalUpdatedAt) {
		t.Error("UpdatedAt should be updated after IncrementMessageCount")
	}

	// 複数回インクリメント
	time.Sleep(10 * time.Millisecond)
	conversation.IncrementMessageCount()

	if conversation.MessageCount != originalCount+2 {
		t.Errorf("MessageCount = %d, want %d after second increment", conversation.MessageCount, originalCount+2)
	}
}

func TestConversationValidate(t *testing.T) {
	userID := uuid.New()
	aiAgentID := uuid.New()

	tests := []struct {
		name         string
		conversation *Conversation
		wantErr      bool
	}{
		{
			name: "Valid conversation",
			conversation: &Conversation{
				ID:        uuid.New(),
				UserID:    userID,
				AIAgentID: aiAgentID,
			},
			wantErr: false,
		},
		{
			name: "Nil user ID",
			conversation: &Conversation{
				ID:        uuid.New(),
				UserID:    uuid.Nil,
				AIAgentID: aiAgentID,
			},
			wantErr: true,
		},
		{
			name: "Nil AI agent ID",
			conversation: &Conversation{
				ID:        uuid.New(),
				UserID:    userID,
				AIAgentID: uuid.Nil,
			},
			wantErr: true,
		},
		{
			name: "Both nil",
			conversation: &Conversation{
				ID:        uuid.New(),
				UserID:    uuid.Nil,
				AIAgentID: uuid.Nil,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.conversation.Validate()

			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
