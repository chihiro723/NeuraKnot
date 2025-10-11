package http

import (
	"backend-go/internal/domain/user"
	"backend-go/internal/handler/http/middleware"
	"backend-go/internal/handler/http/request"
	"backend-go/internal/handler/http/response"
	userusecase "backend-go/internal/usecase/user"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// UserHandler ユーザーハンドラー
type UserHandler struct {
	userService *userusecase.Service
}

// NewUserHandler ユーザーハンドラーを作成
func NewUserHandler(userService *userusecase.Service) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// SignUp ユーザー登録
// @Summary ユーザー登録
// @Description 新規ユーザーを登録します。登録後に確認コードがメールで送信されます。
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body request.SignUpRequest true "ユーザー登録情報"
// @Success 201 {object} response.AuthResultResponse "登録成功（トークンはCookieに保存）"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /auth/signup [post]
func (h *UserHandler) SignUp(c *gin.Context) {
	var req request.SignUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	authResult, err := h.userService.SignUp(c.Request.Context(), req.Email, req.Password, req.DisplayName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// SignUp後にトークンが発行された場合のみCookieに保存
	if authResult.AccessToken != "" {
		SetAuthCookies(c, authResult.AccessToken, authResult.RefreshToken)
	}

	c.JSON(http.StatusCreated, response.ToAuthResultResponse(authResult))
}

// SignIn ユーザーログイン
// @Summary ユーザーログイン
// @Description ユーザー名とパスワードでログインします
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body request.SignInRequest true "ログイン情報"
// @Success 200 {object} response.AuthResultResponse "ログイン成功（トークンはCookieに保存）"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Router /auth/signin [post]
func (h *UserHandler) SignIn(c *gin.Context) {
	var req request.SignInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	authResult, err := h.userService.SignIn(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("Invalid email or password"))
		return
	}

	SetAuthCookies(c, authResult.AccessToken, authResult.RefreshToken)
	c.JSON(http.StatusOK, response.ToAuthResultResponse(authResult))
}

// ConfirmSignUp ユーザー登録確認
// @Summary ユーザー登録確認
// @Description メールで送信された確認コードを使ってユーザー登録を確認します
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body request.ConfirmSignUpRequest true "確認コード"
// @Success 200 {object} response.MessageResponse "確認成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Router /auth/confirm-signup [post]
func (h *UserHandler) ConfirmSignUp(c *gin.Context) {
	var req request.ConfirmSignUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	err := h.userService.ConfirmSignUp(c.Request.Context(), req.Email, req.ConfirmationCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewErrorResponse(err, http.StatusBadRequest))
		return
	}

	c.JSON(http.StatusOK, response.NewSimpleMessageResponse("User confirmed successfully"))
}

// ForgotPassword パスワードリセット要求
// @Summary パスワードリセット要求
// @Description パスワードリセット用の確認コードをメールで送信します
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body request.ForgotPasswordRequest true "ユーザー名"
// @Success 200 {object} map[string]string "メール送信成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Router /auth/forgot-password [post]
func (h *UserHandler) ForgotPassword(c *gin.Context) {
	var req request.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// パスワードリセット要求
	err := h.userService.ForgotPassword(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewErrorResponse(err, http.StatusBadRequest))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset email sent"})
}

// ConfirmForgotPassword パスワードリセット確認
// @Summary パスワードリセット確認
// @Description 確認コードを使って新しいパスワードを設定します
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body request.ConfirmForgotPasswordRequest true "パスワードリセット情報"
// @Success 200 {object} map[string]string "リセット成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Router /auth/confirm-forgot-password [post]
func (h *UserHandler) ConfirmForgotPassword(c *gin.Context) {
	var req request.ConfirmForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// パスワードリセット確認
	err := h.userService.ConfirmForgotPassword(c.Request.Context(), req.Email, req.ConfirmationCode, req.NewPassword)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewErrorResponse(err, http.StatusBadRequest))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

// GetProfile プロフィール取得
// @Summary プロフィール取得
// @Description 認証済みユーザーの自分のプロフィールを取得します
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.UserResponse "プロフィール取得成功"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Router /users/profile [get]
func (h *UserHandler) GetProfile(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	userObj, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	c.JSON(http.StatusOK, response.ToUserResponse(userObj))
}

