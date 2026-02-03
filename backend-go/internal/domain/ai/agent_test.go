package ai

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

// Agentエンティティの仕様
// ============================================
// 【目的】
// - AI Agentエンティティ（ユーザーが作成するAIキャラクター）
// - LLMモデルの設定、ペルソナ、システムプロンプトを管理
//
// 【必須項目】
// 1. UserID (uuid.UUID): 所有者のユーザーID
// 2. Name (string): Agent名（空文字不可）
// 3. PersonaType: ペルソナタイプ（assistant, creative, etc.）
// 4. Provider: LLMプロバイダー（openai, anthropic, google）
// 5. Model (string): モデル名（空文字不可）
//
// 【デフォルト値（新規作成時）】
// - Temperature: 0.7
// - MaxTokens: 2000
// - ToolsEnabled: true
// - StreamingEnabled: false
// - IsActive: true
// - MessageCount: 0
//
// 【制約条件】
// - UserID: uuid.Nilは不可
// - Name: 空文字不可
// - PersonaType: IsValid()がtrueである必要あり
// - Provider: IsValid()がtrueである必要あり
// - Temperature: 0.0 〜 2.0 の範囲
// - MaxTokens: 100 〜 8000 の範囲
//
// 【システムプロンプト管理】
// - GetSystemPrompt(): ペルソナのデフォルトプロンプト + カスタムプロンプトを結合
// - SetSystemPrompt(prompt): カスタムプロンプトを設定（空文字でnilに）
//
// 【状態管理】
// - IncrementMessageCount(): メッセージ数を増やし、最終チャット日時を更新
// - IsActive: エージェントの有効/無効を管理
//
// 【使用箇所】
// - ユーザーがAIキャラクターを作成
// - チャットセッション開始時にAgentの設定を使用
// - Python AI Serverへのモデル・プロンプト指定
// ============================================

func TestNewAgent(t *testing.T) {
	userID := uuid.New()

	tests := []struct {
		name        string
		userID      uuid.UUID
		agentName   string
		personaType PersonaType
		provider    Provider
		model       string
		wantErr     bool
	}{
		{
			name:        "Valid agent",
			userID:      userID,
			agentName:   "Test Agent",
			personaType: PersonaAssistant,
			provider:    ProviderOpenAI,
			model:       "gpt-4o",
			wantErr:     false,
		},
		{
			name:        "Valid with different persona",
			userID:      userID,
			agentName:   "Creative Agent",
			personaType: PersonaCreative,
			provider:    ProviderAnthropic,
			model:       "claude-3-5-sonnet",
			wantErr:     false,
		},
		{
			name:        "Nil user ID",
			userID:      uuid.Nil,
			agentName:   "Test Agent",
			personaType: PersonaAssistant,
			provider:    ProviderOpenAI,
			model:       "gpt-4o",
			wantErr:     true,
		},
		{
			name:        "Empty name",
			userID:      userID,
			agentName:   "",
			personaType: PersonaAssistant,
			provider:    ProviderOpenAI,
			model:       "gpt-4o",
			wantErr:     true,
		},
		{
			name:        "Invalid persona type",
			userID:      userID,
			agentName:   "Test Agent",
			personaType: PersonaType("invalid"),
			provider:    ProviderOpenAI,
			model:       "gpt-4o",
			wantErr:     true,
		},
		{
			name:        "Invalid provider",
			userID:      userID,
			agentName:   "Test Agent",
			personaType: PersonaAssistant,
			provider:    Provider("invalid"),
			model:       "gpt-4o",
			wantErr:     true,
		},
		{
			name:        "Empty model",
			userID:      userID,
			agentName:   "Test Agent",
			personaType: PersonaAssistant,
			provider:    ProviderOpenAI,
			model:       "",
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			agent, err := NewAgent(tt.userID, tt.agentName, tt.personaType, tt.provider, tt.model)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewAgent() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if agent == nil {
					t.Fatal("Expected non-nil agent for valid input")
				}

				// デフォルト値の確認
				if agent.Temperature != 0.7 {
					t.Errorf("Temperature = %f, want 0.7", agent.Temperature)
				}
				if agent.MaxTokens != 2000 {
					t.Errorf("MaxTokens = %d, want 2000", agent.MaxTokens)
				}
				if !agent.ToolsEnabled {
					t.Error("ToolsEnabled should be true by default")
				}
				if agent.StreamingEnabled {
					t.Error("StreamingEnabled should be false by default")
				}
				if !agent.IsActive {
					t.Error("IsActive should be true by default")
				}
				if agent.MessageCount != 0 {
					t.Errorf("MessageCount = %d, want 0", agent.MessageCount)
				}
				if agent.LastChatAt != nil {
					t.Error("LastChatAt should be nil for new agent")
				}

				// 入力値の確認
				if agent.UserID != tt.userID {
					t.Errorf("UserID = %v, want %v", agent.UserID, tt.userID)
				}
				if agent.Name != tt.agentName {
					t.Errorf("Name = %q, want %q", agent.Name, tt.agentName)
				}
				if agent.PersonaType != tt.personaType {
					t.Errorf("PersonaType = %v, want %v", agent.PersonaType, tt.personaType)
				}
				if agent.Provider != tt.provider {
					t.Errorf("Provider = %v, want %v", agent.Provider, tt.provider)
				}
				if agent.Model != tt.model {
					t.Errorf("Model = %q, want %q", agent.Model, tt.model)
				}
			}
		})
	}
}

