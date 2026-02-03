package ai

import (
	"testing"
)

// PersonaType値オブジェクトの仕様
// ============================================
// 【目的】
// - AI Agentの振る舞いタイプ（ペルソナ）を定義
// - ペルソナごとに異なるシステムプロンプトを提供
//
// 【定義済みペルソナ】
// 1. "" (PersonaNone): ペルソナなし（デフォルト）
// 2. "assistant" (PersonaAssistant): 親切で丁寧なアシスタント
// 3. "creative" (PersonaCreative): 創造的で発想豊か
// 4. "analytical" (PersonaAnalytical): 論理的で分析的
// 5. "concise" (PersonaConcise): 簡潔で要点を絞った応答
//
// 【システムプロンプト】
// - DefaultSystemPrompts: ペルソナごとのデフォルトプロンプト
// - Agent.GetSystemPrompt()でペルソナ + カスタムプロンプトを結合
//
// 【バリデーションルール】
// - IsValid(): 上記5つのいずれかの場合true
// - 不明なペルソナはエラー（ParsePersonaType）
//
// 【使用箇所】
// - AI Agent作成時のペルソナ選択
// - システムプロンプトの自動生成
// - UI上のペルソナ選択肢
// ============================================

func TestPersonaTypeIsValid(t *testing.T) {
	tests := []struct {
		name    string
		persona PersonaType
		want    bool
	}{
		{
			name:    "None is valid",
			persona: PersonaNone,
			want:    true,
		},
		{
			name:    "Assistant is valid",
			persona: PersonaAssistant,
			want:    true,
		},
		{
			name:    "Creative is valid",
			persona: PersonaCreative,
			want:    true,
		},
		{
			name:    "Analytical is valid",
			persona: PersonaAnalytical,
			want:    true,
		},
		{
			name:    "Concise is valid",
			persona: PersonaConcise,
			want:    true,
		},
		{
			name:    "Unknown persona is invalid",
			persona: PersonaType("unknown"),
			want:    false,
		},
		{
			name:    "Random string is invalid",
			persona: PersonaType("random"),
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.persona.IsValid(); got != tt.want {
				t.Errorf("IsValid() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPersonaTypeString(t *testing.T) {
	tests := []struct {
		name    string
		persona PersonaType
		want    string
	}{
		{
			name:    "None to string",
			persona: PersonaNone,
			want:    "",
		},
		{
			name:    "Assistant to string",
			persona: PersonaAssistant,
			want:    "assistant",
		},
		{
			name:    "Creative to string",
			persona: PersonaCreative,
			want:    "creative",
		},
		{
			name:    "Analytical to string",
			persona: PersonaAnalytical,
			want:    "analytical",
		},
		{
			name:    "Concise to string",
			persona: PersonaConcise,
			want:    "concise",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.persona.String(); got != tt.want {
				t.Errorf("String() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestParsePersonaType(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    PersonaType
		wantErr bool
	}{
		{
			name:    "Parse none (empty string)",
			input:   "",
			want:    PersonaNone,
			wantErr: false,
		},
		{
			name:    "Parse assistant",
			input:   "assistant",
			want:    PersonaAssistant,
			wantErr: false,
		},
		{
			name:    "Parse creative",
			input:   "creative",
			want:    PersonaCreative,
			wantErr: false,
		},
		{
			name:    "Parse analytical",
			input:   "analytical",
			want:    PersonaAnalytical,
			wantErr: false,
		},
		{
			name:    "Parse concise",
			input:   "concise",
			want:    PersonaConcise,
			wantErr: false,
		},
		{
			name:    "Parse unknown returns error",
			input:   "unknown",
			want:    "",
			wantErr: true,
		},
		{
			name:    "Parse invalid returns error",
			input:   "invalid",
			want:    "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParsePersonaType(tt.input)

			if (err != nil) != tt.wantErr {
				t.Errorf("ParsePersonaType() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if got != tt.want {
				t.Errorf("ParsePersonaType() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDefaultSystemPrompts(t *testing.T) {
	// 全てのペルソナにシステムプロンプトが定義されているか確認
	personas := []PersonaType{
		PersonaNone,
		PersonaAssistant,
		PersonaCreative,
		PersonaAnalytical,
		PersonaConcise,
	}

	for _, persona := range personas {
		t.Run("Prompt exists for "+persona.String(), func(t *testing.T) {
			prompt, exists := DefaultSystemPrompts[persona]
			if !exists {
				t.Errorf("DefaultSystemPrompts[%v] does not exist", persona)
			}
			if prompt == "" {
				t.Errorf("DefaultSystemPrompts[%v] is empty", persona)
			}
		})
	}
}

func TestPersonaTypeConstants(t *testing.T) {
	// 定数が期待される値を持っているか確認
	tests := []struct {
		name     string
		persona  PersonaType
		expected string
	}{
		{
			name:     "PersonaNone constant",
			persona:  PersonaNone,
			expected: "",
		},
		{
			name:     "PersonaAssistant constant",
			persona:  PersonaAssistant,
			expected: "assistant",
		},
		{
			name:     "PersonaCreative constant",
			persona:  PersonaCreative,
			expected: "creative",
		},
		{
			name:     "PersonaAnalytical constant",
			persona:  PersonaAnalytical,
			expected: "analytical",
		},
		{
			name:     "PersonaConcise constant",
			persona:  PersonaConcise,
			expected: "concise",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.persona) != tt.expected {
				t.Errorf("Constant value = %q, want %q", string(tt.persona), tt.expected)
			}
		})
	}
}