// UpdateProfile プロフィール更新
// @Summary プロフィール更新
// @Description 認証済みユーザーの表示名を更新します
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body request.UpdateProfileRequest true "更新情報"
// @Success 200 {object} response.UserResponse "更新成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /users/profile [put]
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	_, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	var req request.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// プロフィール更新
	token, _ := middleware.GetTokenFromContext(c)
	updatedUser, err := h.userService.UpdateProfile(c.Request.Context(), token, req.DisplayName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToUserResponse(updatedUser))
}

// ChangeEmail メールアドレス変更
// @Summary メールアドレス変更
// @Description 認証済みユーザーのメールアドレスを変更します
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body request.ChangeEmailRequest true "新しいメールアドレス"
// @Success 200 {object} response.UserResponse "変更成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /users/email [put]
func (h *UserHandler) ChangeEmail(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	_, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	var req request.ChangeEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// メールアドレス変更
	token, _ := middleware.GetTokenFromContext(c)
	updatedUser, err := h.userService.ChangeEmail(c.Request.Context(), token, req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToUserResponse(updatedUser))
}

// GetUserByID IDでユーザー取得
// @Summary ユーザーをIDで取得
// @Description 指定されたIDのユーザー情報を取得します
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ユーザーID"
// @Success 200 {object} response.UserResponse "ユーザー取得成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 404 {object} response.ErrorResponse "ユーザーが見つかりません"
// @Router /users/{id} [get]
func (h *UserHandler) GetUserByID(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := user.ParseUserID(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid user ID"))
		return
	}

	// ユーザー取得
	userObj, err := h.userService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.NewNotFoundErrorResponse("User not found"))
		return
	}

	c.JSON(http.StatusOK, response.ToUserResponse(userObj))
}

// ListUsers ユーザー一覧取得
// @Summary ユーザー一覧取得
// @Description ユーザーの一覧を取得します（ページネーション対応）
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param limit query int false "取得件数（デフォルト: 10）" default(10)
// @Param offset query int false "オフセット（デフォルト: 0）" default(0)
// @Success 200 {object} response.UsersResponse "ユーザー一覧取得成功"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /users [get]
func (h *UserHandler) ListUsers(c *gin.Context) {
	// クエリパラメータからlimitとoffsetを取得
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// ユーザー一覧取得
	users, err := h.userService.ListUsers(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToUsersResponse(users))
}

// RefreshToken トークンリフレッシュ
// @Summary トークンリフレッシュ
// @Description Cookieからリフレッシュトークンを取得して新しいアクセストークンを発行します
// @Tags Auth
// @Accept json
// @Produce json
// @Success 200 {object} response.MessageResponse "トークンリフレッシュ成功（新しいトークンはCookieに保存）"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /auth/refresh [post]
func (h *UserHandler) RefreshToken(c *gin.Context) {
	refreshToken, err := GetRefreshTokenFromCookie(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("Refresh token not found"))
		return
	}

	authResult, err := h.userService.RefreshToken(c.Request.Context(), refreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, response.NewErrorResponse(err, http.StatusUnauthorized))
		return
	}

	SetAuthCookies(c, authResult.AccessToken, authResult.RefreshToken)
	c.JSON(http.StatusOK, response.NewSimpleMessageResponse("Token refreshed successfully"))
}

// SignOut ログアウト
// @Summary ログアウト
// @Description ユーザーをログアウトします（グローバルサインアウト、Cookieをクリア）
// @Tags Auth
// @Accept json
// @Produce json
// @Success 200 {object} response.MessageResponse "ログアウト成功"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /auth/signout [post]
func (h *UserHandler) SignOut(c *gin.Context) {
	// Cookieからアクセストークンを取得（任意）
	token, err := c.Cookie(AccessTokenCookie)

	// トークンがある場合はCognitoのGlobalSignOutを実行
	if err == nil && token != "" {
		if err := h.userService.SignOut(c.Request.Context(), token); err != nil {
			// GlobalSignOutエラーは無視（トークンが既に無効の可能性）
			println("DEBUG: GlobalSignOut error (ignored):", err.Error())
		}
	}

	// エラーの有無に関わらず、Cookieをクリア
	ClearAuthCookies(c)
	c.JSON(http.StatusOK, response.NewSimpleMessageResponse("Successfully signed out"))
}