func TestAgentGetSystemPrompt(t *testing.T) {
	userID := uuid.New()

	tests := []struct {
		name         string
		personaType  PersonaType
		customPrompt *string
		wantContains string // 期待される部分文字列
	}{
		{
			name:         "Assistant persona without custom prompt",
			personaType:  PersonaAssistant,
			customPrompt: nil,
			wantContains: "親切で丁寧なアシスタント",
		},
		{
			name:         "Creative persona without custom prompt",
			personaType:  PersonaCreative,
			customPrompt: nil,
			wantContains: "創造的で発想豊か",
		},
		{
			name:         "Assistant with custom prompt",
			personaType:  PersonaAssistant,
			customPrompt: stringPtr("追加の指示: 日本語で回答してください。"),
			wantContains: "追加の指示",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			agent, _ := NewAgent(userID, "Test Agent", tt.personaType, ProviderOpenAI, "gpt-4o")
			agent.SystemPrompt = tt.customPrompt

			prompt := agent.GetSystemPrompt()

			if prompt == "" {
				t.Error("GetSystemPrompt() returned empty string")
			}

			// 部分文字列が含まれているか確認
			if !contains(prompt, tt.wantContains) {
				t.Errorf("GetSystemPrompt() does not contain %q\nGot: %q", tt.wantContains, prompt)
			}
		})
	}
}

func TestAgentSetSystemPrompt(t *testing.T) {
	userID := uuid.New()
	agent, _ := NewAgent(userID, "Test Agent", PersonaAssistant, ProviderOpenAI, "gpt-4o")

	tests := []struct {
		name         string
		input        string
		expectNil    bool
	}{
		{
			name:      "Set non-empty prompt",
			input:     "Custom prompt",
			expectNil: false,
		},
		{
			name:      "Set empty string (should become nil)",
			input:     "",
			expectNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			originalUpdatedAt := agent.UpdatedAt
			time.Sleep(10 * time.Millisecond)

			agent.SetSystemPrompt(tt.input)

			if tt.expectNil {
				if agent.SystemPrompt != nil {
					t.Error("SystemPrompt should be nil for empty string")
				}
			} else {
				if agent.SystemPrompt == nil {
					t.Error("SystemPrompt should not be nil")
				} else if *agent.SystemPrompt != tt.input {
					t.Errorf("SystemPrompt = %q, want %q", *agent.SystemPrompt, tt.input)
				}
			}

			// UpdatedAtが更新されているか確認
			if !agent.UpdatedAt.After(originalUpdatedAt) {
				t.Error("UpdatedAt should be updated")
			}
		})
	}
}

