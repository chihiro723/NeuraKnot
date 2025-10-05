package middleware

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware CORSミドルウェア（Cookie認証対応）
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// 許可するオリジンのリスト
		allowedOrigins := map[string]bool{
			"http://localhost:3000":   true, // 開発環境
			"http://localhost:3001":   true, // 開発環境（予備）
			os.Getenv("FRONTEND_URL"): true, // 本番環境
		}

		// オリジンが許可リストに含まれている場合のみ設定
		if allowedOrigins[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		// 許可するHTTPメソッド
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		// 許可するヘッダー
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")

		// プリフライトリクエストの処理
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
