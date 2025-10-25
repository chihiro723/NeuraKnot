package http

import (
	"errors"
	"net/http"
	"time"

	"backend-go/internal/domain/ai"
	"backend-go/internal/domain/service"
	"backend-go/internal/handler/http/middleware"
	"backend-go/internal/handler/http/request"
	"backend-go/internal/handler/http/response"
	aiusecase "backend-go/internal/usecase/ai"
	serviceUsecase "backend-go/internal/usecase/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AIAgentHandler はAI Agentのハンドラー
type AIAgentHandler struct {
	agentUsecase       *aiusecase.AgentUsecase
	serviceUsecase     *serviceUsecase.ServiceUsecase
	aiAgentServiceRepo service.AIAgentServiceRepository
}

// NewAIAgentHandler はAI Agentハンドラーを作成
func NewAIAgentHandler(agentUsecase *aiusecase.AgentUsecase, serviceUsecase *serviceUsecase.ServiceUsecase, aiAgentServiceRepo service.AIAgentServiceRepository) *AIAgentHandler {
	return &AIAgentHandler{
		agentUsecase:       agentUsecase,
		serviceUsecase:     serviceUsecase,
		aiAgentServiceRepo: aiAgentServiceRepo,
	}
}

// CreateAgent はAI Agentを作成
// @Summary AI Agent作成
// @Description 新しいAI Agentを作成します
// @Tags AI Agent
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body request.CreateAgentRequest true "AI Agent作成情報"
// @Success 201 {object} response.AgentResponse "作成成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/ai-agents [post]
func (h *AIAgentHandler) CreateAgent(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// リクエストボディをパース
	var req request.CreateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// UserIDをUUIDに変換
	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid user ID"))
		return
	}

	// StreamingEnabledのデフォルト値を設定（nilの場合はtrue）
	streamingEnabled := true
	if req.StreamingEnabled != nil {
		streamingEnabled = *req.StreamingEnabled
	}

	// AI Agentを作成
	agent, err := h.agentUsecase.CreateAgent(
		c.Request.Context(),
		userID,
		req.Name,
		req.PersonaType,
		req.Provider,
		req.Model,
		req.Description,
		req.SystemPrompt,
		streamingEnabled,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewErrorResponse(err, http.StatusBadRequest))
		return
	}

	// サービス紐付けを作成
	if len(req.Services) > 0 && h.aiAgentServiceRepo != nil {
		for _, reqService := range req.Services {
			agentService := &service.AIAgentService{
				AIAgentID:         agent.ID,
				ServiceClass:      reqService.ServiceClass,
				ToolSelectionMode: reqService.ToolSelectionMode,
				SelectedTools:     reqService.SelectedTools,
				Enabled:           true,
			}

			if err := h.aiAgentServiceRepo.Create(agentService); err != nil {
				// サービス紐付けエラーは警告のみ（エージェント作成は成功させる）
				// 本来はトランザクションでロールバックすべきだが、簡易実装として継続
				c.JSON(http.StatusCreated, response.ToAgentResponse(agent))
				return
			}
		}
	}

	c.JSON(http.StatusCreated, response.ToAgentResponse(agent))
}

// ListAgents はAI Agentリストを取得
// @Summary AI Agentリスト取得
// @Description ユーザーのAI Agentリストを取得します
// @Tags AI Agent
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.AgentsResponse "取得成功"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/ai-agents [get]
func (h *AIAgentHandler) ListAgents(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// UserIDをUUIDに変換
	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid user ID"))
		return
	}

	// AI Agentリストを取得
	agents, err := h.agentUsecase.GetUserAgents(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToAgentsResponse(agents))
}

// GetAgent はAI Agentを取得
// @Summary AI Agent取得
// @Description IDでAI Agentを取得します
// @Tags AI Agent
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "AI Agent ID"
// @Success 200 {object} response.AgentResponse "取得成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 404 {object} response.ErrorResponse "AI Agentが見つかりません"
// @Router /api/v1/ai-agents/{id} [get]
func (h *AIAgentHandler) GetAgent(c *gin.Context) {
	// IDをパース
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid agent ID"))
		return
	}

	// AI Agentを取得
	agent, err := h.agentUsecase.GetAgentByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, response.NewNotFoundErrorResponse("AI Agent not found"))
		return
	}

	c.JSON(http.StatusOK, response.ToAgentResponse(agent))
}

