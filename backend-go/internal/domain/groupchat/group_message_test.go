package groupchat

import (
	"testing"

	"github.com/google/uuid"
)

// GroupMessage/SenderType/ProcessingStatusの仕様
// ============================================
// 【目的】
// - グループチャットのメッセージを表すエンティティ
// - ユーザーとAIの両方のメッセージを管理
//
// 【SenderType（送信者タイプ）】
// 1. "user" (SenderTypeUser): ユーザーからのメッセージ
// 2. "ai" (SenderTypeAI): AIからの返答メッセージ
//
// 【ProcessingStatus（処理状態）】
// 1. "pending" (ProcessingStatusPending): 処理待ち
// 2. "processing" (ProcessingStatusProcessing): 処理中
// 3. "completed" (ProcessingStatusCompleted): 完了
// 4. "failed" (ProcessingStatusFailed): 失敗
// 5. "cancelled" (ProcessingStatusCancelled): キャンセル
//
// 【必須項目】
// 1. GroupChatID (uuid.UUID): グループチャットID
// 2. SenderType: 送信者タイプ（user/ai）
// 3. SenderID (uuid.UUID): 送信者のID（UserID or AIAgentID）
// 4. Content (string): メッセージ内容（空文字不可）
//
// 【オプション項目】
// - ParentMessageID (*uuid.UUID): 親メッセージID（スレッド機能用）
// - AISessionID (*uuid.UUID): AI処理セッションID
// - Mentions ([]*MessageMention): メンション情報
// - ToolUsages ([]*ToolUsage): ツール使用履歴
//
// 【作成方法】
// - NewUserMessage(): ユーザーメッセージ作成（ProcessingStatus: pending）
// - NewAIMessage(): AIメッセージ作成（ProcessingStatus: completed）
//
// 【使用箇所】
// - グループチャット画面でのメッセージ表示
// - メッセージ履歴の保存
// - AI処理の状態管理
// ============================================

