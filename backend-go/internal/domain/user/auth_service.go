package user

import (
	"context"
)

// AuthResult 認証結果
type AuthResult struct {
	User         *User
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
}

// UserInfo ユーザー情報
type UserInfo struct {
	CognitoUserID string
	Email         string
	DisplayName   string
	Status        string
}

// TokenPair トークンペア
type TokenPair struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
}

// AuthService 認証サービスインターフェース
type AuthService interface {
	// トークン管理
	ValidateToken(ctx context.Context, token string) (*AuthResult, error)
	RefreshToken(ctx context.Context, refreshToken string) (*AuthResult, error)
	SignOut(ctx context.Context, accessToken string) error

	// 認証フロー
	SignUp(ctx context.Context, email, password, displayName string) (*AuthResult, error)
	SignIn(ctx context.Context, email, password string) (*AuthResult, error)
	ConfirmSignUp(ctx context.Context, email, confirmationCode string) error
	ForgotPassword(ctx context.Context, email string) error
	ConfirmForgotPassword(ctx context.Context, email, confirmationCode, newPassword string) error
}
