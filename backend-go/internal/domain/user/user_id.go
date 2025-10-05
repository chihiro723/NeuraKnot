package user

import "errors"

// UserID ユーザーID値オブジェクト
type UserID string

// NewUserID ユーザーIDを作成
func NewUserID(value string) (UserID, error) {
	if value == "" {
		return "", errors.New("user ID cannot be empty")
	}
	if len(value) < 3 {
		return "", errors.New("user ID must be at least 3 characters")
	}
	return UserID(value), nil
}

// String 文字列表現
func (u UserID) String() string {
	return string(u)
}

// Equals 等価性の比較
func (u UserID) Equals(other UserID) bool {
	return u == other
}

// ParseUserID 文字列からUserIDを解析
func ParseUserID(value string) (UserID, error) {
	return NewUserID(value)
}
