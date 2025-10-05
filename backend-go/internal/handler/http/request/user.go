package request

// SignUpRequest ユーザー登録リクエスト
type SignUpRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	DisplayName string `json:"display_name" binding:"required,min=1,max=50"`
}

// SignInRequest ユーザーログインリクエスト
type SignInRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// UpdateProfileRequest プロフィール更新リクエスト
type UpdateProfileRequest struct {
	DisplayName string `json:"display_name" binding:"required,min=1,max=50"`
}

// ChangeEmailRequest メールアドレス変更リクエスト
type ChangeEmailRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ConfirmSignUpRequest ユーザー登録確認リクエスト
type ConfirmSignUpRequest struct {
	Email            string `json:"email" binding:"required,email"`
	ConfirmationCode string `json:"confirmation_code" binding:"required"`
}

// ForgotPasswordRequest パスワードリセット要求リクエスト
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ConfirmForgotPasswordRequest パスワードリセット確認リクエスト
type ConfirmForgotPasswordRequest struct {
	Email            string `json:"email" binding:"required,email"`
	ConfirmationCode string `json:"confirmation_code" binding:"required"`
	NewPassword      string `json:"new_password" binding:"required,min=8"`
}
