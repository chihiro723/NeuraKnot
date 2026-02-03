package conversation

import (
	"testing"

	"github.com/google/uuid"
)

// Message/SenderTypeの仕様
// ============================================
// 【目的】
// - チャットメッセージを表すエンティティ
// - 送信者がユーザーかAIかを区別
//
// 【SenderType（送信者タイプ）】
// 1. "user" (SenderTypeUser): ユーザーからのメッセージ
// 2. "ai" (SenderTypeAI): AIからの返答メッセージ
//
// 【必須項目】
// 1. ConversationID (uuid.UUID): 会話ID
// 2. SenderType: 送信者タイプ（user/ai）
// 3. SenderID (uuid.UUID): 送信者のID（UserID or AIAgentID）
// 4. Content (string): メッセージ内容（空文字不可）
//
// 【オプション項目】
// - AISessionID (*uuid.UUID): AI処理セッションID（AIメッセージの場合）
//
// 【ストリーミング対応】
// - NewMessageForStreaming(): 初期コンテンツが空のメッセージ作成
// - ストリーミングで徐々にコンテンツを追加していく用途
// - Validate()では空文字エラーになるので注意
//
// 【使用箇所】
// - チャット画面でのメッセージ表示
// - メッセージ履歴の保存
// - ストリーミングレスポンスの管理
// ============================================

func TestSenderTypeIsValid(t *testing.T) {
	tests := []struct {
		name       string
		senderType SenderType
		want       bool
	}{
		{
			name:       "User is valid",
			senderType: SenderTypeUser,
			want:       true,
		},
		{
			name:       "AI is valid",
			senderType: SenderTypeAI,
			want:       true,
		},
		{
			name:       "Unknown sender type is invalid",
			senderType: SenderType("unknown"),
			want:       false,
		},
		{
			name:       "Empty string is invalid",
			senderType: SenderType(""),
			want:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.senderType.IsValid(); got != tt.want {
				t.Errorf("IsValid() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSenderTypeString(t *testing.T) {
	tests := []struct {
		name       string
		senderType SenderType
		want       string
	}{
		{
			name:       "User to string",
			senderType: SenderTypeUser,
			want:       "user",
		},
		{
			name:       "AI to string",
			senderType: SenderTypeAI,
			want:       "ai",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.senderType.String(); got != tt.want {
				t.Errorf("String() = %q, want %q", got, tt.want)
			}
		})
	}
}

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

func TestNewMessage(t *testing.T) {
	conversationID := uuid.New()
	senderID := uuid.New()

	tests := []struct {
		name           string
		conversationID uuid.UUID
		senderType     SenderType
		senderID       uuid.UUID
		content        string
		wantErr        bool
	}{
		{
			name:           "Valid user message",
			conversationID: conversationID,
			senderType:     SenderTypeUser,
			senderID:       senderID,
			content:        "Hello, AI!",
			wantErr:        false,
		},
		{
			name:           "Valid AI message",
			conversationID: conversationID,
			senderType:     SenderTypeAI,
			senderID:       senderID,
			content:        "Hello, human!",
			wantErr:        false,
		},
		{
			name:           "Nil conversation ID",
			conversationID: uuid.Nil,
			senderType:     SenderTypeUser,
			senderID:       senderID,
			content:        "Test",
			wantErr:        true,
		},
		{
			name:           "Invalid sender type",
			conversationID: conversationID,
			senderType:     SenderType("invalid"),
			senderID:       senderID,
			content:        "Test",
			wantErr:        true,
		},
		{
			name:           "Nil sender ID",
			conversationID: conversationID,
			senderType:     SenderTypeUser,
			senderID:       uuid.Nil,
			content:        "Test",
			wantErr:        true,
		},
		{
			name:           "Empty content",
			conversationID: conversationID,
			senderType:     SenderTypeUser,
			senderID:       senderID,
			content:        "",
			wantErr:        true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			message, err := NewMessage(tt.conversationID, tt.senderType, tt.senderID, tt.content)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewMessage() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if message == nil {
					t.Fatal("Expected non-nil message for valid input")
				}

				// 入力値の確認
				if message.ConversationID != tt.conversationID {
					t.Errorf("ConversationID = %v, want %v", message.ConversationID, tt.conversationID)
				}
				if message.SenderType != tt.senderType {
					t.Errorf("SenderType = %v, want %v", message.SenderType, tt.senderType)
				}
				if message.SenderID != tt.senderID {
					t.Errorf("SenderID = %v, want %v", message.SenderID, tt.senderID)
				}
				if message.Content != tt.content {
					t.Errorf("Content = %q, want %q", message.Content, tt.content)
				}

				// デフォルト値の確認
				if message.AISessionID != nil {
					t.Error("AISessionID should be nil by default")
				}
			}
		})
	}
}

func TestNewMessageForStreaming(t *testing.T) {
	conversationID := uuid.New()
	senderID := uuid.New()

	tests := []struct {
		name           string
		conversationID uuid.UUID
		senderType     SenderType
		senderID       uuid.UUID
		wantErr        bool
	}{
		{
			name:           "Valid streaming message",
			conversationID: conversationID,
			senderType:     SenderTypeAI,
			senderID:       senderID,
			wantErr:        false,
		},
		{
			name:           "Nil conversation ID",
			conversationID: uuid.Nil,
			senderType:     SenderTypeAI,
			senderID:       senderID,
			wantErr:        true,
		},
		{
			name:           "Invalid sender type",
			conversationID: conversationID,
			senderType:     SenderType("invalid"),
			senderID:       senderID,
			wantErr:        true,
		},
		{
			name:           "Nil sender ID",
			conversationID: conversationID,
			senderType:     SenderTypeAI,
			senderID:       uuid.Nil,
			wantErr:        true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			message, err := NewMessageForStreaming(tt.conversationID, tt.senderType, tt.senderID)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewMessageForStreaming() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if message == nil {
					t.Fatal("Expected non-nil message for valid input")
				}

				// コンテンツが空であることを確認（ストリーミング用）
				if message.Content != "" {
					t.Errorf("Content = %q, want empty string for streaming", message.Content)
				}

				// 入力値の確認
				if message.ConversationID != tt.conversationID {
					t.Errorf("ConversationID = %v, want %v", message.ConversationID, tt.conversationID)
				}
				if message.SenderType != tt.senderType {
					t.Errorf("SenderType = %v, want %v", message.SenderType, tt.senderType)
				}
				if message.SenderID != tt.senderID {
					t.Errorf("SenderID = %v, want %v", message.SenderID, tt.senderID)
				}
			}
		})
	}
}

