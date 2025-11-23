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

	"backend-go/internal/domain/groupchat"
	"backend-go/internal/handler/http/middleware"
	"backend-go/internal/handler/http/request"
	"backend-go/internal/handler/http/response"
	groupchatusecase "backend-go/internal/usecase/groupchat"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GroupChatHandler はグループチャットのハンドラー
type GroupChatHandler struct {
	groupChatUsecase    *groupchatusecase.GroupChatUsecase
	groupMessageUsecase *groupchatusecase.GroupMessageUsecase
	pythonBackendURL    string
	db                  *sql.DB
}

// NewGroupChatHandler はグループチャットハンドラーを作成
func NewGroupChatHandler(
	groupChatUsecase *groupchatusecase.GroupChatUsecase,
	groupMessageUsecase *groupchatusecase.GroupMessageUsecase,
	pythonBackendURL string,
	db *sql.DB,
) *GroupChatHandler {
	return &GroupChatHandler{
		groupChatUsecase:    groupChatUsecase,
		groupMessageUsecase: groupMessageUsecase,
		pythonBackendURL:    pythonBackendURL,
		db:                  db,
	}
}

// CreateGroupChat はグループチャットを作成
// @Summary グループチャット作成
// @Description 新しいグループチャットを作成します
// @Tags GroupChat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body request.CreateGroupChatRequest true "グループチャット情報"
// @Success 201 {object} response.GroupChatResponse "作成成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/group-chats [post]
func (h *GroupChatHandler) CreateGroupChat(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// リクエストボディをパース
	var req request.CreateGroupChatRequest
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

	// メンバーIDをパース
	memberIDs, err := req.ParseMemberIDs()
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid member IDs"))
		return
	}

	// グループチャットを作成
	input := groupchatusecase.CreateGroupChatInput{
		UserID:      userID,
		Name:        req.Name,
		Description: req.Description,
		IconURL:     req.IconURL,
		MemberIDs:   memberIDs,
	}

	gc, err := h.groupChatUsecase.CreateGroupChat(c.Request.Context(), input)
	if err != nil {
		log.Printf("ERROR: Failed to create group chat: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusCreated, response.ToGroupChatResponse(gc))
}

// GetGroupChats はグループチャット一覧を取得
// @Summary グループチャット一覧取得
// @Description ユーザーのグループチャット一覧を取得します
// @Tags GroupChat
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.GroupChatsListResponse "取得成功"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/group-chats [get]
func (h *GroupChatHandler) GetGroupChats(c *gin.Context) {
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

	// グループチャット一覧を取得
	groupChats, err := h.groupChatUsecase.GetGroupChats(c.Request.Context(), userID)
	if err != nil {
		log.Printf("ERROR: Failed to get group chats: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// デバッグ: 最後のメッセージが含まれているか確認
	for _, gc := range groupChats {
		if gc.LastMessage != nil {
			content := gc.LastMessage.Content
			if len(content) > 50 {
				content = content[:50]
			}
			log.Printf("DEBUG: GroupChat %s has LastMessage: content=%s, sender_type=%s, sender_name=%s",
				gc.Name, content, gc.LastMessage.SenderType, gc.LastMessage.SenderName)
		} else {
			log.Printf("DEBUG: GroupChat %s has NO LastMessage", gc.Name)
		}
	}

	c.JSON(http.StatusOK, response.ToGroupChatsListResponse(groupChats))
}

// GetGroupChat はグループチャット詳細を取得
// @Summary グループチャット詳細取得
// @Description グループチャットの詳細を取得します
// @Tags GroupChat
// @Produce json
// @Security BearerAuth
// @Param id path string true "グループチャットID"
// @Success 200 {object} response.GroupChatResponse "取得成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 404 {object} response.ErrorResponse "見つかりません"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/group-chats/{id} [get]
func (h *GroupChatHandler) GetGroupChat(c *gin.Context) {
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

	// グループチャットIDをパース
	idStr := c.Param("id")
	groupChatID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid group chat ID"))
		return
	}

	// グループチャットを取得
	gc, err := h.groupChatUsecase.GetGroupChat(c.Request.Context(), userID, groupChatID)
	if err != nil {
		log.Printf("ERROR: Failed to get group chat: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToGroupChatResponse(gc))
}

// UpdateGroupChat はグループチャットを更新
// @Summary グループチャット更新
// @Description グループチャット情報を更新します
// @Tags GroupChat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "グループチャットID"
// @Param request body request.UpdateGroupChatRequest true "更新情報"
// @Success 200 {object} response.GroupChatResponse "更新成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/group-chats/{id} [put]
func (h *GroupChatHandler) UpdateGroupChat(c *gin.Context) {
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

	// グループチャットIDをパース
	idStr := c.Param("id")
	groupChatID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid group chat ID"))
		return
	}

	// リクエストボディをパース
	var req request.UpdateGroupChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// グループチャットを更新
	input := groupchatusecase.UpdateGroupChatInput{
		UserID:       userID,
		GroupChatID:  groupChatID,
		Name:         req.Name,
		Description:  req.Description,
		IconURL:      req.IconURL,
		SystemPrompt: req.SystemPrompt,
	}

	gc, err := h.groupChatUsecase.UpdateGroupChat(c.Request.Context(), input)
	if err != nil {
		log.Printf("ERROR: Failed to update group chat: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToGroupChatResponse(gc))
}

// DeleteGroupChat はグループチャットを削除
// @Summary グループチャット削除
// @Description グループチャットを削除します
// @Tags GroupChat
// @Produce json
// @Security BearerAuth
// @Param id path string true "グループチャットID"
// @Success 204 "削除成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/group-chats/{id} [delete]
func (h *GroupChatHandler) DeleteGroupChat(c *gin.Context) {
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

	// グループチャットIDをパース
	idStr := c.Param("id")
	groupChatID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid group chat ID"))
		return
	}

	// グループチャットを削除
	if err := h.groupChatUsecase.DeleteGroupChat(c.Request.Context(), userID, groupChatID); err != nil {
		log.Printf("ERROR: Failed to delete group chat: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.Status(http.StatusNoContent)
}

// AddMember はメンバーを追加
// @Summary メンバー追加
// @Description グループチャットにメンバーを追加します
// @Tags GroupChat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "グループチャットID"
// @Param request body request.AddMemberRequest true "メンバー情報"
// @Success 201 {object} response.GroupMemberResponse "追加成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/group-chats/{id}/members [post]
func (h *GroupChatHandler) AddMember(c *gin.Context) {
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

	// グループチャットIDをパース
	idStr := c.Param("id")
	groupChatID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid group chat ID"))
		return
	}

	// リクエストボディをパース
	var req request.AddMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// AI Agent IDをパース
	aiAgentID, err := req.ParseAIAgentID()
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid AI agent ID"))
		return
	}

	// メンバーを追加
	member, err := h.groupChatUsecase.AddMember(c.Request.Context(), userID, groupChatID, aiAgentID)
	if err != nil {
		log.Printf("ERROR: Failed to add member: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusCreated, response.ToGroupMemberResponse(member))
}

// RemoveMember はメンバーを削除
// @Summary メンバー削除
// @Description グループチャットからメンバーを削除します
// @Tags GroupChat
// @Produce json
// @Security BearerAuth
// @Param id path string true "グループチャットID"
// @Param member_id path string true "メンバーID"
// @Success 204 "削除成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/group-chats/{id}/members/{member_id} [delete]
func (h *GroupChatHandler) RemoveMember(c *gin.Context) {
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

	// グループチャットIDをパース
	idStr := c.Param("id")
	groupChatID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid group chat ID"))
		return
	}

	// メンバーIDをパース
	memberIDStr := c.Param("member_id")
	memberID, err := uuid.Parse(memberIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid member ID"))
		return
	}

	// メンバーを削除
	if err := h.groupChatUsecase.RemoveMember(c.Request.Context(), userID, groupChatID, memberID); err != nil {
		log.Printf("ERROR: Failed to remove member: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.Status(http.StatusNoContent)
}

// ReorderMembers はメンバーの順序を変更
// @Summary メンバー順序変更
// @Description グループチャットのメンバー順序を変更します
// @Tags GroupChat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "グループチャットID"
// @Param request body request.ReorderMembersRequest true "順序情報"
// @Success 204 "更新成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/group-chats/{id}/members/reorder [put]
func (h *GroupChatHandler) ReorderMembers(c *gin.Context) {
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

	// グループチャットIDをパース
	idStr := c.Param("id")
	groupChatID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid group chat ID"))
		return
	}

	// リクエストボディをパース
	var req request.ReorderMembersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// 順序をパース
	orders, err := req.ParseOrders()
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid order map"))
		return
	}

	// 順序を変更
	input := groupchatusecase.ReorderMembersInput{
		UserID:      userID,
		GroupChatID: groupChatID,
		Orders:      orders,
	}

	if err := h.groupChatUsecase.ReorderMembers(c.Request.Context(), input); err != nil {
		log.Printf("ERROR: Failed to reorder members: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.Status(http.StatusNoContent)
}

// SendMessageStream はメッセージを送信（SSE）
// @Summary メッセージ送信（ストリーミング）
// @Description グループチャットにメッセージを送信してストリーミング応答を取得します
// @Tags GroupChat
// @Accept json
// @Produce text/event-stream
// @Security BearerAuth
// @Param id path string true "グループチャットID"
// @Param request body request.SendGroupMessageRequest true "メッセージ内容"
// @Success 200 "ストリーミング成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/group-chats/{id}/messages/stream [post]
func (h *GroupChatHandler) SendMessageStream(c *gin.Context) {
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

	// グループチャットIDをパース
	idStr := c.Param("id")
	groupChatID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid group chat ID"))
		return
	}

	// リクエストボディをパース
	var req request.SendGroupMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// メンションをパース
	var mentions interface{}
	if mentionStr, ok := req.Mentions.(string); ok {
		mentions = mentionStr
	} else if mentionArray, ok := req.Mentions.([]interface{}); ok {
		// JSON配列をMentionItemに変換
		mentionItems := make([]groupchatusecase.MentionInput, 0, len(mentionArray))
		for _, item := range mentionArray {
			itemMap, ok := item.(map[string]interface{})
			if !ok {
				c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid mention item"))
				return
			}
			aiAgentIDStr, _ := itemMap["ai_agent_id"].(string)
			order, _ := itemMap["order"].(float64)

			aiAgentID, err := uuid.Parse(aiAgentIDStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid AI agent ID in mention"))
				return
			}

			mentionItems = append(mentionItems, groupchatusecase.MentionInput{
				AIAgentID: aiAgentID,
				Order:     int(order),
			})
		}
		mentions = mentionItems
	} else {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid mentions format"))
		return
	}

	// ストリーミング開始
	eventChan := make(chan groupchatusecase.StreamEvent, 10)

	input := groupchatusecase.SendMessageStreamInput{
		UserID:      userID,
		GroupChatID: groupChatID,
		Content:     req.Content,
		Mentions:    mentions,
	}

	// SSEヘッダーを設定
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	// バックグラウンドでストリーミング処理を開始
	go func() {
		if err := h.groupMessageUsecase.SendMessageStream(c.Request.Context(), input, eventChan); err != nil {
			log.Printf("ERROR: Failed to stream message: %v", err)
		}
	}()

	// SSEイベントを送信
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(fmt.Errorf("streaming not supported"), http.StatusInternalServerError))
		return
	}

	for {
		select {
		case event, ok := <-eventChan:
			if !ok {
				// チャネルが閉じられた場合
				return
			}

			// イベントを送信
			eventData := event.ToJSON()
			fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event.Event, eventData)
			flusher.Flush()

		case <-c.Request.Context().Done():
			// クライアント切断
			return
		}
	}
}

// GetMessages はメッセージ履歴を取得
// @Summary メッセージ履歴取得
// @Description グループチャットのメッセージ履歴を取得します
// @Tags GroupChat
// @Produce json
// @Security BearerAuth
// @Param id path string true "グループチャットID"
// @Param limit query int false "取得件数" default(50)
// @Param before query string false "このメッセージIDより前を取得"
// @Success 200 {object} response.GroupMessagesResponse "取得成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/group-chats/{id}/messages [get]
func (h *GroupChatHandler) GetMessages(c *gin.Context) {
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

	// グループチャットIDをパース
	idStr := c.Param("id")
	groupChatID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid group chat ID"))
		return
	}

	// クエリパラメータをパース
	var params request.GetGroupMessagesParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// デフォルト値設定
	if params.Limit <= 0 {
		params.Limit = 50
	}

	// beforeパラメータをパース
	before, err := params.ParseBefore()
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid before parameter"))
		return
	}

	// メッセージを取得
	messages, err := h.groupMessageUsecase.GetMessages(c.Request.Context(), userID, groupChatID, params.Limit, before)
	if err != nil {
		log.Printf("ERROR: Failed to get messages: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToGroupMessagesResponse(messages))
}

// CancelMessage はメッセージ処理をキャンセル
// @Summary メッセージ処理キャンセル
// @Description グループチャットのメッセージ処理をキャンセルします
// @Tags GroupChat
// @Produce json
// @Security BearerAuth
// @Param id path string true "グループチャットID"
// @Param msg_id path string true "メッセージID"
// @Success 204 "キャンセル成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/group-chats/{id}/messages/{msg_id}/cancel [post]
func (h *GroupChatHandler) CancelMessage(c *gin.Context) {
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

	// グループチャットIDをパース
	idStr := c.Param("id")
	groupChatID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid group chat ID"))
		return
	}

	// メッセージIDをパース
	msgIDStr := c.Param("msg_id")
	messageID, err := uuid.Parse(msgIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid message ID"))
		return
	}

	// メッセージをキャンセル
	if err := h.groupMessageUsecase.CancelMessage(c.Request.Context(), userID, groupChatID, messageID); err != nil {
		log.Printf("ERROR: Failed to cancel message: %v", err)
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.Status(http.StatusNoContent)
}

// GenerateSuggestedQuestions はグループチャットの質問候補を生成
// @Summary グループチャットの質問候補を生成
// @Tags group-chats
// @Accept json
// @Produce json
// @Param id path string true "Group Chat ID"
// @Param limit query int false "取得するメッセージ数" default(10)
// @Success 200 {object} response.SuggestedQuestionsResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 503 {object} response.ErrorResponse
// @Security BearerAuth
// @Router /api/v1/group-chats/{id}/suggested-questions [get]
func (h *GroupChatHandler) GenerateSuggestedQuestions(c *gin.Context) {
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

	groupChatIDStr := c.Param("id")
	groupChatID, err := uuid.Parse(groupChatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid group chat ID"))
		return
	}

	gc, err := h.groupChatUsecase.GetGroupChat(c.Request.Context(), userID, groupChatID)
	if err != nil {
		log.Printf("ERROR: Failed to get group chat: %v", err)
		c.JSON(http.StatusNotFound, response.NewErrorResponse(err, http.StatusNotFound))
		return
	}

	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 50 {
		limit = 10
	}

	messages, err := h.groupMessageUsecase.GetMessages(
		c.Request.Context(),
		userID,
		groupChatID,
		limit,
		nil,
	)
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
		"group_chat_id":   gc.ID.String(),
		"group_chat_name": gc.Name,
		"system_prompt":   gc.SystemPrompt,
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
		h.pythonBackendURL+"/api/v1/group-chat/suggest-questions",
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
		// context.Backgroundを使用してHTTPリクエストのコンテキストとは独立させる
		go func() {
			// 新しいコンテキストを作成（タイムアウト付き）
			recordCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			if err := h.recordTokenUsage(
				recordCtx,
				userID,
				nil, // グループチャットの質問候補生成
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

func (h *GroupChatHandler) formatMessagesForPython(messages []*groupchat.GroupMessage) []map[string]interface{} {
	formatted := make([]map[string]interface{}, len(messages))
	for i, msg := range messages {
		formatted[i] = map[string]interface{}{
			"sender_type": string(msg.SenderType),
			"sender_name": msg.SenderName,
			"content":     msg.Content,
			"created_at":  msg.CreatedAt.Format(time.RFC3339),
		}
	}
	return formatted
}

// recordTokenUsage はトークン使用量をtoken_usageテーブルに記録
func (h *GroupChatHandler) recordTokenUsage(
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

	log.Printf("INFO: Recorded token usage - User: %s, Tokens: %d (prompt: %d, completion: %d), Cost: $%.6f, Provider: %s, Model: %s",
		userID, totalTokens, promptTokens, completionTokens, costUSD, provider, model)

	return nil
}
