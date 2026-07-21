package http

import (
	"backend-go/internal/crypto"
	"backend-go/internal/domain/service"
	"backend-go/internal/domain/user"
	"backend-go/internal/handler/http/middleware"
	"backend-go/internal/infrastructure/config"
	"backend-go/internal/infrastructure/database"
	"backend-go/internal/infrastructure/external"
	"backend-go/internal/infrastructure/persistence"
	userrepo "backend-go/internal/infrastructure/persistence/user"
	"backend-go/internal/infrastructure/storage"
	aiusecase "backend-go/internal/usecase/ai"
	analyticsusecase "backend-go/internal/usecase/analytics"
	billingusecase "backend-go/internal/usecase/billing"
	chatusecase "backend-go/internal/usecase/chat"
	chatpinusecase "backend-go/internal/usecase/chatpin"
	groupchatusecase "backend-go/internal/usecase/groupchat"
	llmmodelusecase "backend-go/internal/usecase/llmmodel"
	llmpricingusecase "backend-go/internal/usecase/llmpricing"
	serviceusecase "backend-go/internal/usecase/service"
	"backend-go/internal/usecase/usage"
	userusecase "backend-go/internal/usecase/user"
	"backend-go/pkg/money"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// SimpleLogger シンプルなロガー実装（パッケージ外のloggerが使えない場合の代替）
type SimpleLogger struct {
	infoLogger  *log.Logger
	errorLogger *log.Logger
}

func NewSimpleLogger() *SimpleLogger {
	return &SimpleLogger{
		infoLogger:  log.New(os.Stdout, "[INFO] ", log.LstdFlags),
		errorLogger: log.New(os.Stderr, "[ERROR] ", log.LstdFlags),
	}
}

func (l *SimpleLogger) Info(msg string, args ...interface{}) {
	l.infoLogger.Printf(msg, args...)
}

func (l *SimpleLogger) Error(msg string, args ...interface{}) {
	l.errorLogger.Printf(msg, args...)
}

func (l *SimpleLogger) Debug(msg string, args ...interface{}) {
	l.infoLogger.Printf("[DEBUG] "+msg, args...)
}

func (l *SimpleLogger) Warn(msg string, args ...interface{}) {
	l.infoLogger.Printf("[WARN] "+msg, args...)
}

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

	// S3/MinIOクライアントの初期化
	s3Client, err := storage.NewS3Client(
		cfg.S3.BucketName,
		cfg.S3.Region,
		cfg.S3.Endpoint,
		cfg.S3.BaseURL,
		cfg.S3.AccessKeyID,
		cfg.S3.SecretAccessKey,
	)
	if err != nil {
		panic("Failed to create S3 client: " + err.Error())
	}

	// 依存関係を注入
	userRepo := userrepo.NewRepository(db.DB)
	authService, err := external.NewCognitoService(cfg, userRepo)
	if err != nil {
		panic("Failed to create Cognito service: " + err.Error())
	}

	userService := userusecase.NewService(userRepo, authService, s3Client)
	userHandler := NewUserHandler(userService)

	// AI関連の依存関係
	aiAgentRepo := persistence.NewAIAgentRepository(db.DB)
	aiAgentServiceRepo := persistence.NewAIAgentServiceRepository(db.DB)
	conversationRepo := persistence.NewConversationRepository(db.DB)
	messageRepo := persistence.NewMessageRepository(db.DB)
	toolUsageRepo := persistence.NewToolUsageRepository(db.DB)
	chatSessionRepo := persistence.NewChatSessionRepository(db.DB)
	aiClient := external.NewAIClient(cfg.AIService.URL, time.Duration(cfg.AIService.Timeout)*time.Second)

	// 使用量・コスト記録の単一経路（チャット/グループ/補助利用すべてここを通す）
	llmPricingRepo := persistence.NewLLMPricingRepository(db.DB)
	tokenUsageRepo := persistence.NewTokenUsageRepository(db.DB)
	usageRecorder := usage.NewRecorder(llmPricingRepo, chatSessionRepo, tokenUsageRepo)

	// 暗号化サービスの初期化
	var encryption *crypto.EncryptionService
	if cfg.Security.EncryptionMasterKey != "" {
		var encErr error
		encryption, encErr = crypto.NewEncryptionService(cfg.Security.EncryptionMasterKey)
		if encErr != nil {
			log.Printf("Warning: Failed to initialize encryption service: %v", encErr)
			// 暗号化サービスなしで継続（サービス機能は制限される）
		}
	} else {
		log.Println("Warning: ENCRYPTION_MASTER_KEY not set, service registration will be disabled")
	}

	// Service関連の依存関係を先に初期化
	var serviceUsecase *serviceusecase.ServiceUsecase
	var serviceHandler *ServiceHandler
	var serviceConfigRepo service.ServiceConfigRepository
	if encryption != nil {
		serviceConfigRepo = persistence.NewServiceConfigRepository(db.DB, encryption)
		serviceUsecase = serviceusecase.NewServiceUsecase(serviceConfigRepo, aiAgentServiceRepo, encryption, cfg.AIService.URL)
		serviceHandler = NewServiceHandler(serviceUsecase)
	}

	// ChatPin（ピン留め機能）の依存関係
	// エージェント／グループ削除時の掃除にも使うので、AI／GroupChat ユースケースより先に初期化する
	chatPinRepo := persistence.NewChatPinRepository(db.DB)

	// LLMモデルレジストリ・単価マスタ関連の依存関係
	llmModelRepo := persistence.NewLLMModelRepository(db.DB)
	llmModelUsecase := llmmodelusecase.NewUsecase(llmModelRepo)
	llmPricingUsecase := llmpricingusecase.NewUsecase(llmPricingRepo, llmModelRepo)
	llmModelHandler := NewLLMModelHandler(llmModelUsecase, llmPricingUsecase)
	llmPricingHandler := NewLLMPricingHandler(llmPricingUsecase)

	// AI関連のユースケースとハンドラー
	agentUsecase := aiusecase.NewAgentUsecase(aiAgentRepo, s3Client, chatPinRepo, llmModelUsecase)
	chatUsecase := chatusecase.NewChatUsecase(aiAgentRepo, conversationRepo, messageRepo, toolUsageRepo, usageRecorder, aiAgentServiceRepo, serviceConfigRepo, userRepo, aiClient, llmModelUsecase)

	aiAgentHandler := NewAIAgentHandler(agentUsecase, serviceUsecase, aiAgentServiceRepo)
	chatHandler := NewChatHandler(chatUsecase, cfg.AIService.URL, usageRecorder)

	// Prompt関連のハンドラー
	promptHandler := NewPromptHandler(cfg.AIService.URL)

	// Analytics関連のハンドラー
	analyticsRepo := persistence.NewAnalyticsRepository(db.DB)
	analyticsUsecase := analyticsusecase.NewAnalyticsUsecase(analyticsRepo)
	analyticsHandler := NewAnalyticsHandler(analyticsUsecase)

	// Billing関連のハンドラー
	stripeClient := external.NewStripeClient(cfg.Stripe.SecretKey)
	billingUsecase := billingusecase.NewBillingUseCase(
		tokenUsageRepo,
		userRepo,
		stripeClient,
		db.DB,
		cfg.Stripe.PriceIDPro,
		cfg.Stripe.PriceIDMax,
		cfg.EnableSubscription,
	)
	billingHandler := NewBillingHandler(billingUsecase)

	// Webhook関連のハンドラー
	simpleLogger := NewSimpleLogger() // シンプルなロガーを作成
	webhookHandler := NewWebhookHandler(billingUsecase, userRepo, cfg.Stripe.WebhookSecret, cfg, simpleLogger)

	// GroupChat関連のハンドラー
	groupChatRepo := persistence.NewGroupChatRepository(db.DB)
	groupMemberRepo := persistence.NewGroupMemberRepository(db.DB)
	groupMessageRepo := persistence.NewGroupMessageRepository(db.DB, toolUsageRepo)
	messageMentionRepo := persistence.NewMessageMentionRepository(db.DB)
	groupChatUsecase := groupchatusecase.NewGroupChatUsecase(groupChatRepo, groupMemberRepo, s3Client, chatPinRepo)
	groupMessageUsecase := groupchatusecase.NewGroupMessageUsecase(groupChatRepo, groupMemberRepo, groupMessageRepo, messageMentionRepo, usageRecorder, toolUsageRepo, aiAgentRepo, aiAgentServiceRepo, serviceConfigRepo, aiClient)
	groupChatHandler := NewGroupChatHandler(groupChatUsecase, groupMessageUsecase, cfg.AIService.URL, usageRecorder)

	// ChatPin 関連のハンドラー
	chatPinUsecase := chatpinusecase.NewChatPinUsecase(chatPinRepo, aiAgentRepo, groupChatRepo)
	chatPinHandler := NewChatPinHandler(chatPinUsecase)

	// Upload関連のハンドラー
	uploadHandler := NewUploadHandler(userService, agentUsecase, groupChatUsecase, s3Client)

	// ルートを設定
	setupRoutes(engine, userHandler, aiAgentHandler, chatHandler, serviceHandler, promptHandler, analyticsHandler, llmModelHandler, llmPricingHandler, billingHandler, groupChatHandler, chatPinHandler, uploadHandler, webhookHandler, authService)

	return &Router{
		engine: engine,
	}
}

