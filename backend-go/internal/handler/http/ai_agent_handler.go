package http

import (
	"net/http"

	"backend-go/internal/handler/http/middleware"
	"backend-go/internal/handler/http/request"
	"backend-go/internal/handler/http/response"
	aiusecase "backend-go/internal/usecase/ai"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AIAgentHandler はAI Agentのハンドラー
type AIAgentHandler struct {
	agentUsecase *aiusecase.AgentUsecase
}

// NewAIAgentHandler はAI Agentハンドラーを作成
func NewAIAgentHandler(agentUsecase *aiusecase.AgentUsecase) *AIAgentHandler {
	return &AIAgentHandler{
		agentUsecase: agentUsecase,
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

	// AI Agentを作成
	agent, err := h.agentUsecase.CreateAgent(
		c.Request.Context(),
		userID,
		req.Name,
		req.PersonaType,
		req.Provider,
		req.Model,
		req.Description,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewErrorResponse(err, http.StatusBadRequest))
		return
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
