package response

import "backend-go/internal/domain/user"

// UserResponse ユーザーレスポンス
type UserResponse struct {
	ID            string `json:"id"`
	CognitoUserID string `json:"cognito_user_id"`
	Email         string `json:"email"`
	DisplayName   string `json:"display_name"`
	Status        string `json:"status"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

// ToUserResponse ドメインオブジェクトからレスポンスに変換
func ToUserResponse(u *user.User) *UserResponse {
	return &UserResponse{
		ID:            u.ID.String(),
		CognitoUserID: u.CognitoUserID,
		Email:         u.Email.String(),
		DisplayName:   u.DisplayName,
		Status:        u.Status.String(),
		CreatedAt:     u.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:     u.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// AuthResultResponse 認証結果レスポンス（トークンはCookieで管理）
type AuthResultResponse struct {
	User      *UserResponse `json:"user"`
	ExpiresIn int64         `json:"expires_in"`
}

// ToAuthResultResponse ドメインオブジェクトからレスポンスに変換
func ToAuthResultResponse(authResult *user.AuthResult) *AuthResultResponse {
	return &AuthResultResponse{
		User:      ToUserResponse(authResult.User),
		ExpiresIn: authResult.ExpiresIn,
	}
}

// UsersResponse ユーザー一覧レスポンス
type UsersResponse struct {
	Users []*UserResponse `json:"users"`
	Total int             `json:"total"`
}

// ToUsersResponse ドメインオブジェクトからレスポンスに変換
func ToUsersResponse(users []*user.User) *UsersResponse {
	userResponses := make([]*UserResponse, len(users))
	for i, u := range users {
		userResponses[i] = ToUserResponse(u)
	}

	return &UsersResponse{
		Users: userResponses,
		Total: len(users),
	}
}

// SimpleMessageResponse シンプルメッセージレスポンス
type SimpleMessageResponse struct {
	Message string `json:"message"`
}

// NewSimpleMessageResponse シンプルメッセージレスポンスを作成
func NewSimpleMessageResponse(message string) *SimpleMessageResponse {
	return &SimpleMessageResponse{
		Message: message,
	}
}
