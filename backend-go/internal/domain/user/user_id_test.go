package user

import (
	"testing"
)

// UserID値オブジェクトの仕様
// ============================================
// 【目的】
// - ユーザーの一意な識別子を表す値オブジェクト
// - UUID文字列を想定（CognitoのサブIDなど）
//
// 【制約条件】
// 1. 空文字列は不可
// 2. 最小長: 3文字
// 3. 文字種: 任意（UUID形式を推奨するが強制はしない）
//
// 【使用箇所】
// - Userエンティティの主キー
// - 他エンティティからの外部キー参照
// - API応答での識別子
// ============================================

func TestNewUserID(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{
			name:    "Valid UUID format",
			input:   "550e8400-e29b-41d4-a716-446655440000",
			wantErr: false,
		},
		{
			name:    "Valid short ID (3 characters)",
			input:   "abc",
			wantErr: false,
		},
		{
			name:    "Valid long ID",
			input:   "user-1234567890",
			wantErr: false,
		},
		{
			name:    "Empty string",
			input:   "",
			wantErr: true,
		},
		{
			name:    "Too short (2 characters)",
			input:   "ab",
			wantErr: true,
		},
		{
			name:    "Too short (1 character)",
			input:   "a",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userID, err := NewUserID(tt.input)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewUserID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && userID == "" {
				t.Error("Expected non-empty UserID for valid input")
			}

			if !tt.wantErr && userID.String() != tt.input {
				t.Errorf("UserID.String() = %q, want %q", userID.String(), tt.input)
			}
		})
	}
}

func TestUserIDString(t *testing.T) {
	input := "test-user-123"
	userID, err := NewUserID(input)
	if err != nil {
		t.Fatalf("NewUserID() unexpected error: %v", err)
	}

	if userID.String() != input {
		t.Errorf("String() = %q, want %q", userID.String(), input)
	}
}

func TestUserIDEquals(t *testing.T) {
	tests := []struct {
		name string
		id1  string
		id2  string
		want bool
	}{
		{
			name: "Same IDs",
			id1:  "user-123",
			id2:  "user-123",
			want: true,
		},
		{
			name: "Different IDs",
			id1:  "user-123",
			id2:  "user-456",
			want: false,
		},
		{
			name: "Case sensitive",
			id1:  "User-123",
			id2:  "user-123",
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userID1, err := NewUserID(tt.id1)
			if err != nil {
				t.Fatalf("NewUserID(id1) unexpected error: %v", err)
			}

			userID2, err := NewUserID(tt.id2)
			if err != nil {
				t.Fatalf("NewUserID(id2) unexpected error: %v", err)
			}

			if got := userID1.Equals(userID2); got != tt.want {
				t.Errorf("Equals() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestParseUserID(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{
			name:    "Valid ID",
			input:   "test-123",
			wantErr: false,
		},
		{
			name:    "Empty string",
			input:   "",
			wantErr: true,
		},
		{
			name:    "Too short",
			input:   "ab",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userID, err := ParseUserID(tt.input)

			if (err != nil) != tt.wantErr {
				t.Errorf("ParseUserID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && userID.String() != tt.input {
				t.Errorf("ParseUserID() = %q, want %q", userID.String(), tt.input)
			}
		})
	}
}