// setupRoutes ルートを設定
func setupRoutes(engine *gin.Engine, userHandler *UserHandler, aiAgentHandler *AIAgentHandler, chatHandler *ChatHandler, serviceHandler *ServiceHandler, promptHandler *PromptHandler, analyticsHandler *AnalyticsHandler, llmModelHandler *LLMModelHandler, llmPricingHandler *LLMPricingHandler, billingHandler *BillingHandler, groupChatHandler *GroupChatHandler, chatPinHandler *ChatPinHandler, uploadHandler *UploadHandler, webhookHandler *WebhookHandler, authService user.AuthService) {
	// ヘルスチェック（ALB用に/api/healthも追加）
	engine.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	engine.GET("/api/health", func(c *gin.Context) {
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
			auth.POST("/resend-confirmation-code", userHandler.ResendConfirmationCode)
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
			aiAgents.DELETE("/:id", aiAgentHandler.DeleteAgent)
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
			conversations.POST("/:id/messages", chatHandler.SendMessage) // ストリーミング/クライアント推論も自動対応
			conversations.POST("/:id/messages/complete", chatHandler.CompleteClientInference) // ブラウザ(WebLLM)推論結果の保存
			conversations.GET("/:id/messages", chatHandler.GetMessages)
			conversations.GET("/:id/suggested-questions", chatHandler.GenerateSuggestedQuestions)
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
				services.POST("/validate", serviceHandler.ValidateServiceAuth)

				// サービス設定のCRUD
				services.POST("/config", serviceHandler.CreateServiceConfig)
				services.GET("/config", serviceHandler.GetUserServiceConfigs)
				services.GET("/config/:id", serviceHandler.GetServiceConfigByID)
				services.PUT("/config/:id", serviceHandler.UpdateServiceConfig)
				services.DELETE("/config/:id", serviceHandler.DeleteServiceConfig)
			}
		}

		// プロンプト強化関連（認証必要）
		prompts := v1.Group("/prompts")
		prompts.Use(authMiddleware.RequireAuth())
		{
			prompts.POST("/enhance", promptHandler.EnhancePrompt)
		}

		// 統計・分析関連（認証必要）
		analyticsRoutes := v1.Group("/analytics")
		analyticsRoutes.Use(authMiddleware.RequireAuth())
		{
			analyticsRoutes.GET("", analyticsHandler.GetUserAnalytics)
		}

		// LLMモデル関連（認証必要）
		llmModels := v1.Group("/llm-models")
		llmModels.Use(authMiddleware.RequireAuth())
		{
			llmModels.GET("", llmModelHandler.ListModels)
		}

		// 管理用 LLMモデル操作（暫定: 認証のみ）
		adminLLMModels := v1.Group("/admin/llm-models")
		adminLLMModels.Use(authMiddleware.RequireAuth())
		{
			adminLLMModels.POST("", llmModelHandler.CreateModel)
			adminLLMModels.PATCH("/:id", llmModelHandler.UpdateModel)
			adminLLMModels.PATCH("/:id/enabled", llmModelHandler.UpdateModelEnabled)
			adminLLMModels.DELETE("/:id", llmModelHandler.DeleteModel)
		}

		// LLM単価（認証ユーザー向け: 現行単価一覧）
		llmPricing := v1.Group("/llm-pricing")
		llmPricing.Use(authMiddleware.RequireAuth())
		{
			llmPricing.GET("", llmPricingHandler.ListCurrentPricing)
		}

		// 管理用 LLM単価操作（暫定: 認証のみ）
		adminLLMPricing := v1.Group("/admin/llm-pricing")
		adminLLMPricing.Use(authMiddleware.RequireAuth())
		{
			adminLLMPricing.POST("", llmPricingHandler.CreatePricing)
			adminLLMPricing.POST("/:id/revise", llmPricingHandler.RevisePricing)
			adminLLMPricing.GET("/history", llmPricingHandler.GetPricingHistory)
			adminLLMPricing.PATCH("/:id/deactivate", llmPricingHandler.DeactivatePricing)
		}

		// 為替レート（USD→JPY）の正本。フロントの表示換算はこの値を参照する
		// （backend-go/pkg/money を単一の真実源とし、定数の二重管理を避ける）。
		v1.GET("/exchange-rate", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"usd_to_jpy_rate": money.USDToJPYRate})
		})

		// 課金・サブスクリプション関連
		// 公開エンドポイント（認証不要）
		v1.GET("/billing/tiers", billingHandler.GetTierLimits)

		// 認証必要なエンドポイント
		billingRoutes := v1.Group("/billing")
		billingRoutes.Use(authMiddleware.RequireAuth())
		{
			billingRoutes.POST("/checkout", billingHandler.CreateCheckoutSession)
			billingRoutes.POST("/portal", billingHandler.CreateBillingPortalSession)
			billingRoutes.POST("/subscription/change", billingHandler.ChangeSubscriptionPlan)
			billingRoutes.POST("/subscription/cancel", billingHandler.CancelSubscription)
			billingRoutes.GET("/usage", billingHandler.GetCurrentUsage)
			billingRoutes.GET("/check-limit", billingHandler.CheckTokenLimit)
		}

		// グループチャット関連（認証必要）
		groupChats := v1.Group("/group-chats")
		groupChats.Use(authMiddleware.RequireAuth())
		{
			groupChats.POST("", groupChatHandler.CreateGroupChat)
			groupChats.GET("", groupChatHandler.GetGroupChats)
			groupChats.GET("/:id", groupChatHandler.GetGroupChat)
			groupChats.PUT("/:id", groupChatHandler.UpdateGroupChat)
			groupChats.DELETE("/:id", groupChatHandler.DeleteGroupChat)
			groupChats.POST("/:id/icon", uploadHandler.UploadGroupChatIcon)
			groupChats.POST("/:id/members", groupChatHandler.AddMember)
			groupChats.DELETE("/:id/members/:member_id", groupChatHandler.RemoveMember)
			groupChats.PUT("/:id/members/reorder", groupChatHandler.ReorderMembers)
			groupChats.POST("/:id/messages/stream", groupChatHandler.SendMessageStream)
			groupChats.POST("/:id/messages/:msg_id/cancel", groupChatHandler.CancelMessage)
			groupChats.GET("/:id/messages", groupChatHandler.GetMessages)
			groupChats.GET("/:id/suggested-questions", groupChatHandler.GenerateSuggestedQuestions)
		}

		// チャットピン関連（認証必要）
		chatPins := v1.Group("/chat-pins")
		chatPins.Use(authMiddleware.RequireAuth())
		{
			chatPins.GET("", chatPinHandler.ListPins)
			chatPins.PUT("/:chat_type/:target_id", chatPinHandler.Pin)
			chatPins.DELETE("/:chat_type/:target_id", chatPinHandler.Unpin)
		}

		// アップロード関連（認証必要）
		upload := v1.Group("/upload")
		upload.Use(authMiddleware.RequireAuth())
		{
			upload.POST("/avatar/user", uploadHandler.UploadUserAvatar)
			upload.POST("/avatar/agent/:id", uploadHandler.UploadAgentAvatar)
			upload.POST("/avatar/agent", uploadHandler.UploadAgentAvatarSimple)
			upload.POST("/icon/group", uploadHandler.UploadGroupIcon)
		}

		// Webhook関連（認証不要 - Stripe署名で検証）
		webhooks := v1.Group("/webhooks")
		{
			webhooks.POST("/stripe", webhookHandler.HandleStripeWebhook)
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
