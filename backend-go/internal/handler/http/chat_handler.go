package http

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
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

	// 会話情報を取得してAI Agentのstreaming_enabledを確認
	_, agent, err := h.chatUsecase.GetConversationWithAgent(c.Request.Context(), userID, conversationID)
	if err != nil {
		log.Printf("ERROR: Failed to get conversation: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// リクエストボディをパース
	var req request.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("ERROR: Failed to parse request body: %v", err)
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}
	log.Printf("DEBUG: Parsed message request: content=%s", req.Content)

	// ストリーミングが有効な場合はストリーミングレスポンスを返す
	if agent.StreamingEnabled {
		// ストリーミング開始
		eventChan, _, err := h.chatUsecase.SendMessageStream(c.Request.Context(), userID, conversationID, req.Content)
		if err != nil {
			log.Printf("ERROR: Failed to start streaming: %v", err)
			c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
			return
		}

		// SSEヘッダーを設定
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("X-Accel-Buffering", "no")

		// フラッシャーを取得
		flusher, ok := c.Writer.(http.Flusher)
		if !ok {
			log.Printf("ERROR: Streaming not supported")
			c.JSON(http.StatusInternalServerError, response.NewErrorResponse(fmt.Errorf("streaming not supported"), http.StatusInternalServerError))
			return
		}

		// SSEストリームを送信
		// イベントチャネルからすべてのイベントを読み取る
		for event := range eventChan {
			// JSON形式でイベントをシリアライズ
			eventJSON, err := json.Marshal(event)
			if err != nil {
				log.Printf("ERROR: Failed to marshal event: %v", err)
				continue
			}

			// SSEフォーマットで書き込み
			fmt.Fprintf(c.Writer, "event: message\n")
			fmt.Fprintf(c.Writer, "data: %s\n\n", eventJSON)
			flusher.Flush()
		}
		return
	}

	// 通常のメッセージ送信
	result, err := h.chatUsecase.SendMessage(c.Request.Context(), userID, conversationID, req.Content)
	if err != nil {
		log.Printf("ERROR: Failed to send message: %v", err)
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

	// メッセージをツール使用履歴付きで取得
	messagesWithTools, err := h.chatUsecase.GetConversationMessagesWithTools(c.Request.Context(), userID, conversationID, params.Limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	log.Printf("DEBUG: Retrieved %d messages with tools", len(messagesWithTools))

	// レスポンスに変換
	messageResponses := make([]*response.MessageResponse, len(messagesWithTools))
	for i, mwt := range messagesWithTools {
		messageResponses[i] = response.ToMessageResponseWithTools(mwt.Message, mwt.ToolUsages)
		log.Printf("DEBUG: Message %s has %d tool usages", mwt.Message.ID, len(mwt.ToolUsages))
	}

	c.JSON(http.StatusOK, &response.MessagesResponse{
		Messages: messageResponses,
		Total:    len(messageResponses),
	})
}

// SendMessageStream はストリーミングでメッセージを送信
// @Summary メッセージ送信（ストリーミング）
// @Description 会話にメッセージを送信してAI応答をストリーミングで取得します
// @Tags Chat
// @Accept json
// @Produce text/event-stream
// @Security BearerAuth
// @Param id path string true "会話ID"
// @Param request body request.SendMessageRequest true "メッセージ内容"
// @Success 200 {string} string "SSEストリーム"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/conversations/{id}/messages/stream [post]
func (h *ChatHandler) SendMessageStream(c *gin.Context) {
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

	// ストリーミング開始
	eventChan, errChan, err := h.chatUsecase.SendMessageStream(c.Request.Context(), userID, conversationID, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// SSEヘッダーを設定
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	// SSEストリームを送信
	c.Stream(func(w io.Writer) bool {
		select {
		case event, ok := <-eventChan:
			if !ok {
				return false
			}
			// イベントをJSON形式でSSE送信
			c.SSEvent("message", event)
			return true
		case err := <-errChan:
			if err != nil {
				// エラーイベントを送信
				c.SSEvent("error", gin.H{"message": err.Error()})
			}
			return false
		case <-c.Request.Context().Done():
			return false
		}
	})
}
