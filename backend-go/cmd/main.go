package main

import (
	"log"
	"os"

	"go-backend/internal/interface/handler"
	"go-backend/internal/infra/database"
	"go-backend/internal/infra/repository"
	"go-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

func main() {
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

	// リポジトリを初期化
	userRepo := repository.NewUserRepository(db)

	// ユースケースを初期化
	userUsecase := usecase.NewUserUsecase(userRepo)

	// ハンドラーを初期化
	userHandler := handler.NewUserHandler(userUsecase)

	// ルーターを設定
	router := setupRoutes(userHandler)

	// サーバーを起動
	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// setupRoutes ルートを設定する
func setupRoutes(userHandler *handler.UserHandler) *gin.Engine {
	router := gin.Default()

	// ヘルスチェックエンドポイント
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"message": "Server is running",
		})
	})

	// API v1 グループ
	v1 := router.Group("/api/v1")
	{
		// ユーザー関連のエンドポイント
		users := v1.Group("/users")
		{
			users.GET("", userHandler.GetUsers)
			users.GET("/:id", userHandler.GetUserByID)
			users.POST("", userHandler.CreateUser)
			users.PUT("/:id", userHandler.UpdateUser)
			users.DELETE("/:id", userHandler.DeleteUser)
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
