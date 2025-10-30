package response

// ErrorResponse エラーレスポンス
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// NewErrorResponse エラーレスポンスを作成
func NewErrorResponse(err error, code int) *ErrorResponse {
	return &ErrorResponse{
		Error:   err.Error(),
		Message: err.Error(),
		Code:    code,
	}
}

// NewValidationErrorResponse バリデーションエラーレスポンスを作成
func NewValidationErrorResponse(message string) *ErrorResponse {
	return &ErrorResponse{
		Error:   "validation_error",
		Message: message,
		Code:    400,
	}
}

// NewUnauthorizedErrorResponse 認証エラーレスポンスを作成
func NewUnauthorizedErrorResponse(message string) *ErrorResponse {
	return &ErrorResponse{
		Error:   "unauthorized",
		Message: message,
		Code:    401,
	}
}

// NewNotFoundErrorResponse 見つからないエラーレスポンスを作成
func NewNotFoundErrorResponse(message string) *ErrorResponse {
	return &ErrorResponse{
		Error:   "not_found",
		Message: message,
		Code:    404,
	}
}

// NewInternalServerErrorResponse 内部サーバーエラーレスポンスを作成
func NewInternalServerErrorResponse(message string) *ErrorResponse {
	return &ErrorResponse{
		Error:   "internal_server_error",
		Message: message,
		Code:    500,
	}
}
