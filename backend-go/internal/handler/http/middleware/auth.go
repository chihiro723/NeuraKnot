package middleware

import (
	"backend-go/internal/domain/user"
	"backend-go/internal/handler/http/response"
	"log"
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

		// Cookieからアクセストークンを取得
		token, err := c.Cookie(AccessTokenCookie)
		if err != nil || token == "" {
			// Cookieにトークンがない場合、Authorizationヘッダーから取得を試みる
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				token = authHeader[7:]
			}
		}

		if token == "" {
			c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("Authentication required"))
			c.Abort()
			return
		}

		// トークンを検証
		authResult, err := m.authService.ValidateToken(c.Request.Context(), token)
		if err != nil {
			log.Printf("[AUTH ERROR] Token validation failed: %v", err)
			c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("Invalid token"))
			c.Abort()
			return
		}

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
			// Cookieにトークンがない場合、Authorizationヘッダーから取得を試みる
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				token = authHeader[7:]
			}
		}

		if token == "" {
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
