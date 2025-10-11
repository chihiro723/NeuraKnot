package http

import (
	"net/http"

	"backend-go/internal/handler/http/middleware"
	"backend-go/internal/handler/http/request"
	"backend-go/internal/handler/http/response"
	chatusecase "backend-go/internal/usecase/chat"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ChatHandler はチャットのハンドラー
type ChatHandler struct {
	chatUsecase *chatusecase.ChatUsecase
}

// NewChatHandler はチャットハンドラーを作成
func NewChatHandler(chatUsecase *chatusecase.ChatUsecase) *ChatHandler {
	return &ChatHandler{
		chatUsecase: chatUsecase,
	}
}

// GetOrCreateConversation は会話を取得または作成
// @Summary 会話取得/作成
// @Description AI Agentとの会話を取得または作成します
// @Tags Chat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body request.GetOrCreateConversationRequest true "AI Agent ID"
// @Success 200 {object} response.ConversationResponse "取得/作成成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/conversations [post]
func (h *ChatHandler) GetOrCreateConversation(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// リクエストボディをパース
	var req request.GetOrCreateConversationRequest
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

	// AI Agent IDをパース
	aiAgentID, err := req.ParseAIAgentID()
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid AI agent ID"))
		return
	}

	// 会話を取得または作成
	conv, err := h.chatUsecase.GetOrCreateConversation(c.Request.Context(), userID, aiAgentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToConversationResponse(conv))
}

// SendMessage はメッセージを送信
// @Summary メッセージ送信
// @Description 会話にメッセージを送信してAI応答を取得します
// @Tags Chat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "会話ID"
// @Param request body request.SendMessageRequest true "メッセージ内容"
// @Success 200 {object} response.SendMessageResponse "送信成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/conversations/{id}/messages [post]
func (h *ChatHandler) SendMessage(c *gin.Context) {
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

	// 会話IDをパース
	idStr := c.Param("id")
	conversationID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid conversation ID"))
		return
	}

	// リクエストボディをパース
	var req request.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// メッセージを送信
	result, err := h.chatUsecase.SendMessage(c.Request.Context(), userID, conversationID, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// レスポンスを返す
	c.JSON(http.StatusOK, response.SendMessageResponse{
		UserMessage: response.ToMessageResponse(result.UserMessage),
		AIMessage:   response.ToMessageResponse(result.AIMessage),
		Metadata:    result.Metadata,
	})
}

// ListConversations はユーザーの会話一覧を取得
// @Summary 会話一覧取得
// @Description ユーザーの会話一覧を取得します
// @Tags Chat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.ConversationsListResponse "取得成功"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/conversations [get]
func (h *ChatHandler) ListConversations(c *gin.Context) {
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

	// 会話一覧を取得
	conversations, err := h.chatUsecase.ListConversations(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToConversationsListResponse(conversations))
}

// GetMessages はメッセージ履歴を取得
// @Summary メッセージ履歴取得
// @Description 会話のメッセージ履歴を取得します
// @Tags Chat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "会話ID"
// @Param limit query int false "取得件数（デフォルト: 50）" default(50)
// @Success 200 {object} response.MessagesResponse "取得成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/conversations/{id}/messages [get]
func (h *ChatHandler) GetMessages(c *gin.Context) {
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

	// 会話IDをパース
	idStr := c.Param("id")
	conversationID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid conversation ID"))
		return
	}

	// クエリパラメータを取得
	var params request.GetMessagesParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// デフォルト値
	if params.Limit <= 0 {
		params.Limit = 50
	}

	// メッセージを取得
	messages, err := h.chatUsecase.GetConversationMessages(c.Request.Context(), userID, conversationID, params.Limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToMessagesResponse(messages))
}
