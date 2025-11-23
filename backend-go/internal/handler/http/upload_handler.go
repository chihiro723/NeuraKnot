package http

import (
	"backend-go/internal/handler/http/middleware"
	"backend-go/internal/handler/http/response"
	"backend-go/internal/infrastructure/storage"
	aiUsecase "backend-go/internal/usecase/ai"
	groupchatUsecase "backend-go/internal/usecase/groupchat"
	userUsecase "backend-go/internal/usecase/user"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// UploadHandler アップロードハンドラー
type UploadHandler struct {
	userService      *userUsecase.Service
	agentUsecase     *aiUsecase.AgentUsecase
	groupChatUsecase *groupchatUsecase.GroupChatUsecase
	s3Client         *storage.S3Client
}

// NewUploadHandler アップロードハンドラーを作成
func NewUploadHandler(
	userService *userUsecase.Service,
	agentUsecase *aiUsecase.AgentUsecase,
	groupChatUsecase *groupchatUsecase.GroupChatUsecase,
	s3Client *storage.S3Client,
) *UploadHandler {
	return &UploadHandler{
		userService:      userService,
		agentUsecase:     agentUsecase,
		groupChatUsecase: groupChatUsecase,
		s3Client:         s3Client,
	}
}

// UploadUserAvatar ユーザーアバターをアップロード
// @Summary ユーザーアバターアップロード
// @Description 認証済みユーザーのアバター画像をアップロードします
// @Tags Upload
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param file formData file true "アバター画像ファイル"
// @Success 200 {object} response.UserResponse "アップロード成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 413 {object} response.ErrorResponse "ファイルサイズ超過"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/upload/avatar/user [post]
func (h *UploadHandler) UploadUserAvatar(c *gin.Context) {
	// ファイルを取得
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("file is required"))
		return
	}
	defer file.Close()

	// ファイルサイズチェック（5MB）
	const maxSize = 5 * 1024 * 1024
	if header.Size > maxSize {
		c.JSON(http.StatusRequestEntityTooLarge, response.NewValidationErrorResponse("file size must be less than 5MB"))
		return
	}

	// Content-Typeチェック
	contentType := header.Header.Get("Content-Type")
	if !isValidImageType(contentType) {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("file must be an image (jpeg, png, webp)"))
		return
	}

	// トークンを取得
	token, exists := middleware.GetTokenFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("token not found"))
		return
	}

	// アップロード
	user, err := h.userService.UploadAvatar(c.Request.Context(), token, file, contentType, header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToUserResponse(user))
}

// UploadAgentAvatar エージェントアバターをアップロード
// @Summary エージェントアバターアップロード
// @Description エージェントのアバター画像をアップロードします（所有者のみ）
// @Tags Upload
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path string true "エージェントID"
// @Param file formData file true "アバター画像ファイル"
// @Success 200 {object} map[string]string "アップロード成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 403 {object} response.ErrorResponse "権限エラー"
// @Failure 404 {object} response.ErrorResponse "エージェントが見つかりません"
// @Failure 413 {object} response.ErrorResponse "ファイルサイズ超過"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/upload/avatar/agent/{id} [post]
func (h *UploadHandler) UploadAgentAvatar(c *gin.Context) {
	// エージェントIDを取得
	agentIDStr := c.Param("id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid agent ID"))
		return
	}

	// ファイルを取得
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("file is required"))
		return
	}
	defer file.Close()

	// ファイルサイズチェック（5MB）
	const maxSize = 5 * 1024 * 1024
	if header.Size > maxSize {
		c.JSON(http.StatusRequestEntityTooLarge, response.NewValidationErrorResponse("file size must be less than 5MB"))
		return
	}

	// Content-Typeチェック
	contentType := header.Header.Get("Content-Type")
	if !isValidImageType(contentType) {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("file must be an image (jpeg, png, webp)"))
		return
	}

	// ユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("user not found in context"))
		return
	}

	// エージェントを取得
	agent, err := h.agentUsecase.GetAgentByID(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.NewErrorResponse(fmt.Errorf("agent not found"), http.StatusNotFound))
		return
	}

	// 所有者チェック
	if agent.UserID.String() != user.ID.String() {
		c.JSON(http.StatusForbidden, response.NewErrorResponse(fmt.Errorf("access denied"), http.StatusForbidden))
		return
	}

	// 古いアバターがあれば削除
	if agent.AvatarURL != nil && *agent.AvatarURL != "" {
		if err := h.s3Client.DeleteAvatar(c.Request.Context(), *agent.AvatarURL); err != nil {
			// 削除失敗してもログだけ出して続行
			fmt.Printf("failed to delete old agent avatar: %v\n", err)
		}
	}

	// S3/MinIOにアップロード
	avatarURL, err := h.s3Client.UploadAvatar(c.Request.Context(), "agents", agentID.String(), file, contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// キャッシュバスティング用のタイムスタンプを追加
	avatarURLWithTimestamp := fmt.Sprintf("%s?t=%d", avatarURL, time.Now().Unix())

	// エージェントのアバターURLを更新
	agent.AvatarURL = &avatarURLWithTimestamp
	if err := h.agentUsecase.UpdateAgent(c.Request.Context(), agent); err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"avatar_url": avatarURLWithTimestamp,
		"message":    "avatar uploaded successfully",
	})
}

