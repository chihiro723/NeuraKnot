package middleware

import (
	"go-backend/internal/domain/user"
	"go-backend/internal/handler/http/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	AccessTokenCookie = "access_token"
)

// AuthMiddleware 認証ミドルウェア
type AuthMiddleware struct {
	authService user.AuthService
}

// NewAuthMiddleware 認証ミドルウェアを作成
func NewAuthMiddleware(authService user.AuthService) *AuthMiddleware {
	return &AuthMiddleware{
		authService: authService,
	}
}

// RequireAuth 認証が必要なエンドポイント用ミドルウェア
func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// デバッグ: すべてのCookieを表示
		allCookies := c.Request.Cookies()
		for _, cookie := range allCookies {
			println("DEBUG: Cookie -", cookie.Name, ":", cookie.Value[:min(20, len(cookie.Value))]+"...")
		}

		// Cookieからアクセストークンを取得
		token, err := c.Cookie(AccessTokenCookie)
		if err != nil || token == "" {
			println("DEBUG: Failed to get access_token cookie:", err)
			c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("Authentication required"))
			c.Abort()
			return
		}

		println("DEBUG: Access token retrieved successfully, length:", len(token))

		// トークンを検証
		authResult, err := m.authService.ValidateToken(c.Request.Context(), token)
		if err != nil {
			println("DEBUG: Token validation failed:", err.Error())
			c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("Invalid token"))
			c.Abort()
			return
		}

		println("DEBUG: Token validated successfully for user ID:", string(authResult.User.ID))

		// ユーザー情報をコンテキストに保存
		c.Set("user", authResult.User)
		c.Set("token", token)

		c.Next()
	}
}

// OptionalAuth 認証がオプションのエンドポイント用ミドルウェア
func (m *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Cookieからアクセストークンを取得
		token, err := c.Cookie(AccessTokenCookie)
		if err != nil || token == "" {
			c.Next()
			return
		}

		// トークンを検証
		authResult, err := m.authService.ValidateToken(c.Request.Context(), token)
		if err != nil {
			c.Next()
			return
		}

		// ユーザー情報をコンテキストに保存
		c.Set("user", authResult.User)
		c.Set("token", token)

		c.Next()
	}
}

// GetUserFromContext コンテキストからユーザーを取得
func GetUserFromContext(c *gin.Context) (*user.User, bool) {
	userObj, exists := c.Get("user")
	if !exists {
		return nil, false
	}

	user, ok := userObj.(*user.User)
	return user, ok
}

// GetTokenFromContext コンテキストからトークンを取得
func GetTokenFromContext(c *gin.Context) (string, bool) {
	token, exists := c.Get("token")
	if !exists {
		return "", false
	}

	tokenStr, ok := token.(string)
	return tokenStr, ok
}
