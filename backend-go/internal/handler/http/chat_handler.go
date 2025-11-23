package http

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"backend-go/internal/domain/conversation"
	"backend-go/internal/handler/http/middleware"
	"backend-go/internal/handler/http/request"
	"backend-go/internal/handler/http/response"
	chatusecase "backend-go/internal/usecase/chat"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ChatHandler はチャットのハンドラー
type ChatHandler struct {
	chatUsecase      *chatusecase.ChatUsecase
	pythonBackendURL string
	db               *sql.DB
}

// NewChatHandler はチャットハンドラーを作成
func NewChatHandler(chatUsecase *chatusecase.ChatUsecase, pythonBackendURL string, db *sql.DB) *ChatHandler {
	return &ChatHandler{
		chatUsecase:      chatUsecase,
		pythonBackendURL: pythonBackendURL,
		db:               db,
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
	var err error

	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// リクエストボディをパース
	var req request.GetOrCreateConversationRequest
	if err = c.ShouldBindJSON(&req); err != nil {
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
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		log.Printf("ERROR: Failed to parse request body: %v", bindErr)
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(bindErr.Error()))
		return
	}

	// ストリーミングが有効な場合はストリーミングレスポンスを返す
	if agent.StreamingEnabled {
		// ストリーミング開始
		eventChan, _, streamErr := h.chatUsecase.SendMessageStream(c.Request.Context(), userID, conversationID, req.Content)
		if streamErr != nil {
			log.Printf("ERROR: Failed to start streaming: %v", streamErr)
			c.JSON(http.StatusInternalServerError, response.NewErrorResponse(streamErr, http.StatusInternalServerError))
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
			eventJSON, marshalErr := json.Marshal(event)
			if marshalErr != nil {
				log.Printf("ERROR: Failed to marshal event: %v", marshalErr)
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

// SendAgentIntroduction はAIエージェントが自己紹介メッセージを送信
// @Summary AIエージェント自己紹介送信
// @Description AIエージェントが自己紹介メッセージを送信します
// @Tags Chat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body request.SendAgentIntroductionRequest true "自己紹介リクエスト"
// @Success 200 {object} response.SendMessageResponse "送信成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/conversations/agent-introduction [post]
func (h *ChatHandler) SendAgentIntroduction(c *gin.Context) {
	var err error

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

	// リクエストボディをパース
	var req request.SendAgentIntroductionRequest
	if err = c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// AI Agent IDをパース
	aiAgentID, err := uuid.Parse(req.AIAgentID)
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

	// AIエージェントが自己紹介メッセージを送信
	result, err := h.chatUsecase.SendAgentIntroduction(c.Request.Context(), userID, conv.ID, req.Message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// レスポンスを返す
	c.JSON(http.StatusOK, response.SendMessageResponse{
		UserMessage: nil, // ユーザーメッセージはなし
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
	var err error

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
	var err error

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
	if err = c.ShouldBindQuery(&params); err != nil {
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

	// レスポンスに変換
	messageResponses := make([]*response.MessageResponse, len(messagesWithTools))
	for i, mwt := range messagesWithTools {
		messageResponses[i] = response.ToMessageResponseWithTools(mwt.Message, mwt.ToolUsages)
	}

	c.JSON(http.StatusOK, &response.MessagesResponse{
		Messages: messageResponses,
		Total:    len(messageResponses),
	})
}

// UpdateToolPositions はツール使用履歴の挿入位置を一括更新
// @Summary ツール位置情報更新
// @Description ツール使用履歴の挿入位置を一括更新します
// @Tags Chat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param conversation_id path string true "会話ID"
// @Param message_id path string true "メッセージID"
// @Param request body request.UpdateToolPositionsRequest true "ツール位置情報"
// @Success 200 {object} map[string]bool "更新成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 404 {object} response.ErrorResponse "会話またはメッセージが見つからない"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/conversations/{conversation_id}/messages/{message_id}/tools/positions [patch]
func (h *ChatHandler) UpdateToolPositions(c *gin.Context) {
	var err error

	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// パスパラメータから会話IDとメッセージIDを取得
	conversationIDStr := c.Param("conversation_id")
	messageIDStr := c.Param("message_id")

	conversationID, err := uuid.Parse(conversationIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid conversation ID"))
		return
	}

	messageID, err := uuid.Parse(messageIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid message ID"))
		return
	}

	// リクエストボディをパース
	var req request.UpdateToolPositionsRequest
	if err = c.ShouldBindJSON(&req); err != nil {
		log.Printf("ERROR: Failed to bind request body: %v", err)
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid request body"))
		return
	}

	// ユースケース呼び出し（UserIDをuuid.UUIDに変換）
	userUUID, err := uuid.Parse(string(user.ID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewInternalServerErrorResponse("Invalid user ID"))
		return
	}

	if err = h.chatUsecase.UpdateToolPositions(c.Request.Context(), userUUID, conversationID, messageID, req.Positions); err != nil {
		log.Printf("ERROR: Failed to update tool positions: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewInternalServerErrorResponse("Failed to update tool positions"))
		return
	}

	log.Printf("✅ Tool positions updated successfully for message %s", messageID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GenerateSuggestedQuestions は1対1会話の質問候補を生成
// @Summary 1対1会話の質問候補を生成
// @Tags conversations
// @Accept json
// @Produce json
// @Param id path string true "Conversation ID"
// @Param limit query int false "取得するメッセージ数" default(10)
// @Success 200 {object} response.SuggestedQuestionsResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 503 {object} response.ErrorResponse
// @Security BearerAuth
// @Router /api/v1/conversations/{id}/suggested-questions [get]
func (h *ChatHandler) GenerateSuggestedQuestions(c *gin.Context) {
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid user ID"))
		return
	}

	conversationIDStr := c.Param("id")
	conversationID, err := uuid.Parse(conversationIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid conversation ID"))
		return
	}

	conv, agent, err := h.chatUsecase.GetConversationWithAgent(c.Request.Context(), userID, conversationID)
	if err != nil {
		log.Printf("ERROR: Failed to get conversation: %v", err)
		c.JSON(http.StatusNotFound, response.NewErrorResponse(err, http.StatusNotFound))
		return
	}

	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 50 {
		limit = 10
	}

	messages, err := h.chatUsecase.GetConversationMessages(c.Request.Context(), userID, conversationID, limit)
	if err != nil {
		log.Printf("ERROR: Failed to get messages: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	if len(messages) < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "会話履歴が不足しています。メッセージを送信してから試してください。",
		})
		return
	}

	requestBody := map[string]interface{}{
		"conversation_id": conv.ID.String(),
		"agent_name":      agent.Name,
		"agent_persona":   string(agent.PersonaType),
		"system_prompt":   agent.GetSystemPrompt(),
		"recent_messages": h.formatMessagesForPython(messages),
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	client := &http.Client{Timeout: 30 * time.Second}

	pythonReq, err := http.NewRequest(
		"POST",
		h.pythonBackendURL+"/api/v1/conversation/suggest-questions",
		bytes.NewBuffer(jsonBody),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	pythonReq.Header.Set("Content-Type", "application/json")

	pythonResp, err := client.Do(pythonReq)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "AI サービスへの接続に失敗しました",
		})
		return
	}
	defer pythonResp.Body.Close()

	body, err := io.ReadAll(pythonResp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	if pythonResp.StatusCode != http.StatusOK {
		var errorResp map[string]interface{}
		if unmarshalErr := json.Unmarshal(body, &errorResp); unmarshalErr == nil {
			c.JSON(pythonResp.StatusCode, errorResp)
		} else {
			c.JSON(pythonResp.StatusCode, gin.H{
				"error": "質問候補の生成に失敗しました",
			})
		}
		return
	}

	var suggestionsResp response.SuggestedQuestionsResponse
	if unmarshalErr := json.Unmarshal(body, &suggestionsResp); unmarshalErr != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(unmarshalErr, http.StatusInternalServerError))
		return
	}

	// トークン使用量をDBに記録
	if suggestionsResp.TokenUsage != nil {
		agentID := agent.ID
		// context.Backgroundを使用してHTTPリクエストのコンテキストとは独立させる
		go func() {
			// 新しいコンテキストを作成（タイムアウト付き）
			recordCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			if err := h.recordTokenUsage(
				recordCtx,
				userID,
				&agentID,
				suggestionsResp.TokenUsage.Prompt,
				suggestionsResp.TokenUsage.Completion,
				"openai",
				"gpt-4.1",
			); err != nil {
				log.Printf("ERROR: Failed to record token usage: %v", err)
			}
		}()
	}

	c.JSON(http.StatusOK, suggestionsResp)
}

func (h *ChatHandler) formatMessagesForPython(messages []*conversation.Message) []map[string]interface{} {
	formatted := make([]map[string]interface{}, len(messages))
	for i, msg := range messages {
		formatted[i] = map[string]interface{}{
			"sender_type": string(msg.SenderType),
			"content":     msg.Content,
			"created_at":  msg.CreatedAt.Format(time.RFC3339),
		}
	}
	return formatted
}

// recordTokenUsage はトークン使用量をtoken_usageテーブルに記録
func (h *ChatHandler) recordTokenUsage(
	ctx context.Context,
	userID uuid.UUID,
	aiAgentID *uuid.UUID,
	promptTokens int,
	completionTokens int,
	provider string,
	model string,
) error {
	now := time.Now()
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0)

	totalTokens := promptTokens + completionTokens

	// コスト計算（簡易版: 実際にはllm_pricingテーブルから取得すべき）
	// gpt-4.1の概算: prompt $2.50/1M, completion $10/1M
	costUSD := (float64(promptTokens) * 2.50 / 1000000.0) + (float64(completionTokens) * 10.0 / 1000000.0)

	// token_usageテーブルを更新（INSERT ON CONFLICT UPDATE）
	query := `
		INSERT INTO token_usage (
			user_id,
			period_start,
			period_end,
			tokens_prompt,
			tokens_completion,
			tokens_total,
			cost_usd,
			request_count,
			provider_breakdown,
			created_at,
			updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, 1,
			jsonb_build_object($8::text, jsonb_build_object('tokens', $6::bigint, 'cost', $7::numeric)),
			NOW(), NOW()
		)
		ON CONFLICT (user_id, period_start, period_end)
		DO UPDATE SET
			tokens_prompt = token_usage.tokens_prompt + EXCLUDED.tokens_prompt,
			tokens_completion = token_usage.tokens_completion + EXCLUDED.tokens_completion,
			tokens_total = token_usage.tokens_total + EXCLUDED.tokens_total,
			cost_usd = token_usage.cost_usd + EXCLUDED.cost_usd,
			request_count = token_usage.request_count + 1,
			provider_breakdown = jsonb_set(
				COALESCE(token_usage.provider_breakdown, '{}'::jsonb),
				ARRAY[$8::text],
				jsonb_build_object(
					'tokens',
					COALESCE((token_usage.provider_breakdown->$8::text->>'tokens')::bigint, 0) + $6::bigint,
					'cost',
					COALESCE((token_usage.provider_breakdown->$8::text->>'cost')::numeric, 0) + $7::numeric
				)
			),
			updated_at = NOW()
	`

	_, err := h.db.ExecContext(
		ctx,
		query,
		userID,
		periodStart,
		periodEnd,
		promptTokens,
		completionTokens,
		totalTokens,
		costUSD,
		provider,
	)

	if err != nil {
		return fmt.Errorf("failed to record token usage: %w", err)
	}

	log.Printf("INFO: Recorded token usage - User: %s, Agent: %s, Tokens: %d (prompt: %d, completion: %d), Cost: $%.6f, Provider: %s, Model: %s",
		userID, aiAgentID, totalTokens, promptTokens, completionTokens, costUSD, provider, model)

	return nil
}