// UploadGroupChatIcon グループチャットアイコンをアップロード
// @Summary グループチャットアイコンアップロード
// @Description グループチャットのアイコン画像をアップロードします（所有者のみ）
// @Tags Upload
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path string true "グループチャットID"
// @Param file formData file true "アイコン画像ファイル"
// @Success 200 {object} map[string]string "アップロード成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 403 {object} response.ErrorResponse "権限エラー"
// @Failure 404 {object} response.ErrorResponse "グループチャットが見つかりません"
// @Failure 413 {object} response.ErrorResponse "ファイルサイズ超過"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/group-chats/{id}/icon [post]
func (h *UploadHandler) UploadGroupChatIcon(c *gin.Context) {
	// グループチャットIDを取得
	groupChatIDStr := c.Param("id")
	groupChatID, err := uuid.Parse(groupChatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid group chat ID"))
		return
	}

	// ファイルを取得
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("file is required"))
		return
	}
	defer file.Close()

	// ファイルサイズチェック（5MB）
	const maxSize = 5 * 1024 * 1024
	if header.Size > maxSize {
		c.JSON(http.StatusRequestEntityTooLarge, response.NewValidationErrorResponse("file size must be less than 5MB"))
		return
	}

	// Content-Typeチェック
	contentType := header.Header.Get("Content-Type")
	if !isValidImageType(contentType) {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("file must be an image (jpeg, png, webp)"))
		return
	}

	// ユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("user not found in context"))
		return
	}

	// UserIDをUUIDに変換
	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("invalid user ID"))
		return
	}

	// グループチャットを取得
	groupChat, err := h.groupChatUsecase.GetGroupChat(c.Request.Context(), userID, groupChatID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.NewErrorResponse(fmt.Errorf("group chat not found"), http.StatusNotFound))
		return
	}

	// 所有者チェック
	if groupChat.UserID != userID {
		c.JSON(http.StatusForbidden, response.NewErrorResponse(fmt.Errorf("access denied"), http.StatusForbidden))
		return
	}

	// 古いアイコンがあれば削除
	if groupChat.IconURL != "" {
		if err := h.s3Client.DeleteAvatar(c.Request.Context(), groupChat.IconURL); err != nil {
			// 削除失敗してもログだけ出して続行
			fmt.Printf("failed to delete old group chat icon: %v\n", err)
		}
	}

	// S3/MinIOにアップロード
	iconURL, err := h.s3Client.UploadAvatar(c.Request.Context(), "group-chats", groupChatID.String(), file, contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// キャッシュバスティング用のタイムスタンプを追加
	iconURLWithTimestamp := fmt.Sprintf("%s?t=%d", iconURL, time.Now().Unix())

	// グループチャットのアイコンURLを更新
	input := groupchatUsecase.UpdateGroupChatInput{
		UserID:      userID,
		GroupChatID: groupChatID,
		Name:        groupChat.Name,
		Description: groupChat.Description,
		IconURL:     iconURLWithTimestamp,
	}

	if _, err := h.groupChatUsecase.UpdateGroupChat(c.Request.Context(), input); err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"icon_url": iconURLWithTimestamp,
		"message":  "icon uploaded successfully",
	})
}

