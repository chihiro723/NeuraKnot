package ai

import (
	"testing"
)

// Provider値オブジェクトの仕様
// ============================================
// 【目的】
// - LLMプロバイダー（提供元）を表す値オブジェクト
// - サポートされているプロバイダーのみを許可
//
// 【定義済みプロバイダー】
// 1. "openai" (ProviderOpenAI): OpenAI (GPT-4, GPT-4o, etc.)
// 2. "anthropic" (ProviderAnthropic): Anthropic (Claude)
// 3. "google" (ProviderGoogle): Google (Gemini)
//
// 【バリデーションルール】
// - IsValid(): 上記3つのいずれかの場合true
// - 不明なプロバイダーはエラー（ParseProvider）
//
// 【使用箇所】
// - AI Agent作成時のプロバイダー選択
// - LLM料金計算（billing.LLMPricing）
// - Python AI Serverへのモデル指定
//
// 【今後の拡張】
// - 新しいプロバイダー追加時は定数とIsValid()を更新
// - 例: Cohere, Mistral, Perplexity など
// ============================================

func TestProviderIsValid(t *testing.T) {
	tests := []struct {
		name     string
		provider Provider
		want     bool
	}{
		{
			name:     "OpenAI is valid",
			provider: ProviderOpenAI,
			want:     true,
		},
		{
			name:     "Anthropic is valid",
			provider: ProviderAnthropic,
			want:     true,
		},
		{
			name:     "Google is valid",
			provider: ProviderGoogle,
			want:     true,
		},
		{
			name:     "Unknown provider is invalid",
			provider: Provider("unknown"),
			want:     false,
		},
		{
			name:     "Empty string is invalid",
			provider: Provider(""),
			want:     false,
		},
		{
			name:     "Cohere (not supported) is invalid",
			provider: Provider("cohere"),
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.provider.IsValid(); got != tt.want {
				t.Errorf("IsValid() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestProviderString(t *testing.T) {
	tests := []struct {
		name     string
		provider Provider
		want     string
	}{
		{
			name:     "OpenAI to string",
			provider: ProviderOpenAI,
			want:     "openai",
		},
		{
			name:     "Anthropic to string",
			provider: ProviderAnthropic,
			want:     "anthropic",
		},
		{
			name:     "Google to string",
			provider: ProviderGoogle,
			want:     "google",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.provider.String(); got != tt.want {
				t.Errorf("String() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestParseProvider(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		want     Provider
		wantErr  bool
	}{
		{
			name:    "Parse openai",
			input:   "openai",
			want:    ProviderOpenAI,
			wantErr: false,
		},
		{
			name:    "Parse anthropic",
			input:   "anthropic",
			want:    ProviderAnthropic,
			wantErr: false,
		},
		{
			name:    "Parse google",
			input:   "google",
			want:    ProviderGoogle,
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
		{
			name:    "Parse unsupported provider returns error",
			input:   "cohere",
			want:    "",
			wantErr: true,
		},
		{
			name:    "Parse case sensitive (OpenAI) returns error",
			input:   "OpenAI",
			want:    "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseProvider(tt.input)

			if (err != nil) != tt.wantErr {
				t.Errorf("ParseProvider() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if got != tt.want {
				t.Errorf("ParseProvider() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestProviderConstants(t *testing.T) {
	// 定数が期待される値を持っているか確認
	tests := []struct {
		name     string
		provider Provider
		expected string
	}{
		{
			name:     "ProviderOpenAI constant",
			provider: ProviderOpenAI,
			expected: "openai",
		},
		{
			name:     "ProviderAnthropic constant",
			provider: ProviderAnthropic,
			expected: "anthropic",
		},
		{
			name:     "ProviderGoogle constant",
			provider: ProviderGoogle,
			expected: "google",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.provider) != tt.expected {
				t.Errorf("Constant value = %q, want %q", string(tt.provider), tt.expected)
			}
		})
	}
}