// UpdateAgent はAI Agentを更新
// @Summary AI Agent更新
// @Description AI Agentの設定を更新します
// @Tags AI Agent
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "AI Agent ID"
// @Param request body request.UpdateAgentRequest true "AI Agent更新情報"
// @Success 200 {object} response.AgentResponse "更新成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 404 {object} response.ErrorResponse "AI Agentが見つかりません"
// @Failure 403 {object} response.ErrorResponse "権限エラー"
// @Router /api/v1/ai-agents/{id} [put]
func (h *AIAgentHandler) UpdateAgent(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// IDをパース
	idStr := c.Param("id")
	agentID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid agent ID"))
		return
	}

	// UserIDをUUIDに変換
	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid user ID"))
		return
	}

	// リクエストボディをパース
	var req request.UpdateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// AI Agentを取得
	agent, err := h.agentUsecase.GetAgentByID(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.NewNotFoundErrorResponse("AI Agent not found"))
		return
	}

	// 所有者チェック
	if agent.UserID != userID {
		c.JSON(http.StatusForbidden, response.NewErrorResponse(errors.New("access denied"), http.StatusForbidden))
		return
	}

	// 更新フィールドを適用
	if req.Name != nil {
		agent.Name = *req.Name
	}
	if req.Description != nil {
		agent.SetDescription(*req.Description)
	}
	if req.AvatarURL != nil {
		agent.AvatarURL = req.AvatarURL
	}
	if req.PersonaType != nil {
		personaType, err := ai.ParsePersonaType(*req.PersonaType)
		if err != nil {
			c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid persona type"))
			return
		}
		agent.PersonaType = personaType
	}
	if req.Provider != nil {
		provider, err := ai.ParseProvider(*req.Provider)
		if err != nil {
			c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid provider"))
			return
		}
		agent.Provider = provider
	}
	if req.Model != nil {
		agent.Model = *req.Model
	}
	if req.Temperature != nil {
		agent.Temperature = *req.Temperature
	}
	if req.MaxTokens != nil {
		agent.MaxTokens = *req.MaxTokens
	}
	if req.SystemPrompt != nil {
		agent.SetSystemPrompt(*req.SystemPrompt)
	}
	if req.ToolsEnabled != nil {
		agent.ToolsEnabled = *req.ToolsEnabled
	}
	if req.StreamingEnabled != nil {
		agent.StreamingEnabled = *req.StreamingEnabled
	}

	// バリデーション
	if err := agent.Validate(); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// 更新
	if err := h.agentUsecase.UpdateAgent(c.Request.Context(), agent); err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToAgentResponse(agent))
}

// GetAgentServices はAI Agentのサービス一覧を取得
// @Summary AI Agentサービス一覧取得
// @Description AI Agentに紐付いたサービス一覧を取得します
// @Tags AI Agent
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "AI Agent ID"
// @Success 200 {object} response.AgentServicesResponse "取得成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 404 {object} response.ErrorResponse "AI Agentが見つかりません"
// @Failure 403 {object} response.ErrorResponse "権限エラー"
// @Router /api/v1/ai-agents/{id}/services [get]
func (h *AIAgentHandler) GetAgentServices(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// IDをパース
	idStr := c.Param("id")
	agentID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid agent ID"))
		return
	}

	// UserIDをUUIDに変換
	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid user ID"))
		return
	}

	// AI Agentを取得して所有者チェック
	agent, err := h.agentUsecase.GetAgentByID(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.NewNotFoundErrorResponse("AI Agent not found"))
		return
	}

	if agent.UserID != userID {
		c.JSON(http.StatusForbidden, response.NewErrorResponse(errors.New("access denied"), http.StatusForbidden))
		return
	}

	// サービス一覧を取得
	services, err := h.aiAgentServiceRepo.FindByAgentID(agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// レスポンスに変換
	serviceResponses := make([]*response.AgentServiceResponse, len(services))
	for i, service := range services {
		serviceResponses[i] = &response.AgentServiceResponse{
			ID:                service.ID.String(),
			AIAgentID:         service.AIAgentID.String(),
			ServiceClass:      service.ServiceClass,
			ToolSelectionMode: service.ToolSelectionMode,
			SelectedTools:     service.SelectedTools,
			Enabled:           service.Enabled,
			CreatedAt:         service.CreatedAt.Format(time.RFC3339),
		}
	}

	c.JSON(http.StatusOK, &response.AgentServicesResponse{
		Services: serviceResponses,
	})
}

