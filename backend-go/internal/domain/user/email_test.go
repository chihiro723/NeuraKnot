package user

import (
	"testing"
)

// Email値オブジェクトの仕様
// ============================================
// 【目的】
// - ユーザーのメールアドレスを安全に管理する値オブジェクト
// - 不正なメールアドレスの登録を防ぐ
//
// 【制約条件】
// 1. 空文字列は不可
// 2. 基本的なメールアドレス形式（RFC 5322準拠）
//    - ローカル部 + @ + ドメイン名 + TLD
//    - 例: user@example.com
// 3. 許可される文字: a-z, A-Z, 0-9, ., _, %, +, -
// 4. 自動的に小文字に変換される（大文字小文字を区別しない）
//
// 【バリデーションルール】
// - @が必須
// - @の前後に文字列が必要
// - ドメインにTLD（.com, .jpなど）が必要
// - 特殊文字（スペース、日本語など）は不可
//
// 【使用箇所】
// - ユーザー登録時のメールアドレス検証
// - ログイン時の識別子
// - 通知メール送信先
// ============================================

func TestNewEmail(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{
			name:    "Valid email",
			input:   "test@example.com",
			wantErr: false,
		},
		{
			name:    "Valid email with subdomain",
			input:   "user@mail.example.com",
			wantErr: false,
		},
		{
			name:    "Valid email with plus",
			input:   "test+tag@example.com",
			wantErr: false,
		},
		{
			name:    "Valid email with numbers",
			input:   "user123@example456.com",
			wantErr: false,
		},
		{
			name:    "Empty string",
			input:   "",
			wantErr: true,
		},
		{
			name:    "Missing @",
			input:   "invalid.email.com",
			wantErr: true,
		},
		{
			name:    "Missing domain",
			input:   "test@",
			wantErr: true,
		},
		{
			name:    "Missing local part",
			input:   "@example.com",
			wantErr: true,
		},
		{
			name:    "Missing TLD",
			input:   "test@example",
			wantErr: true,
		},
		{
			name:    "Invalid characters",
			input:   "test @example.com",
			wantErr: true,
		},
		{
			name:    "Multiple @",
			input:   "test@@example.com",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			email, err := NewEmail(tt.input)

			// エラーチェック
			if (err != nil) != tt.wantErr {
				t.Errorf("NewEmail() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			// 正常系の場合、空でないことを確認
			if !tt.wantErr && email == "" {
				t.Error("Expected non-empty email for valid input")
			}
		})
	}
}

func TestEmailLowercase(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Uppercase converted to lowercase",
			input:    "Test@EXAMPLE.COM",
			expected: "test@example.com",
		},
		{
			name:     "Mixed case converted to lowercase",
			input:    "UsEr@ExAmPlE.CoM",
			expected: "user@example.com",
		},
		{
			name:     "Already lowercase",
			input:    "test@example.com",
			expected: "test@example.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			email, err := NewEmail(tt.input)
			if err != nil {
				t.Fatalf("NewEmail() unexpected error: %v", err)
			}

			if email.String() != tt.expected {
				t.Errorf("NewEmail() = %q, want %q", email.String(), tt.expected)
			}
		})
	}
}

func TestEmailString(t *testing.T) {
	email, err := NewEmail("test@example.com")
	if err != nil {
		t.Fatalf("NewEmail() unexpected error: %v", err)
	}

	if email.String() != "test@example.com" {
		t.Errorf("String() = %q, want %q", email.String(), "test@example.com")
	}
}

func TestEmailEquals(t *testing.T) {
	tests := []struct {
		name   string
		email1 string
		email2 string
		want   bool
	}{
		{
			name:   "Same emails",
			email1: "test@example.com",
			email2: "test@example.com",
			want:   true,
		},
		{
			name:   "Different emails",
			email1: "test1@example.com",
			email2: "test2@example.com",
			want:   false,
		},
		{
			name:   "Case insensitive comparison (both lowercased)",
			email1: "TEST@EXAMPLE.COM",
			email2: "test@example.com",
			want:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e1, err := NewEmail(tt.email1)
			if err != nil {
				t.Fatalf("NewEmail(email1) unexpected error: %v", err)
			}

			e2, err := NewEmail(tt.email2)
			if err != nil {
				t.Fatalf("NewEmail(email2) unexpected error: %v", err)
			}

			if got := e1.Equals(e2); got != tt.want {
				t.Errorf("Equals() = %v, want %v", got, tt.want)
			}
		})
	}
}