func TestParseSenderType(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    SenderType
		wantErr bool
	}{
		{
			name:    "Parse user",
			input:   "user",
			want:    SenderTypeUser,
			wantErr: false,
		},
		{
			name:    "Parse ai",
			input:   "ai",
			want:    SenderTypeAI,
			wantErr: false,
		},
		{
			name:    "Parse unknown returns error",
			input:   "unknown",
			want:    "",
			wantErr: true,
		},
		{
			name:    "Parse empty string returns error",
			input:   "",
			want:    "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseSenderType(tt.input)

			if (err != nil) != tt.wantErr {
				t.Errorf("ParseSenderType() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if got != tt.want {
				t.Errorf("ParseSenderType() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNewUserMessage(t *testing.T) {
	groupChatID := uuid.New()
	userID := uuid.New()

	tests := []struct {
		name        string
		groupChatID uuid.UUID
		userID      uuid.UUID
		content     string
		wantErr     bool
	}{
		{
			name:        "Valid user message",
			groupChatID: groupChatID,
			userID:      userID,
			content:     "Hello, AI team!",
			wantErr:     false,
		},
		{
			name:        "Nil group chat ID",
			groupChatID: uuid.Nil,
			userID:      userID,
			content:     "Test",
			wantErr:     true,
		},
		{
			name:        "Nil user ID",
			groupChatID: groupChatID,
			userID:      uuid.Nil,
			content:     "Test",
			wantErr:     true,
		},
		{
			name:        "Empty content",
			groupChatID: groupChatID,
			userID:      userID,
			content:     "",
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			message, err := NewUserMessage(tt.groupChatID, tt.userID, tt.content)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewUserMessage() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if message == nil {
					t.Fatal("Expected non-nil message for valid input")
				}

				// 入力値の確認
				if message.GroupChatID != tt.groupChatID {
					t.Errorf("GroupChatID = %v, want %v", message.GroupChatID, tt.groupChatID)
				}
				if message.SenderID != tt.userID {
					t.Errorf("SenderID = %v, want %v", message.SenderID, tt.userID)
				}
				if message.Content != tt.content {
					t.Errorf("Content = %q, want %q", message.Content, tt.content)
				}

				// デフォルト値の確認
				if message.SenderType != SenderTypeUser {
					t.Errorf("SenderType = %v, want %v", message.SenderType, SenderTypeUser)
				}
				if message.ProcessingStatus != ProcessingStatusPending {
					t.Errorf("ProcessingStatus = %v, want %v", message.ProcessingStatus, ProcessingStatusPending)
				}
				if message.ParentMessageID != nil {
					t.Error("ParentMessageID should be nil by default")
				}
				if message.AISessionID != nil {
					t.Error("AISessionID should be nil by default")
				}
			}
		})
	}
}

func TestNewAIMessage(t *testing.T) {
	groupChatID := uuid.New()
	aiAgentID := uuid.New()
	parentMessageID := uuid.New()
	aiSessionID := uuid.New()

	tests := []struct {
		name            string
		groupChatID     uuid.UUID
		aiAgentID       uuid.UUID
		content         string
		parentMessageID *uuid.UUID
		aiSessionID     *uuid.UUID
		wantErr         bool
	}{
		{
			name:            "Valid AI message with parent and session",
			groupChatID:     groupChatID,
			aiAgentID:       aiAgentID,
			content:         "Hello, human!",
			parentMessageID: &parentMessageID,
			aiSessionID:     &aiSessionID,
			wantErr:         false,
		},
		{
			name:            "Valid AI message without parent",
			groupChatID:     groupChatID,
			aiAgentID:       aiAgentID,
			content:         "Hi!",
			parentMessageID: nil,
			aiSessionID:     &aiSessionID,
			wantErr:         false,
		},
		{
			name:            "Nil group chat ID",
			groupChatID:     uuid.Nil,
			aiAgentID:       aiAgentID,
			content:         "Test",
			parentMessageID: nil,
			aiSessionID:     nil,
			wantErr:         true,
		},
		{
			name:            "Nil AI agent ID",
			groupChatID:     groupChatID,
			aiAgentID:       uuid.Nil,
			content:         "Test",
			parentMessageID: nil,
			aiSessionID:     nil,
			wantErr:         true,
		},
		{
			name:            "Empty content",
			groupChatID:     groupChatID,
			aiAgentID:       aiAgentID,
			content:         "",
			parentMessageID: nil,
			aiSessionID:     nil,
			wantErr:         true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			message, err := NewAIMessage(tt.groupChatID, tt.aiAgentID, tt.content, tt.parentMessageID, tt.aiSessionID)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewAIMessage() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if message == nil {
					t.Fatal("Expected non-nil message for valid input")
				}

				// 入力値の確認
				if message.GroupChatID != tt.groupChatID {
					t.Errorf("GroupChatID = %v, want %v", message.GroupChatID, tt.groupChatID)
				}
				if message.SenderID != tt.aiAgentID {
					t.Errorf("SenderID = %v, want %v", message.SenderID, tt.aiAgentID)
				}
				if message.Content != tt.content {
					t.Errorf("Content = %q, want %q", message.Content, tt.content)
				}

				// ParentMessageIDの確認
				if tt.parentMessageID != nil {
					if message.ParentMessageID == nil || *message.ParentMessageID != *tt.parentMessageID {
						t.Errorf("ParentMessageID = %v, want %v", message.ParentMessageID, tt.parentMessageID)
					}
				} else if message.ParentMessageID != nil {
					t.Error("ParentMessageID should be nil")
				}

				// AISessionIDの確認
				if tt.aiSessionID != nil {
					if message.AISessionID == nil || *message.AISessionID != *tt.aiSessionID {
						t.Errorf("AISessionID = %v, want %v", message.AISessionID, tt.aiSessionID)
					}
				} else if message.AISessionID != nil {
					t.Error("AISessionID should be nil")
				}

				// デフォルト値の確認
				if message.SenderType != SenderTypeAI {
					t.Errorf("SenderType = %v, want %v", message.SenderType, SenderTypeAI)
				}
				if message.ProcessingStatus != ProcessingStatusCompleted {
					t.Errorf("ProcessingStatus = %v, want %v", message.ProcessingStatus, ProcessingStatusCompleted)
				}
			}
		})
	}
}

