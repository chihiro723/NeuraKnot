package http

import (
	"errors"
	"net/http"

	"backend-go/internal/domain/chatpin"
	"backend-go/internal/handler/http/middleware"
	"backend-go/internal/handler/http/response"
	chatpinusecase "backend-go/internal/usecase/chatpin"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ChatPinHandler はチャットピンのハンドラー
type ChatPinHandler struct {
	usecase *chatpinusecase.ChatPinUsecase
}

// NewChatPinHandler はチャットピンハンドラーを作成
func NewChatPinHandler(usecase *chatpinusecase.ChatPinUsecase) *ChatPinHandler {
	return &ChatPinHandler{usecase: usecase}
}

// ListPins はユーザーのピン一覧を取得
// @Summary チャットピン一覧取得
// @Description ログインユーザーがピン留めしているチャット（1対1／グループ）の一覧を取得します。並びは pinned_at DESC（新しくピンしたものほど上）。
// @Tags ChatPin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.ChatPinsResponse "取得成功"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/chat-pins [get]
func (h *ChatPinHandler) ListPins(c *gin.Context) {
	userID, ok := extractUserID(c)
	if !ok {
		return
	}

	pins, err := h.usecase.ListUserPins(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToChatPinsResponse(pins))
}

// Pin はチャットをピン留めする
// @Summary チャットピン留め
// @Description 指定のチャットをピン留めします。既にピン留め済みの場合も 200 を返します（冪等）。
// @Tags ChatPin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param chat_type path string true "チャット種別" Enums(direct, group)
// @Param target_id path string true "ピン対象のID（direct の場合は ai_agent_id、group の場合は group_chat_id）"
// @Success 200 {object} map[string]string "ピン留め成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 403 {object} response.ErrorResponse "権限エラー"
// @Failure 404 {object} response.ErrorResponse "対象が見つかりません"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/chat-pins/{chat_type}/{target_id} [put]
func (h *ChatPinHandler) Pin(c *gin.Context) {
	userID, ok := extractUserID(c)
	if !ok {
		return
	}

	chatType, targetID, ok := parsePinParams(c)
	if !ok {
		return
	}

	if err := h.usecase.Pin(c.Request.Context(), userID, chatType, targetID); err != nil {
		writePinUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "pinned"})
}

// Unpin はチャットのピンを解除する
// @Summary チャットピン解除
// @Description 指定のチャットのピン留めを解除します。ピン留めされていない場合も 200 を返します（冪等）。
// @Tags ChatPin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param chat_type path string true "チャット種別" Enums(direct, group)
// @Param target_id path string true "ピン対象のID"
// @Success 200 {object} map[string]string "ピン解除成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/chat-pins/{chat_type}/{target_id} [delete]
func (h *ChatPinHandler) Unpin(c *gin.Context) {
	userID, ok := extractUserID(c)
	if !ok {
		return
	}

	chatType, targetID, ok := parsePinParams(c)
	if !ok {
		return
	}

	if err := h.usecase.Unpin(c.Request.Context(), userID, chatType, targetID); err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "unpinned"})
}

// extractUserID は認証コンテキストから UUID を取り出す
// 失敗時は 401/400 を即時レスポンスし、ok=false を返す
func extractUserID(c *gin.Context) (uuid.UUID, bool) {
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return uuid.Nil, false
	}

	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid user ID"))
		return uuid.Nil, false
	}
	return userID, true
}

// parsePinParams は URL パスから chat_type と target_id をパースする
// 失敗時は 400 を即時レスポンスし、ok=false を返す
func parsePinParams(c *gin.Context) (chatpin.ChatType, uuid.UUID, bool) {
	chatTypeRaw := c.Param("chat_type")
	chatType, err := chatpin.ParseChatType(chatTypeRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return "", uuid.Nil, false
	}

	targetIDRaw := c.Param("target_id")
	targetID, err := uuid.Parse(targetIDRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid target ID"))
		return "", uuid.Nil, false
	}
	return chatType, targetID, true
}

// writePinUsecaseError はユースケースのエラーを HTTP ステータスにマッピング
func writePinUsecaseError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, chatpinusecase.ErrChatTargetNotFound):
		c.JSON(http.StatusNotFound, response.NewNotFoundErrorResponse("chat target not found"))
	case errors.Is(err, chatpinusecase.ErrChatTargetForbidden):
		c.JSON(http.StatusForbidden, response.NewErrorResponse(err, http.StatusForbidden))
	default:
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
	}
}
