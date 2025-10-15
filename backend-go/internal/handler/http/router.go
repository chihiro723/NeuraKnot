package http

import (
	"backend-go/internal/crypto"
	"backend-go/internal/domain/user"
	"backend-go/internal/handler/http/middleware"
	"backend-go/internal/infrastructure/config"
	"backend-go/internal/infrastructure/database"
	"backend-go/internal/infrastructure/external"
	"backend-go/internal/infrastructure/persistence"
	userrepo "backend-go/internal/infrastructure/persistence/user"
	aiusecase "backend-go/internal/usecase/ai"
	chatusecase "backend-go/internal/usecase/chat"
	serviceusecase "backend-go/internal/usecase/service"
	userusecase "backend-go/internal/usecase/user"
	"log"
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
	aiAgentServiceRepo := persistence.NewAIAgentServiceRepository(db.DB)
	conversationRepo := persistence.NewConversationRepository(db.DB)
	messageRepo := persistence.NewMessageRepository(db.DB)
	toolUsageRepo := persistence.NewToolUsageRepository(db.DB)
	chatSessionRepo := persistence.NewChatSessionRepository(db.DB)
	aiClient := external.NewAIClient(cfg.AIService.URL, time.Duration(cfg.AIService.Timeout)*time.Second)

	// 暗号化サービスの初期化
	var encryption *crypto.EncryptionService
	if cfg.Security.EncryptionMasterKey != "" {
		var err error
		encryption, err = crypto.NewEncryptionService(cfg.Security.EncryptionMasterKey)
		if err != nil {
			log.Printf("Warning: Failed to initialize encryption service: %v", err)
			// 暗号化サービスなしで継続（サービス機能は制限される）
		}
	} else {
		log.Println("Warning: ENCRYPTION_MASTER_KEY not set, service registration will be disabled")
	}

	// Service関連の依存関係を先に初期化
	var serviceUsecase *serviceusecase.ServiceUsecase
	var serviceHandler *ServiceHandler
	if encryption != nil {
		serviceConfigRepo := persistence.NewServiceConfigRepository(db.DB, encryption)
		serviceUsecase = serviceusecase.NewServiceUsecase(serviceConfigRepo, aiAgentServiceRepo, encryption, cfg.AIService.URL)
		serviceHandler = NewServiceHandler(serviceUsecase)
	}

	// AI関連のユースケースとハンドラー
	agentUsecase := aiusecase.NewAgentUsecase(aiAgentRepo)
	chatUsecase := chatusecase.NewChatUsecase(aiAgentRepo, conversationRepo, messageRepo, toolUsageRepo, chatSessionRepo, aiAgentServiceRepo, aiClient)

	aiAgentHandler := NewAIAgentHandler(agentUsecase, serviceUsecase, aiAgentServiceRepo)
	chatHandler := NewChatHandler(chatUsecase)

	// ルートを設定
	setupRoutes(engine, userHandler, aiAgentHandler, chatHandler, serviceHandler, authService)

	return &Router{
		engine: engine,
	}
}

// setupRoutes ルートを設定
func setupRoutes(engine *gin.Engine, userHandler *UserHandler, aiAgentHandler *AIAgentHandler, chatHandler *ChatHandler, serviceHandler *ServiceHandler, authService user.AuthService) {
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
			aiAgents.PUT("/:id", aiAgentHandler.UpdateAgent)
			aiAgents.GET("/:id/services", aiAgentHandler.GetAgentServices)
			aiAgents.POST("/:id/services", aiAgentHandler.AddAgentService)
			aiAgents.PUT("/:id/services/:service_id", aiAgentHandler.UpdateAgentService)
			aiAgents.DELETE("/:id/services/:service_id", aiAgentHandler.DeleteAgentService)
		}

		// チャット関連（認証必要）
		conversations := v1.Group("/conversations")
		conversations.Use(authMiddleware.RequireAuth())
		{
			conversations.GET("", chatHandler.ListConversations)
			conversations.POST("", chatHandler.GetOrCreateConversation)
			conversations.POST("/:id/messages", chatHandler.SendMessage) // ストリーミングも自動対応
			conversations.GET("/:id/messages", chatHandler.GetMessages)
			conversations.PATCH("/:conversation_id/messages/:message_id/tools/positions", chatHandler.UpdateToolPositions)
			conversations.POST("/agent-introduction", chatHandler.SendAgentIntroduction) // AIエージェント自己紹介送信
		}

		// サービス関連（認証必要）
		if serviceHandler != nil {
			// サービス一覧・ツール一覧（Pythonプロキシ）
			services := v1.Group("/services")
			services.Use(authMiddleware.RequireAuth())
			{
				services.GET("", serviceHandler.ListServices)
				services.GET("/:service_class/tools", serviceHandler.GetServiceTools)

				// サービス設定のCRUD
				services.POST("/config", serviceHandler.CreateServiceConfig)
				services.GET("/config", serviceHandler.GetUserServiceConfigs)
				services.GET("/config/:id", serviceHandler.GetServiceConfigByID)
				services.PUT("/config/:id", serviceHandler.UpdateServiceConfig)
				services.DELETE("/config/:id", serviceHandler.DeleteServiceConfig)
			}
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