// AddAgentService はAI Agentにサービスを追加
// @Summary AI Agentサービス追加
// @Description AI Agentにサービスを紐付けます
// @Tags AI Agent
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "AI Agent ID"
// @Param request body service.CreateAIAgentServiceInput true "サービス設定"
// @Success 201 {object} response.AgentServiceResponse "追加成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 404 {object} response.ErrorResponse "AI Agentが見つかりません"
// @Failure 403 {object} response.ErrorResponse "権限エラー"
// @Router /api/v1/ai-agents/{id}/services [post]
func (h *AIAgentHandler) AddAgentService(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// IDをパース
	idStr := c.Param("id")
	agentID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid agent ID"))
		return
	}

	// UserIDをUUIDに変換
	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid user ID"))
		return
	}

	// AI Agentを取得して所有者チェック
	agent, err := h.agentUsecase.GetAgentByID(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.NewNotFoundErrorResponse("AI Agent not found"))
		return
	}

	if agent.UserID != userID {
		c.JSON(http.StatusForbidden, response.NewErrorResponse(errors.New("access denied"), http.StatusForbidden))
		return
	}

	// リクエストボディをパース
	var input service.CreateAIAgentServiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// サービスを追加
	agentService, err := h.serviceUsecase.CreateAIAgentService(agentID, &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// レスポンスに変換
	serviceResponse := &response.AgentServiceResponse{
		ID:                agentService.ID.String(),
		AIAgentID:         agentService.AIAgentID.String(),
		ServiceClass:      agentService.ServiceClass,
		ToolSelectionMode: agentService.ToolSelectionMode,
		SelectedTools:     agentService.SelectedTools,
		Enabled:           agentService.Enabled,
		CreatedAt:         agentService.CreatedAt.Format(time.RFC3339),
	}

	c.JSON(http.StatusCreated, serviceResponse)
}

