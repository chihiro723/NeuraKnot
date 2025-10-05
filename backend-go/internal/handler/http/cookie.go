package http

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	AccessTokenCookie  = "access_token"
	RefreshTokenCookie = "refresh_token"

	AccessTokenMaxAge  = 3600    // 1時間
	RefreshTokenMaxAge = 2592000 // 30日
)

// SetAuthCookies 認証用Cookieを設定
func SetAuthCookies(c *gin.Context, accessToken, refreshToken string) {
	// アクセストークン
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     AccessTokenCookie,
		Value:    accessToken,
		Path:     "/",
		Domain:   "localhost", // localhostで共有
		MaxAge:   AccessTokenMaxAge,
		HttpOnly: true,
		Secure:   false, // 開発環境ではfalse（本番環境ではtrue）
		// SameSiteを設定しない（開発環境での互換性のため）
	})

	// リフレッシュトークン
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     RefreshTokenCookie,
		Value:    refreshToken,
		Path:     "/",
		Domain:   "localhost", // localhostで共有
		MaxAge:   RefreshTokenMaxAge,
		HttpOnly: true,
		Secure:   false, // 開発環境ではfalse（本番環境ではtrue）
		// SameSiteを設定しない（開発環境での互換性のため）
	})
}

// ClearAuthCookies 認証用Cookieをクリア
func ClearAuthCookies(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     AccessTokenCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Expires:  time.Unix(0, 0),
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     RefreshTokenCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Expires:  time.Unix(0, 0),
	})
}

// GetRefreshTokenFromCookie Cookieからリフレッシュトークンを取得
func GetRefreshTokenFromCookie(c *gin.Context) (string, error) {
	return c.Cookie(RefreshTokenCookie)
}
