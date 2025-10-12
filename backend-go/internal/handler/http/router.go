package http

import (
	"backend-go/internal/domain/user"
	"backend-go/internal/handler/http/middleware"
	"backend-go/internal/infrastructure/config"
	"backend-go/internal/infrastructure/database"
	"backend-go/internal/infrastructure/external"
	"backend-go/internal/infrastructure/persistence"
	userrepo "backend-go/internal/infrastructure/persistence/user"
	aiusecase "backend-go/internal/usecase/ai"
	chatusecase "backend-go/internal/usecase/chat"
	userusecase "backend-go/internal/usecase/user"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// Router HTTPルーター
type Router struct {
	engine *gin.Engine
}

// NewRouter ルーターを作成
func NewRouter(cfg *config.Config, db *database.Connection) *Router {
	// Ginエンジンを設定
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()

	// ミドルウェアを設定
	engine.Use(gin.Logger())
	engine.Use(gin.Recovery())
	engine.Use(middleware.CORSMiddleware())

	// 依存関係を注入
	userRepo := userrepo.NewRepository(db.DB)
	authService, err := external.NewCognitoService(cfg, userRepo)
	if err != nil {
		panic("Failed to create Cognito service: " + err.Error())
	}

	userService := userusecase.NewService(userRepo, authService)
	userHandler := NewUserHandler(userService)

	// AI関連の依存関係
	aiAgentRepo := persistence.NewAIAgentRepository(db.DB)
	conversationRepo := persistence.NewConversationRepository(db.DB)
	messageRepo := persistence.NewMessageRepository(db.DB)
	toolUsageRepo := persistence.NewToolUsageRepository(db.DB)
	chatSessionRepo := persistence.NewChatSessionRepository(db.DB)
	aiClient := external.NewAIClient(cfg.AIService.URL, time.Duration(cfg.AIService.Timeout)*time.Second)

	// AI関連のユースケースとハンドラー
	agentUsecase := aiusecase.NewAgentUsecase(aiAgentRepo)
	chatUsecase := chatusecase.NewChatUsecase(aiAgentRepo, conversationRepo, messageRepo, toolUsageRepo, chatSessionRepo, aiClient)

	aiAgentHandler := NewAIAgentHandler(agentUsecase)
	chatHandler := NewChatHandler(chatUsecase)

	// ルートを設定
	setupRoutes(engine, userHandler, aiAgentHandler, chatHandler, authService)

	return &Router{
		engine: engine,
	}
}

// setupRoutes ルートを設定
func setupRoutes(engine *gin.Engine, userHandler *UserHandler, aiAgentHandler *AIAgentHandler, chatHandler *ChatHandler, authService user.AuthService) {
	// ヘルスチェック
	engine.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Swagger UI
	engine.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// API v1
	v1 := engine.Group("/api/v1")
	{
		// 認証関連（認証不要）
		auth := v1.Group("/auth")
		{
			auth.POST("/signup", userHandler.SignUp)
			auth.POST("/signin", userHandler.SignIn)
			auth.POST("/confirm-signup", userHandler.ConfirmSignUp)
			auth.POST("/forgot-password", userHandler.ForgotPassword)
			auth.POST("/confirm-forgot-password", userHandler.ConfirmForgotPassword)
			auth.POST("/refresh", userHandler.RefreshToken)
			auth.POST("/signout", userHandler.SignOut) // 認証不要（冪等性のため）
		}

		// 認証ミドルウェア
		authMiddleware := middleware.NewAuthMiddleware(authService)

		// ユーザー関連（認証必要）
		users := v1.Group("/users")
		users.Use(authMiddleware.RequireAuth())
		{
			users.GET("/profile", userHandler.GetProfile)
			users.PUT("/profile", userHandler.UpdateProfile)
			users.PUT("/email", userHandler.ChangeEmail)
			users.GET("/:id", userHandler.GetUserByID)
			users.GET("", userHandler.ListUsers)
		}

		// AI Agent関連（認証必要）
		aiAgents := v1.Group("/ai-agents")
		aiAgents.Use(authMiddleware.RequireAuth())
		{
			aiAgents.POST("", aiAgentHandler.CreateAgent)
			aiAgents.GET("", aiAgentHandler.ListAgents)
			aiAgents.GET("/:id", aiAgentHandler.GetAgent)
		}

		// チャット関連（認証必要）
		conversations := v1.Group("/conversations")
		conversations.Use(authMiddleware.RequireAuth())
		{
			conversations.GET("", chatHandler.ListConversations)
			conversations.POST("", chatHandler.GetOrCreateConversation)
			conversations.POST("/:id/messages", chatHandler.SendMessage)
			conversations.POST("/:id/messages/stream", chatHandler.SendMessageStream)
			conversations.GET("/:id/messages", chatHandler.GetMessages)
			conversations.PATCH("/:conversation_id/messages/:message_id/tools/positions", chatHandler.UpdateToolPositions)
		}
	}
}

// Run サーバーを起動
func (r *Router) Run(addr string) error {
	return r.engine.Run(addr)
}

// GetEngine Ginエンジンを取得
func (r *Router) GetEngine() *gin.Engine {
	return r.engine
}