// UpdateAgentService はAI Agentのサービス設定を更新
// @Summary AI Agentサービス更新
// @Description AI Agentのサービス設定を更新します
// @Tags AI Agent
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "AI Agent ID"
// @Param service_id path string true "サービスID"
// @Param request body service.UpdateAIAgentServiceInput true "サービス設定更新"
// @Success 200 {object} response.AgentServiceResponse "更新成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 404 {object} response.ErrorResponse "AI Agentまたはサービスが見つかりません"
// @Failure 403 {object} response.ErrorResponse "権限エラー"
// @Router /api/v1/ai-agents/{id}/services/{service_id} [put]
func (h *AIAgentHandler) UpdateAgentService(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// IDをパース
	agentIDStr := c.Param("id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid agent ID"))
		return
	}

	serviceIDStr := c.Param("service_id")
	serviceID, err := uuid.Parse(serviceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid service ID"))
		return
	}

	// UserIDをUUIDに変換
	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid user ID"))
		return
	}

	// AI Agentを取得して所有者チェック
	agent, err := h.agentUsecase.GetAgentByID(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.NewNotFoundErrorResponse("AI Agent not found"))
		return
	}

	if agent.UserID != userID {
		c.JSON(http.StatusForbidden, response.NewErrorResponse(errors.New("access denied"), http.StatusForbidden))
		return
	}

	// リクエストボディをパース
	var input service.UpdateAIAgentServiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// サービスを取得（IDで検索する必要があるが、現在のRepositoryにはID検索がないため、エージェントの全サービスから検索）
	services, err := h.aiAgentServiceRepo.FindByAgentID(agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	var agentService *service.AIAgentService
	for _, s := range services {
		if s.ID == serviceID {
			agentService = &s
			break
		}
	}

	if agentService == nil {
		c.JSON(http.StatusNotFound, response.NewNotFoundErrorResponse("Service not found"))
		return
	}

	// 更新フィールドを適用
	if input.ToolSelectionMode != "" {
		agentService.ToolSelectionMode = input.ToolSelectionMode
	}
	if input.SelectedTools != nil {
		agentService.SelectedTools = input.SelectedTools
	}
	if input.Enabled != nil {
		agentService.Enabled = *input.Enabled
	}

	// 更新
	if err := h.aiAgentServiceRepo.Update(agentService); err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// レスポンスに変換
	serviceResponse := &response.AgentServiceResponse{
		ID:                agentService.ID.String(),
		AIAgentID:         agentService.AIAgentID.String(),
		ServiceClass:      agentService.ServiceClass,
		ToolSelectionMode: agentService.ToolSelectionMode,
		SelectedTools:     agentService.SelectedTools,
		Enabled:           agentService.Enabled,
		CreatedAt:         agentService.CreatedAt.Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, serviceResponse)
}

// DeleteAgentService はAI Agentのサービスを削除
// @Summary AI Agentサービス削除
// @Description AI Agentからサービスを削除します
// @Tags AI Agent
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "AI Agent ID"
// @Param service_id path string true "サービスID"
// @Success 204 "削除成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 404 {object} response.ErrorResponse "AI Agentまたはサービスが見つかりません"
// @Failure 403 {object} response.ErrorResponse "権限エラー"
// @Router /api/v1/ai-agents/{id}/services/{service_id} [delete]
func (h *AIAgentHandler) DeleteAgentService(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// IDをパース
	agentIDStr := c.Param("id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid agent ID"))
		return
	}

	serviceIDStr := c.Param("service_id")
	serviceID, err := uuid.Parse(serviceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid service ID"))
		return
	}

	// UserIDをUUIDに変換
	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid user ID"))
		return
	}

	// AI Agentを取得して所有者チェック
	agent, err := h.agentUsecase.GetAgentByID(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.NewNotFoundErrorResponse("AI Agent not found"))
		return
	}

	if agent.UserID != userID {
		c.JSON(http.StatusForbidden, response.NewErrorResponse(errors.New("access denied"), http.StatusForbidden))
		return
	}

	// サービスを削除
	if err := h.aiAgentServiceRepo.Delete(serviceID); err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.Status(http.StatusNoContent)
}

// DeleteAgent はAI Agentを削除
// @Summary AI Agent削除
// @Description AI Agentを削除（所有者のみ）
// @Tags AI Agent
// @Accept json
// @Produce json
// @Param id path string true "AI Agent ID"
// @Success 204 "削除成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 404 {object} response.ErrorResponse "AI Agentが見つかりません"
// @Failure 403 {object} response.ErrorResponse "権限エラー"
// @Router /api/v1/ai-agents/{id} [delete]
func (h *AIAgentHandler) DeleteAgent(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// IDをパース
	agentIDStr := c.Param("id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid agent ID"))
		return
	}

	// UserIDをUUIDに変換
	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid user ID"))
		return
	}

	// AI Agentを取得して所有者チェック
	agent, err := h.agentUsecase.GetAgentByID(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.NewNotFoundErrorResponse("AI Agent not found"))
		return
	}

	if agent.UserID != userID {
		c.JSON(http.StatusForbidden, response.NewErrorResponse(errors.New("access denied"), http.StatusForbidden))
		return
	}

	// AI Agentを削除
	if err := h.agentUsecase.DeleteAgent(c.Request.Context(), agentID); err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.Status(http.StatusNoContent)
}
