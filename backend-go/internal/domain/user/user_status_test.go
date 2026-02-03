package user

import (
	"testing"
)

// UserStatus値オブジェクトの仕様
// ============================================
// 【目的】
// - ユーザーのアカウント状態を表す値オブジェクト
// - ユーザーがアプリケーションを利用可能かを管理
//
// 【定義済みステータス】
// 1. "active" (UserStatusActive): アクティブユーザー（通常利用可能）
// 2. "inactive" (UserStatusInactive): 非アクティブ（ログイン不可）
// 3. "suspended" (UserStatusSuspended): 停止中（規約違反など）
//
// 【ビジネスルール】
// - IsActive()は"active"の場合のみtrueを返す
// - 不明なステータス文字列はデフォルトで"inactive"として扱う（エラーなし）
// - ステータス変更はUser.ChangeStatus()経由で行う
//
// 【使用箇所】
// - ログイン時のアカウント状態チェック
// - 管理者によるアカウント停止処理
// - API認証ミドルウェア
// ============================================

func TestNewUserStatus(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected UserStatus
	}{
		{
			name:     "Active status",
			input:    "active",
			expected: UserStatusActive,
		},
		{
			name:     "Inactive status",
			input:    "inactive",
			expected: UserStatusInactive,
		},
		{
			name:     "Suspended status",
			input:    "suspended",
			expected: UserStatusSuspended,
		},
		{
			name:     "Unknown status defaults to inactive",
			input:    "unknown",
			expected: UserStatusInactive,
		},
		{
			name:     "Empty string defaults to inactive",
			input:    "",
			expected: UserStatusInactive,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, err := NewUserStatus(tt.input)

			// NewUserStatusはエラーを返さない（常にデフォルト値を返す）
			if err != nil {
				t.Errorf("NewUserStatus() unexpected error: %v", err)
			}

			if status != tt.expected {
				t.Errorf("NewUserStatus() = %v, want %v", status, tt.expected)
			}
		})
	}
}

func TestUserStatusString(t *testing.T) {
	tests := []struct {
		name   string
		status UserStatus
		want   string
	}{
		{
			name:   "Active",
			status: UserStatusActive,
			want:   "active",
		},
		{
			name:   "Inactive",
			status: UserStatusInactive,
			want:   "inactive",
		},
		{
			name:   "Suspended",
			status: UserStatusSuspended,
			want:   "suspended",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.status.String(); got != tt.want {
				t.Errorf("String() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestUserStatusIsActive(t *testing.T) {
	tests := []struct {
		name   string
		status UserStatus
		want   bool
	}{
		{
			name:   "Active status returns true",
			status: UserStatusActive,
			want:   true,
		},
		{
			name:   "Inactive status returns false",
			status: UserStatusInactive,
			want:   false,
		},
		{
			name:   "Suspended status returns false",
			status: UserStatusSuspended,
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.status.IsActive(); got != tt.want {
				t.Errorf("IsActive() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestUserStatusEquals(t *testing.T) {
	tests := []struct {
		name    string
		status1 UserStatus
		status2 UserStatus
		want    bool
	}{
		{
			name:    "Same active status",
			status1: UserStatusActive,
			status2: UserStatusActive,
			want:    true,
		},
		{
			name:    "Same inactive status",
			status1: UserStatusInactive,
			status2: UserStatusInactive,
			want:    true,
		},
		{
			name:    "Different statuses",
			status1: UserStatusActive,
			status2: UserStatusInactive,
			want:    false,
		},
		{
			name:    "Active vs Suspended",
			status1: UserStatusActive,
			status2: UserStatusSuspended,
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.status1.Equals(tt.status2); got != tt.want {
				t.Errorf("Equals() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestParseUserStatus(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected UserStatus
	}{
		{
			name:     "Parse active",
			input:    "active",
			expected: UserStatusActive,
		},
		{
			name:     "Parse inactive",
			input:    "inactive",
			expected: UserStatusInactive,
		},
		{
			name:     "Parse suspended",
			input:    "suspended",
			expected: UserStatusSuspended,
		},
		{
			name:     "Parse unknown defaults to inactive",
			input:    "invalid",
			expected: UserStatusInactive,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, err := ParseUserStatus(tt.input)

			if err != nil {
				t.Errorf("ParseUserStatus() unexpected error: %v", err)
			}

			if status != tt.expected {
				t.Errorf("ParseUserStatus() = %v, want %v", status, tt.expected)
			}
		})
	}
}

func TestUserStatusConstants(t *testing.T) {
	// 定数が期待される値を持っているか確認
	tests := []struct {
		name     string
		status   UserStatus
		expected string
	}{
		{
			name:     "UserStatusActive constant",
			status:   UserStatusActive,
			expected: "active",
		},
		{
			name:     "UserStatusInactive constant",
			status:   UserStatusInactive,
			expected: "inactive",
		},
		{
			name:     "UserStatusSuspended constant",
			status:   UserStatusSuspended,
			expected: "suspended",
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
