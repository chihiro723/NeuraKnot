package user

// UserStatus ユーザーステータス値オブジェクト
type UserStatus string

const (
	// UserStatusActive アクティブユーザー
	UserStatusActive UserStatus = "active"
	// UserStatusInactive 非アクティブユーザー
	UserStatusInactive UserStatus = "inactive"
	// UserStatusSuspended 停止ユーザー
	UserStatusSuspended UserStatus = "suspended"
)

// NewUserStatus ユーザーステータスを作成
func NewUserStatus(status string) (UserStatus, error) {
	switch status {
	case string(UserStatusActive):
		return UserStatusActive, nil
	case string(UserStatusInactive):
		return UserStatusInactive, nil
	case string(UserStatusSuspended):
		return UserStatusSuspended, nil
	default:
		return UserStatusInactive, nil
	}
}

// String 文字列表現
func (s UserStatus) String() string {
	return string(s)
}

// IsActive アクティブかどうかを判定
func (s UserStatus) IsActive() bool {
	return s == UserStatusActive
}

// Equals 等価性の比較
func (s UserStatus) Equals(other UserStatus) bool {
	return s == other
}

// ParseUserStatus 文字列からUserStatusを解析
func ParseUserStatus(value string) (UserStatus, error) {
	return NewUserStatus(value)
}
