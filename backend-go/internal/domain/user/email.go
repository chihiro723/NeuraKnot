package user

import (
	"errors"
	"regexp"
	"strings"
)

// Email メールアドレス値オブジェクト
type Email string

// NewEmail メールアドレスを作成
func NewEmail(value string) (Email, error) {
	if value == "" {
		return "", errors.New("email cannot be empty")
	}

	// 基本的なメール形式チェック
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(value) {
		return "", errors.New("invalid email format")
	}

	return Email(strings.ToLower(value)), nil
}

// String 文字列表現
func (e Email) String() string {
	return string(e)
}

// Equals 等価性の比較
func (e Email) Equals(other Email) bool {
	return e == other
}
