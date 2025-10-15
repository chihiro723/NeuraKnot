package user

import (
	"backend-go/internal/domain/user"
	"context"
	"fmt"
)

// Service ユーザーサービス（ユースケース）
type Service struct {
	userRepo    user.UserRepository
	authService user.AuthService
}

// NewService ユーザーサービスを作成
func NewService(
	userRepo user.UserRepository,
	authService user.AuthService,
) *Service {
	return &Service{
		userRepo:    userRepo,
		authService: authService,
	}
}

// GetProfile ユーザープロフィールを取得
func (s *Service) GetProfile(ctx context.Context, token string) (*user.User, error) {
	// トークンを検証
	authResult, err := s.authService.ValidateToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("token validation failed: %w", err)
	}

	// ユーザー情報を取得
	userObj, err := s.userRepo.GetByCognitoUserID(ctx, authResult.User.CognitoUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return userObj, nil
}

// UpdateProfile ユーザープロフィールを更新
func (s *Service) UpdateProfile(ctx context.Context, token string, displayName string) (*user.User, error) {
	// トークンを検証
	authResult, err := s.authService.ValidateToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("token validation failed: %w", err)
	}

	// ユーザー情報を取得
	userObj, err := s.userRepo.GetByCognitoUserID(ctx, authResult.User.CognitoUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// 表示名を更新
	if err := userObj.ChangeDisplayName(displayName); err != nil {
		return nil, fmt.Errorf("failed to update display name: %w", err)
	}

	// データベースに保存
	if err := s.userRepo.Update(ctx, userObj); err != nil {
		return nil, fmt.Errorf("failed to save user: %w", err)
	}

	return userObj, nil
}

// ChangeEmail メールアドレスを変更
func (s *Service) ChangeEmail(ctx context.Context, token string, newEmailStr string) (*user.User, error) {
	// トークンを検証
	authResult, err := s.authService.ValidateToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("token validation failed: %w", err)
	}

	// ユーザー情報を取得
	userObj, err := s.userRepo.GetByCognitoUserID(ctx, authResult.User.CognitoUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// 新しいメールアドレスを作成
	newEmail, err := user.NewEmail(newEmailStr)
	if err != nil {
		return nil, fmt.Errorf("invalid email format: %w", err)
	}

	// メールアドレスを更新
	if err := userObj.ChangeEmail(newEmail); err != nil {
		return nil, fmt.Errorf("failed to change email: %w", err)
	}

	// データベースに保存
	if err := s.userRepo.Update(ctx, userObj); err != nil {
		return nil, fmt.Errorf("failed to save user: %w", err)
	}

	return userObj, nil
}

// SignUp ユーザー登録
func (s *Service) SignUp(ctx context.Context, email, password, displayName string) (*user.AuthResult, error) {
	// 認証サービスでユーザー登録
	authResult, err := s.authService.SignUp(ctx, email, password, displayName)
	if err != nil {
		return nil, fmt.Errorf("signup failed: %w", err)
	}

	// ユーザーエンティティを作成
	// 既にCognitoで作成されたユーザーのIDを使用
	userID := authResult.User.ID
	userEmail, err := user.NewEmail(email)
	if err != nil {
		return nil, fmt.Errorf("invalid email format: %w", err)
	}

	userObj, err := user.NewUser(userID, authResult.User.CognitoUserID, userEmail, displayName)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// データベースに保存
	if err := s.userRepo.Save(ctx, userObj); err != nil {
		return nil, fmt.Errorf("failed to save user: %w", err)
	}

	// 認証結果を返す
	return &user.AuthResult{
		User:         userObj,
		AccessToken:  authResult.AccessToken,
		RefreshToken: authResult.RefreshToken,
		ExpiresIn:    authResult.ExpiresIn,
	}, nil
}

// SignIn ユーザーログイン
func (s *Service) SignIn(ctx context.Context, email, password string) (*user.AuthResult, error) {
	// 認証サービスでログイン
	authResult, err := s.authService.SignIn(ctx, email, password)
	if err != nil {
		return nil, fmt.Errorf("signin failed: %w", err)
	}

	// メールアドレスでデータベースから既存ユーザーを取得
	// （Cognitoの認証が成功した = ユーザーは存在する）
	userEmail, err := user.NewEmail(email)
	if err != nil {
		return nil, fmt.Errorf("invalid email: %w", err)
	}

	userObj, err := s.userRepo.GetByEmail(ctx, userEmail)
	if err != nil {
		return nil, fmt.Errorf("failed to get user from database: %w", err)
	}

	// トークン情報と既存ユーザー情報を結合
	return &user.AuthResult{
		User:         userObj,
		AccessToken:  authResult.AccessToken,
		RefreshToken: authResult.RefreshToken,
		ExpiresIn:    authResult.ExpiresIn,
	}, nil
}

// GetUserByID IDでユーザーを取得
func (s *Service) GetUserByID(ctx context.Context, userID user.UserID) (*user.User, error) {
	return s.userRepo.GetByID(ctx, userID)
}

// ListUsers ユーザー一覧を取得
func (s *Service) ListUsers(ctx context.Context, limit, offset int) ([]*user.User, error) {
	return s.userRepo.List(ctx, limit, offset)
}

// ConfirmSignUp ユーザー登録確認
func (s *Service) ConfirmSignUp(ctx context.Context, email, confirmationCode string) error {
	return s.authService.ConfirmSignUp(ctx, email, confirmationCode)
}

// ForgotPassword パスワードリセット要求
func (s *Service) ForgotPassword(ctx context.Context, email string) error {
	return s.authService.ForgotPassword(ctx, email)
}

// ConfirmForgotPassword パスワードリセット確認
func (s *Service) ConfirmForgotPassword(ctx context.Context, email, confirmationCode, newPassword string) error {
	return s.authService.ConfirmForgotPassword(ctx, email, confirmationCode, newPassword)
}

// ResendConfirmationCode 確認コード再送信
func (s *Service) ResendConfirmationCode(ctx context.Context, email string) error {
	return s.authService.ResendConfirmationCode(ctx, email)
}

// RefreshToken リフレッシュトークンで新しいアクセストークンを取得
func (s *Service) RefreshToken(ctx context.Context, refreshToken string) (*user.AuthResult, error) {
	// 認証サービスでトークンをリフレッシュ
	authResult, err := s.authService.RefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, fmt.Errorf("token refresh failed: %w", err)
	}

	// リフレッシュ時はユーザー情報をDBから取得する必要はない
	// （アクセストークンから取得できるため）
	return authResult, nil
}

// SignOut ログアウト
func (s *Service) SignOut(ctx context.Context, accessToken string) error {
	// 認証サービスでログアウト
	if err := s.authService.SignOut(ctx, accessToken); err != nil {
		return fmt.Errorf("signout failed: %w", err)
	}

	return nil
}
