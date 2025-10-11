// @title BridgeSpeak API
// @version 1.0
// @description BridgeSpeak AI分身チャットアプリケーションのAPI
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

package main

import (
	"backend-go/internal/handler/http"
	"backend-go/internal/infrastructure/config"
	"backend-go/internal/infrastructure/database"
	"log"

	_ "backend-go/docs" // Swagger docs
)

func main() {
	// 設定を読み込み
	cfg := config.Load()

	// データベース接続を作成
	db, err := database.NewConnection(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// ルーターを作成
	router := http.NewRouter(cfg, db)

	// サーバーを起動
	addr := cfg.Server.Host + ":" + cfg.Server.Port
	log.Printf("Server starting on %s", addr)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
