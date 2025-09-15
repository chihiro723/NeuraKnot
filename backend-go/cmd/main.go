// @title Go Backend API
// @version 1.0
// @description DDDアーキテクチャを使用したGoバックエンドAPI
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api
// @schemes http

// @securityDefinitions.basic BasicAuth
// @in header
// @name Authorization

package main

import (
	"log"
	"os"

	"go-backend/docs"
	"go-backend/internal/infra/database"
	"go-backend/internal/infra/repository"
	"go-backend/internal/interface/handler"
	"go-backend/internal/usecase"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func main() {
	// Swaggerドキュメントを初期化
	docs.SwaggerInfo.Host = "localhost:8080"
	docs.SwaggerInfo.BasePath = "/api"
	docs.SwaggerInfo.Schemes = []string{"http"}

	// 環境変数から設定を取得
	port := getEnv("PORT", "8080")
	ginMode := getEnv("GIN_MODE", "debug")

	// Ginのモードを設定
	gin.SetMode(ginMode)

	// データベース接続を初期化
	db, err := database.NewConnection()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// マイグレーションを実行
	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// マイグレーション実行後に接続を再確立
	db.Close()
	db, err = database.NewConnection()
	if err != nil {
		log.Fatalf("Failed to reconnect to database after migration: %v", err)
	}

	// リポジトリを初期化
	userRepo := repository.NewUserRepository(db)
	textRepo := repository.NewTextRepository(db)

	// ユースケースを初期化
	userUsecase := usecase.NewUserUsecase(userRepo)
	textUsecase := usecase.NewTextUsecase(textRepo)

	// ハンドラーを初期化
	userHandler := handler.NewUserHandler(userUsecase)
	textHandler := handler.NewTextHandler(textUsecase)

	// ルーターを設定
	router := setupRoutes(userHandler, textHandler)

	// サーバーを起動
	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// setupRoutes ルートを設定する
func setupRoutes(userHandler *handler.UserHandler, textHandler *handler.TextHandler) *gin.Engine {
	router := gin.Default()

	// Swaggerドキュメントのエンドポイント
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// ヘルスチェックエンドポイント
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Server is running",
		})
	})

	// API グループ
	api := router.Group("/api")
	{
		// ユーザー関連のエンドポイント
		users := api.Group("/users")
		{
			users.GET("", userHandler.GetUsers)
			users.GET("/:id", userHandler.GetUserByID)
			users.POST("", userHandler.CreateUser)
			users.PUT("/:id", userHandler.UpdateUser)
			users.DELETE("/:id", userHandler.DeleteUser)
		}

		// テキスト関連のエンドポイント
		texts := api.Group("/texts")
		{
			texts.GET("", textHandler.GetTexts)
			texts.GET("/:id", textHandler.GetTextByID)
			texts.POST("", textHandler.CreateText)
			texts.PUT("/:id", textHandler.UpdateText)
			texts.DELETE("/:id", textHandler.DeleteText)
		}
	}

	return router
}

// getEnv 環境変数を取得し、デフォルト値を返す
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
