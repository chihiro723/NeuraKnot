package handler

import (
	"net/http"
	"strconv"

	"go-backend/internal/domain"

	"github.com/gin-gonic/gin"
)

// TextHandler テキストハンドラー
// DDDのインターフェース層：HTTPリクエストを処理し、ユースケースを呼び出す
type TextHandler struct {
	textUsecase domain.TextUsecase
}

// NewTextHandler テキストハンドラーの新しいインスタンスを作成
func NewTextHandler(textUsecase domain.TextUsecase) *TextHandler {
	return &TextHandler{
		textUsecase: textUsecase,
	}
}

// CreateTextRequest テキスト作成リクエストの構造体
type CreateTextRequest struct {
	Content string `json:"content" binding:"required" example:"これは保存したいテキストです"`
	Title   string `json:"title" example:"テキストのタイトル"`
}

// UpdateTextRequest テキスト更新リクエストの構造体
type UpdateTextRequest struct {
	Content string `json:"content" example:"更新されたテキストです"`
	Title   string `json:"title" example:"更新されたタイトル"`
}

// TextResponse テキストレスポンスの構造体
type TextResponse struct {
	ID        int    `json:"id" example:"1"`
	Content   string `json:"content" example:"これは保存したいテキストです"`
	Title     string `json:"title" example:"テキストのタイトル"`
	CreatedAt string `json:"created_at" example:"2024-01-01T00:00:00Z"`
	UpdatedAt string `json:"updated_at" example:"2024-01-01T00:00:00Z"`
}

// ErrorResponse エラーレスポンスの構造体
type ErrorResponse struct {
	Error   string `json:"error" example:"エラーメッセージ"`
	Message string `json:"message" example:"詳細なエラーメッセージ"`
}

// CreateText テキストを作成
// @Summary テキストを作成
// @Description POSTでテキストを受け取ってデータベースに保存します
// @Tags texts
// @Accept json
// @Produce json
// @Param request body CreateTextRequest true "テキスト作成リクエスト"
// @Success 201 {object} TextResponse "作成されたテキスト"
// @Failure 400 {object} ErrorResponse "バリデーションエラー"
// @Failure 500 {object} ErrorResponse "サーバーエラー"
// @Router /api/v1/texts [post]
func (h *TextHandler) CreateText(c *gin.Context) {
	var req CreateTextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	text, err := h.textUsecase.CreateText(req.Content, req.Title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "creation_failed",
			Message: err.Error(),
		})
		return
	}

	response := TextResponse{
		ID:        text.ID,
		Content:   text.Content,
		Title:     text.Title,
		CreatedAt: text.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt: text.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	c.JSON(http.StatusCreated, response)
}

// GetTexts すべてのテキストを取得
// @Summary テキスト一覧を取得
// @Description 保存されているすべてのテキストを取得します（リアルタイム更新テスト）よーー
// @Tags texts
// @Produce json
// @Success 200 {array} TextResponse "テキスト一覧"
// @Failure 500 {object} ErrorResponse "サーバーエラー"
// @Router /api/v1/texts [get]
func (h *TextHandler) GetTexts(c *gin.Context) {
	texts, err := h.textUsecase.GetTexts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	var responses []TextResponse
	for _, text := range texts {
		responses = append(responses, TextResponse{
			ID:        text.ID,
			Content:   text.Content,
			Title:     text.Title,
			CreatedAt: text.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedAt: text.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}

	c.JSON(http.StatusOK, responses)
}

// GetTextByID IDでテキストを取得
// @Summary テキストを取得
// @Description 指定されたIDのテキストを取得します
// @Tags texts
// @Produce json
// @Param id path int true "テキストID"
// @Success 200 {object} TextResponse "テキスト"
// @Failure 400 {object} ErrorResponse "無効なID"
// @Failure 404 {object} ErrorResponse "テキストが見つからない"
// @Failure 500 {object} ErrorResponse "サーバーエラー"
// @Router /api/v1/texts/{id} [get]
func (h *TextHandler) GetTextByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "テキストIDは数値である必要があります",
		})
		return
	}

	text, err := h.textUsecase.GetTextByID(id)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "text with id "+strconv.Itoa(id)+" not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	response := TextResponse{
		ID:        text.ID,
		Content:   text.Content,
		Title:     text.Title,
		CreatedAt: text.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt: text.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	c.JSON(http.StatusOK, response)
}

// UpdateText テキストを更新
// @Summary テキストを更新
// @Description 指定されたIDのテキストを更新します
// @Tags texts
// @Accept json
// @Produce json
// @Param id path int true "テキストID"
// @Param request body UpdateTextRequest true "テキスト更新リクエスト"
// @Success 200 {object} TextResponse "更新されたテキスト"
// @Failure 400 {object} ErrorResponse "バリデーションエラー"
// @Failure 404 {object} ErrorResponse "テキストが見つからない"
// @Failure 500 {object} ErrorResponse "サーバーエラー"
// @Router /api/v1/texts/{id} [put]
func (h *TextHandler) UpdateText(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "テキストIDは数値である必要があります",
		})
		return
	}

	var req UpdateTextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	text, err := h.textUsecase.UpdateText(id, req.Content, req.Title)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "text with id "+strconv.Itoa(id)+" not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, ErrorResponse{
			Error:   "update_failed",
			Message: err.Error(),
		})
		return
	}

	response := TextResponse{
		ID:        text.ID,
		Content:   text.Content,
		Title:     text.Title,
		CreatedAt: text.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt: text.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	c.JSON(http.StatusOK, response)
}

// DeleteText テキストを削除
// @Summary テキストを削除
// @Description 指定されたIDのテキストを削除します
// @Tags texts
// @Param id path int true "テキストID"
// @Success 204 "削除成功"
// @Failure 400 {object} ErrorResponse "無効なID"
// @Failure 404 {object} ErrorResponse "テキストが見つからない"
// @Failure 500 {object} ErrorResponse "サーバーエラー"
// @Router /api/v1/texts/{id} [delete]
func (h *TextHandler) DeleteText(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "テキストIDは数値である必要があります",
		})
		return
	}

	err = h.textUsecase.DeleteText(id)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "text with id "+strconv.Itoa(id)+" not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, ErrorResponse{
			Error:   "delete_failed",
			Message: err.Error(),
		})
		return
	}

	c.Status(http.StatusNoContent)
}