func TestGroupMessageUpdateProcessingStatus(t *testing.T) {
	groupChatID := uuid.New()
	userID := uuid.New()
	message, _ := NewUserMessage(groupChatID, userID, "Test message")

	// 初期状態はpending
	if message.ProcessingStatus != ProcessingStatusPending {
		t.Errorf("Initial ProcessingStatus = %v, want %v", message.ProcessingStatus, ProcessingStatusPending)
	}

	// ステータスを更新
	message.UpdateProcessingStatus(ProcessingStatusProcessing)
	if message.ProcessingStatus != ProcessingStatusProcessing {
		t.Errorf("ProcessingStatus = %v, want %v", message.ProcessingStatus, ProcessingStatusProcessing)
	}

	// さらに更新
	message.UpdateProcessingStatus(ProcessingStatusCompleted)
	if message.ProcessingStatus != ProcessingStatusCompleted {
		t.Errorf("ProcessingStatus = %v, want %v", message.ProcessingStatus, ProcessingStatusCompleted)
	}
}

func TestGroupMessageIsUserMessage(t *testing.T) {
	groupChatID := uuid.New()
	userID := uuid.New()
	aiAgentID := uuid.New()

	userMessage, _ := NewUserMessage(groupChatID, userID, "User message")
	aiMessage, _ := NewAIMessage(groupChatID, aiAgentID, "AI message", nil, nil)

	if !userMessage.IsUserMessage() {
		t.Error("User message should return true for IsUserMessage()")
	}

	if aiMessage.IsUserMessage() {
		t.Error("AI message should return false for IsUserMessage()")
	}
}

func TestGroupMessageIsAIMessage(t *testing.T) {
	groupChatID := uuid.New()
	userID := uuid.New()
	aiAgentID := uuid.New()

	userMessage, _ := NewUserMessage(groupChatID, userID, "User message")
	aiMessage, _ := NewAIMessage(groupChatID, aiAgentID, "AI message", nil, nil)

	if userMessage.IsAIMessage() {
		t.Error("User message should return false for IsAIMessage()")
	}

	if !aiMessage.IsAIMessage() {
		t.Error("AI message should return true for IsAIMessage()")
	}
}

func TestGroupMessageValidate(t *testing.T) {
	groupChatID := uuid.New()
	senderID := uuid.New()

	tests := []struct {
		name    string
		message *GroupMessage
		wantErr bool
	}{
		{
			name: "Valid user message",
			message: &GroupMessage{
				GroupChatID: groupChatID,
				SenderType:  SenderTypeUser,
				SenderID:    senderID,
				Content:     "Test content",
			},
			wantErr: false,
		},
		{
			name: "Valid AI message",
			message: &GroupMessage{
				GroupChatID: groupChatID,
				SenderType:  SenderTypeAI,
				SenderID:    senderID,
				Content:     "Test content",
			},
			wantErr: false,
		},
		{
			name: "Nil group chat ID",
			message: &GroupMessage{
				GroupChatID: uuid.Nil,
				SenderType:  SenderTypeUser,
				SenderID:    senderID,
				Content:     "Test content",
			},
			wantErr: true,
		},
		{
			name: "Nil sender ID",
			message: &GroupMessage{
				GroupChatID: groupChatID,
				SenderType:  SenderTypeUser,
				SenderID:    uuid.Nil,
				Content:     "Test content",
			},
			wantErr: true,
		},
		{
			name: "Empty content",
			message: &GroupMessage{
				GroupChatID: groupChatID,
				SenderType:  SenderTypeUser,
				SenderID:    senderID,
				Content:     "",
			},
			wantErr: true,
		},
		{
			name: "Invalid sender type",
			message: &GroupMessage{
				GroupChatID: groupChatID,
				SenderType:  SenderType("invalid"),
				SenderID:    senderID,
				Content:     "Test content",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.message.Validate()

			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestProcessingStatusConstants(t *testing.T) {
	// 定数が期待される値を持っているか確認
	tests := []struct {
		name     string
		status   ProcessingStatus
		expected string
	}{
		{
			name:     "ProcessingStatusPending constant",
			status:   ProcessingStatusPending,
			expected: "pending",
		},
		{
			name:     "ProcessingStatusProcessing constant",
			status:   ProcessingStatusProcessing,
			expected: "processing",
		},
		{
			name:     "ProcessingStatusCompleted constant",
			status:   ProcessingStatusCompleted,
			expected: "completed",
		},
		{
			name:     "ProcessingStatusFailed constant",
			status:   ProcessingStatusFailed,
			expected: "failed",
		},
		{
			name:     "ProcessingStatusCancelled constant",
			status:   ProcessingStatusCancelled,
			expected: "cancelled",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.status) != tt.expected {
				t.Errorf("Constant value = %q, want %q", string(tt.status), tt.expected)
			}
		})
	}
}
