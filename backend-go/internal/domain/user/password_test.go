package user

import (
	"strings"
	"testing"
)

// Password値オブジェクトの仕様
// ============================================
// 【目的】
// - ユーザーのパスワードを安全に扱う値オブジェクト
// - セキュリティ要件を満たすパスワードのみを許可
//
// 【制約条件】
// 1. 最小長: 6文字
// 2. 最大長: 128文字
// 3. 空文字列は不可
// 4. 許可される文字: 任意（英数字、記号、日本語など全てOK）
//
// 【セキュリティ仕様】
// - String()メソッドは実際のパスワードを返さない
// - 常に "****" を返す（ログ出力時の漏洩防止）
// - 等価性比較は可能（Equalsメソッド使用）
// - 大文字小文字は区別される
//
// 【バリデーションルール】
// - 長さが6文字未満 → エラー
// - 長さが128文字超 → エラー
// - 空文字列 → エラー
//
// 【使用箇所】
// - AWS Cognitoへのユーザー登録時
// - パスワード変更時
// ============================================

func TestNewPassword(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{
			name:    "Valid password - 6 characters",
			input:   "pass12",
			wantErr: false,
		},
		{
			name:    "Valid password - 10 characters",
			input:   "password10",
			wantErr: false,
		},
		{
			name:    "Valid password - 128 characters (max)",
			input:   strings.Repeat("a", 128),
			wantErr: false,
		},
		{
			name:    "Valid password - with special characters",
			input:   "P@ssw0rd!#$%",
			wantErr: false,
		},
		{
			name:    "Valid password - Japanese characters",
			input:   "パスワード123",
			wantErr: false,
		},
		{
			name:    "Empty string",
			input:   "",
			wantErr: true,
		},
		{
			name:    "Too short - 5 characters",
			input:   "pass1",
			wantErr: true,
		},
		{
			name:    "Too short - 1 character",
			input:   "a",
			wantErr: true,
		},
		{
			name:    "Too long - 129 characters",
			input:   strings.Repeat("a", 129),
			wantErr: true,
		},
		{
			name:    "Too long - 200 characters",
			input:   strings.Repeat("a", 200),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			password, err := NewPassword(tt.input)

			// エラーチェック
			if (err != nil) != tt.wantErr {
				t.Errorf("NewPassword() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			// 正常系の場合、空でないことを確認
			if !tt.wantErr && password == "" {
				t.Error("Expected non-empty password for valid input")
			}
		})
	}
}

func TestPasswordString(t *testing.T) {
	// セキュリティ: String()はマスクされた値を返すべき
	password, err := NewPassword("secretpassword123")
	if err != nil {
		t.Fatalf("NewPassword() unexpected error: %v", err)
	}

	masked := password.String()

	// マスクされていることを確認
	if masked == "secretpassword123" {
		t.Error("String() should return masked value, not actual password")
	}

	// "****"を返すことを確認
	if masked != "****" {
		t.Errorf("String() = %q, want %q", masked, "****")
	}
}

func TestPasswordEquals(t *testing.T) {
	tests := []struct {
		name      string
		password1 string
		password2 string
		want      bool
	}{
		{
			name:      "Same passwords",
			password1: "password123",
			password2: "password123",
			want:      true,
		},
		{
			name:      "Different passwords",
			password1: "password123",
			password2: "password456",
			want:      false,
		},
		{
			name:      "Case sensitive comparison",
			password1: "Password",
			password2: "password",
			want:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p1, err := NewPassword(tt.password1)
			if err != nil {
				t.Fatalf("NewPassword(password1) unexpected error: %v", err)
			}

			p2, err := NewPassword(tt.password2)
			if err != nil {
				t.Fatalf("NewPassword(password2) unexpected error: %v", err)
			}

			if got := p1.Equals(p2); got != tt.want {
				t.Errorf("Equals() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPasswordIsValid(t *testing.T) {
	tests := []struct {
		name     string
		password string
		want     bool
	}{
		{
			name:     "Valid - 6 characters",
			password: "pass12",
			want:     true,
		},
		{
			name:     "Valid - 128 characters",
			password: strings.Repeat("a", 128),
			want:     true,
		},
		{
			name:     "Invalid - too short (created directly)",
			password: "12345",
			want:     false,
		},
		{
			name:     "Invalid - too long (created directly)",
			password: strings.Repeat("a", 129),
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Passwordを直接作成（バリデーションをバイパス）
			password := Password(tt.password)

			if got := password.IsValid(); got != tt.want {
				t.Errorf("IsValid() = %v, want %v (length: %d)", got, tt.want, len(tt.password))
			}
		})
	}
}

func TestPasswordBoundaryValues(t *testing.T) {
	// 境界値テスト
	tests := []struct {
		name    string
		length  int
		wantErr bool
	}{
		{
			name:    "Boundary - 5 characters (invalid)",
			length:  5,
			wantErr: true,
		},
		{
			name:    "Boundary - 6 characters (valid, min)",
			length:  6,
			wantErr: false,
		},
		{
			name:    "Boundary - 7 characters (valid)",
			length:  7,
			wantErr: false,
		},
		{
			name:    "Boundary - 127 characters (valid)",
			length:  127,
			wantErr: false,
		},
		{
			name:    "Boundary - 128 characters (valid, max)",
			length:  128,
			wantErr: false,
		},
		{
			name:    "Boundary - 129 characters (invalid)",
			length:  129,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			password := strings.Repeat("a", tt.length)
			_, err := NewPassword(password)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewPassword(length=%d) error = %v, wantErr %v", tt.length, err, tt.wantErr)
			}
		})
	}
}
