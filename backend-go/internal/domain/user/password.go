package user

import "errors"

// Password パスワード値オブジェクト
type Password string

// NewPassword パスワードを作成
func NewPassword(value string) (Password, error) {
	if value == "" {
		return "", errors.New("password cannot be empty")
	}
	if len(value) < 6 {
		return "", errors.New("password must be at least 6 characters")
	}
	if len(value) > 128 {
		return "", errors.New("password must be less than 128 characters")
	}

	return Password(value), nil
}

// String 文字列表現（セキュリティ上、マスクした値を返す）
func (p Password) String() string {
	return "****"
}

// Equals 等価性の比較
func (p Password) Equals(other Password) bool {
	return p == other
}

// IsValid パスワードの有効性をチェック
func (p Password) IsValid() bool {
	return len(p) >= 6 && len(p) <= 128
}