func TestMessageSetAISessionID(t *testing.T) {
	conversationID := uuid.New()
	senderID := uuid.New()
	sessionID := uuid.New()

	message, _ := NewMessage(conversationID, SenderTypeAI, senderID, "Test message")

	// 初期状態ではnil
	if message.AISessionID != nil {
		t.Error("AISessionID should be nil initially")
	}

	// セッションIDを設定
	message.SetAISessionID(sessionID)

	// 設定されたか確認
	if message.AISessionID == nil {
		t.Fatal("AISessionID should not be nil after SetAISessionID")
	}
	if *message.AISessionID != sessionID {
		t.Errorf("AISessionID = %v, want %v", *message.AISessionID, sessionID)
	}
}

func TestMessageValidate(t *testing.T) {
	conversationID := uuid.New()
	senderID := uuid.New()

	tests := []struct {
		name    string
		message *Message
		wantErr bool
	}{
		{
			name: "Valid message",
			message: &Message{
				ConversationID: conversationID,
				SenderType:     SenderTypeUser,
				SenderID:       senderID,
				Content:        "Test content",
			},
			wantErr: false,
		},
		{
			name: "Nil conversation ID",
			message: &Message{
				ConversationID: uuid.Nil,
				SenderType:     SenderTypeUser,
				SenderID:       senderID,
				Content:        "Test content",
			},
			wantErr: true,
		},
		{
			name: "Invalid sender type",
			message: &Message{
				ConversationID: conversationID,
				SenderType:     SenderType("invalid"),
				SenderID:       senderID,
				Content:        "Test content",
			},
			wantErr: true,
		},
		{
			name: "Nil sender ID",
			message: &Message{
				ConversationID: conversationID,
				SenderType:     SenderTypeUser,
				SenderID:       uuid.Nil,
				Content:        "Test content",
			},
			wantErr: true,
		},
		{
			name: "Empty content",
			message: &Message{
				ConversationID: conversationID,
				SenderType:     SenderTypeUser,
				SenderID:       senderID,
				Content:        "",
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

func TestSenderTypeConstants(t *testing.T) {
	// 定数が期待される値を持っているか確認
	tests := []struct {
		name       string
		senderType SenderType
		expected   string
	}{
		{
			name:       "SenderTypeUser constant",
			senderType: SenderTypeUser,
			expected:   "user",
		},
		{
			name:       "SenderTypeAI constant",
			senderType: SenderTypeAI,
			expected:   "ai",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.senderType) != tt.expected {
				t.Errorf("Constant value = %q, want %q", string(tt.senderType), tt.expected)
			}
		})
	}
}