func TestAgentSetDescription(t *testing.T) {
	userID := uuid.New()
	agent, _ := NewAgent(userID, "Test Agent", PersonaAssistant, ProviderOpenAI, "gpt-4o")

	tests := []struct {
		name      string
		input     string
		expectNil bool
	}{
		{
			name:      "Set non-empty description",
			input:     "This is a test agent",
			expectNil: false,
		},
		{
			name:      "Set empty string (should become nil)",
			input:     "",
			expectNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			originalUpdatedAt := agent.UpdatedAt
			time.Sleep(10 * time.Millisecond)

			agent.SetDescription(tt.input)

			if tt.expectNil {
				if agent.Description != nil {
					t.Error("Description should be nil for empty string")
				}
			} else {
				if agent.Description == nil {
					t.Error("Description should not be nil")
				} else if *agent.Description != tt.input {
					t.Errorf("Description = %q, want %q", *agent.Description, tt.input)
				}
			}

			// UpdatedAtが更新されているか確認
			if !agent.UpdatedAt.After(originalUpdatedAt) {
				t.Error("UpdatedAt should be updated")
			}
		})
	}
}

func TestAgentIncrementMessageCount(t *testing.T) {
	userID := uuid.New()
	agent, _ := NewAgent(userID, "Test Agent", PersonaAssistant, ProviderOpenAI, "gpt-4o")

	originalCount := agent.MessageCount
	originalUpdatedAt := agent.UpdatedAt

	time.Sleep(10 * time.Millisecond)
	agent.IncrementMessageCount()

	// メッセージ数が増えているか
	if agent.MessageCount != originalCount+1 {
		t.Errorf("MessageCount = %d, want %d", agent.MessageCount, originalCount+1)
	}

	// LastChatAtが設定されているか
	if agent.LastChatAt == nil {
		t.Error("LastChatAt should be set after IncrementMessageCount")
	}

	// UpdatedAtが更新されているか
	if !agent.UpdatedAt.After(originalUpdatedAt) {
		t.Error("UpdatedAt should be updated")
	}

	// 複数回インクリメント
	time.Sleep(10 * time.Millisecond)
	agent.IncrementMessageCount()

	if agent.MessageCount != originalCount+2 {
		t.Errorf("MessageCount = %d, want %d after second increment", agent.MessageCount, originalCount+2)
	}
}

