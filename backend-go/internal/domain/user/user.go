package user

import (
	"errors"
	"time"
)

// User ユーザーエンティティ（集約ルート）
type User struct {
	ID            UserID
	CognitoUserID string
	Email         Email
	DisplayName   string
	Status        UserStatus
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// NewUser ユーザーを作成（集約ルート）
func NewUser(id UserID, cognitoUserID string, email Email, displayName string) (*User, error) {
	if cognitoUserID == "" {
		return nil, errors.New("cognito user ID cannot be empty")
	}
	if displayName == "" {
		return nil, errors.New("display name cannot be empty")
	}

	now := time.Now()
	user := &User{
		ID:            id,
		CognitoUserID: cognitoUserID,
		Email:         email,
		DisplayName:   displayName,
		Status:        UserStatusActive,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	return user, nil
}

// ChangeEmail メールアドレスを変更
func (u *User) ChangeEmail(newEmail Email) error {
	if !newEmail.Equals(u.Email) {
		u.Email = newEmail
		u.UpdatedAt = time.Now()
	}
	return nil
}

// ChangeDisplayName 表示名を変更
func (u *User) ChangeDisplayName(newDisplayName string) error {
	if newDisplayName == "" {
		return errors.New("display name cannot be empty")
	}
	if u.DisplayName != newDisplayName {
		u.DisplayName = newDisplayName
		u.UpdatedAt = time.Now()
	}
	return nil
}

// ChangeStatus ステータスを変更
func (u *User) ChangeStatus(newStatus UserStatus) error {
	if !newStatus.Equals(u.Status) {
		u.Status = newStatus
		u.UpdatedAt = time.Now()
	}
	return nil
}

// IsActive アクティブかどうかを判定
func (u *User) IsActive() bool {
	return u.Status.IsActive()
}

// Validate ユーザーのバリデーション
func (u *User) Validate() error {
	if u.CognitoUserID == "" {
		return errors.New("cognito user ID is required")
	}
	if u.DisplayName == "" {
		return errors.New("display name is required")
	}
	return nil
}