// UploadGroupIcon グループチャットアイコンをアップロード（作成時用）
// @Summary グループチャットアイコンアップロード（作成時）
// @Description グループチャット作成時にアイコン画像を一時アップロードします
// @Tags Upload
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param file formData file true "アイコン画像ファイル"
// @Success 200 {object} map[string]string "アップロード成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 413 {object} response.ErrorResponse "ファイルサイズ超過"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/upload/icon/group [post]
func (h *UploadHandler) UploadGroupIcon(c *gin.Context) {
	// ファイルを取得
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("file is required"))
		return
	}
	defer file.Close()

	// ファイルサイズチェック（5MB）
	const maxSize = 5 * 1024 * 1024
	if header.Size > maxSize {
		c.JSON(http.StatusRequestEntityTooLarge, response.NewValidationErrorResponse("file size must be less than 5MB"))
		return
	}

	// Content-Typeチェック
	contentType := header.Header.Get("Content-Type")
	if !isValidImageType(contentType) {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("file must be an image (jpeg, png, webp)"))
		return
	}

	// ユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("user not found in context"))
		return
	}

	// 一時的なIDを生成（グループチャット作成前）
	tempID := uuid.New().String()

	// S3/MinIOにアップロード（group-chats/temp/{user_id}/{temp_id}）
	uploadPath := fmt.Sprintf("temp/%s/%s", user.ID, tempID)
	iconURL, err := h.s3Client.UploadAvatar(c.Request.Context(), "group-chats", uploadPath, file, contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// キャッシュバスティング用のタイムスタンプを追加
	iconURLWithTimestamp := fmt.Sprintf("%s?t=%d", iconURL, time.Now().Unix())

	c.JSON(http.StatusOK, gin.H{
		"icon_url": iconURLWithTimestamp,
		"message":  "icon uploaded successfully",
	})
}

// UploadAgentAvatarSimple エージェントアバターをアップロード（作成時用）
// @Summary エージェントアバターアップロード（作成時）
// @Description エージェント作成時にアバター画像を一時アップロードします
// @Tags Upload
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param file formData file true "アバター画像ファイル"
// @Success 200 {object} map[string]string "アップロード成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 413 {object} response.ErrorResponse "ファイルサイズ超過"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/upload/avatar/agent [post]
func (h *UploadHandler) UploadAgentAvatarSimple(c *gin.Context) {
	// ファイルを取得
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("file is required"))
		return
	}
	defer file.Close()

	// ファイルサイズチェック（5MB）
	const maxSize = 5 * 1024 * 1024
	if header.Size > maxSize {
		c.JSON(http.StatusRequestEntityTooLarge, response.NewValidationErrorResponse("file size must be less than 5MB"))
		return
	}

	// Content-Typeチェック
	contentType := header.Header.Get("Content-Type")
	if !isValidImageType(contentType) {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("file must be an image (jpeg, png, webp)"))
		return
	}

	// ユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("user not found in context"))
		return
	}

	// 一時的なIDを生成（エージェント作成前）
	tempID := uuid.New().String()

	// S3/MinIOにアップロード（agents/temp/{user_id}/{temp_id}）
	uploadPath := fmt.Sprintf("temp/%s/%s", user.ID, tempID)
	avatarURL, err := h.s3Client.UploadAvatar(c.Request.Context(), "agents", uploadPath, file, contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// キャッシュバスティング用のタイムスタンプを追加
	avatarURLWithTimestamp := fmt.Sprintf("%s?t=%d", avatarURL, time.Now().Unix())

	c.JSON(http.StatusOK, gin.H{
		"avatar_url": avatarURLWithTimestamp,
		"message":    "avatar uploaded successfully",
	})
}

// isValidImageType 有効な画像タイプかチェック
func isValidImageType(contentType string) bool {
	validTypes := []string{
		"image/jpeg",
		"image/jpg",
		"image/png",
		"image/webp",
	}

	for _, validType := range validTypes {
		if strings.Contains(contentType, validType) {
			return true
		}
	}

	return false
}