func TestAgentValidate(t *testing.T) {
	userID := uuid.New()

	tests := []struct {
		name    string
		agent   *Agent
		wantErr bool
	}{
		{
			name: "Valid agent",
			agent: &Agent{
				UserID:      userID,
				Name:        "Test Agent",
				PersonaType: PersonaAssistant,
				Provider:    ProviderOpenAI,
				Model:       "gpt-4o",
				Temperature: 0.7,
				MaxTokens:   2000,
			},
			wantErr: false,
		},
		{
			name: "Nil user ID",
			agent: &Agent{
				UserID:      uuid.Nil,
				Name:        "Test Agent",
				PersonaType: PersonaAssistant,
				Provider:    ProviderOpenAI,
				Model:       "gpt-4o",
				Temperature: 0.7,
				MaxTokens:   2000,
			},
			wantErr: true,
		},
		{
			name: "Empty name",
			agent: &Agent{
				UserID:      userID,
				Name:        "",
				PersonaType: PersonaAssistant,
				Provider:    ProviderOpenAI,
				Model:       "gpt-4o",
				Temperature: 0.7,
				MaxTokens:   2000,
			},
			wantErr: true,
		},
		{
			name: "Invalid persona type",
			agent: &Agent{
				UserID:      userID,
				Name:        "Test Agent",
				PersonaType: PersonaType("invalid"),
				Provider:    ProviderOpenAI,
				Model:       "gpt-4o",
				Temperature: 0.7,
				MaxTokens:   2000,
			},
			wantErr: true,
		},
		{
			name: "Invalid provider",
			agent: &Agent{
				UserID:      userID,
				Name:        "Test Agent",
				PersonaType: PersonaAssistant,
				Provider:    Provider("invalid"),
				Model:       "gpt-4o",
				Temperature: 0.7,
				MaxTokens:   2000,
			},
			wantErr: true,
		},
		{
			name: "Empty model",
			agent: &Agent{
				UserID:      userID,
				Name:        "Test Agent",
				PersonaType: PersonaAssistant,
				Provider:    ProviderOpenAI,
				Model:       "",
				Temperature: 0.7,
				MaxTokens:   2000,
			},
			wantErr: true,
		},
		{
			name: "Temperature too low (-0.1)",
			agent: &Agent{
				UserID:      userID,
				Name:        "Test Agent",
				PersonaType: PersonaAssistant,
				Provider:    ProviderOpenAI,
				Model:       "gpt-4o",
				Temperature: -0.1,
				MaxTokens:   2000,
			},
			wantErr: true,
		},
		{
			name: "Temperature too high (2.1)",
			agent: &Agent{
				UserID:      userID,
				Name:        "Test Agent",
				PersonaType: PersonaAssistant,
				Provider:    ProviderOpenAI,
				Model:       "gpt-4o",
				Temperature: 2.1,
				MaxTokens:   2000,
			},
			wantErr: true,
		},
		{
			name: "MaxTokens too low (99)",
			agent: &Agent{
				UserID:      userID,
				Name:        "Test Agent",
				PersonaType: PersonaAssistant,
				Provider:    ProviderOpenAI,
				Model:       "gpt-4o",
				Temperature: 0.7,
				MaxTokens:   99,
			},
			wantErr: true,
		},
		{
			name: "MaxTokens too high (8001)",
			agent: &Agent{
				UserID:      userID,
				Name:        "Test Agent",
				PersonaType: PersonaAssistant,
				Provider:    ProviderOpenAI,
				Model:       "gpt-4o",
				Temperature: 0.7,
				MaxTokens:   8001,
			},
			wantErr: true,
		},
		{
			name: "Temperature boundary (0.0)",
			agent: &Agent{
				UserID:      userID,
				Name:        "Test Agent",
				PersonaType: PersonaAssistant,
				Provider:    ProviderOpenAI,
				Model:       "gpt-4o",
				Temperature: 0.0,
				MaxTokens:   2000,
			},
			wantErr: false,
		},
		{
			name: "Temperature boundary (2.0)",
			agent: &Agent{
				UserID:      userID,
				Name:        "Test Agent",
				PersonaType: PersonaAssistant,
				Provider:    ProviderOpenAI,
				Model:       "gpt-4o",
				Temperature: 2.0,
				MaxTokens:   2000,
			},
			wantErr: false,
		},
		{
			name: "MaxTokens boundary (100)",
			agent: &Agent{
				UserID:      userID,
				Name:        "Test Agent",
				PersonaType: PersonaAssistant,
				Provider:    ProviderOpenAI,
				Model:       "gpt-4o",
				Temperature: 0.7,
				MaxTokens:   100,
			},
			wantErr: false,
		},
		{
			name: "MaxTokens boundary (8000)",
			agent: &Agent{
				UserID:      userID,
				Name:        "Test Agent",
				PersonaType: PersonaAssistant,
				Provider:    ProviderOpenAI,
				Model:       "gpt-4o",
				Temperature: 0.7,
				MaxTokens:   8000,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.agent.Validate()

			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// ヘルパー関数
func stringPtr(s string) *string {
	return &s
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && containsCheck(s, substr))
}

func containsCheck(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
