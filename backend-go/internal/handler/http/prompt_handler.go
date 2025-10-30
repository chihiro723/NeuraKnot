package http

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"backend-go/internal/handler/http/request"
	"backend-go/internal/handler/http/response"

	"github.com/gin-gonic/gin"
)

// PromptHandler はプロンプト関連のハンドラー
type PromptHandler struct {
	pythonBackendURL string
}

// NewPromptHandler はPromptHandlerを作成
func NewPromptHandler(pythonBackendURL string) *PromptHandler {
	return &PromptHandler{
		pythonBackendURL: pythonBackendURL,
	}
}

// EnhancePrompt はシステムプロンプトを強化
// @Summary プロンプト強化
// @Description AIを使用してシステムプロンプトを自動生成します
// @Tags Prompt
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body request.EnhancePromptRequest true "プロンプト強化リクエスト"
// @Success 200 {object} response.EnhancePromptResponse "強化成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 503 {object} response.ErrorResponse "LLM APIエラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /api/v1/prompts/enhance [post]
func (h *PromptHandler) EnhancePrompt(c *gin.Context) {
	// リクエストボディをパース
	var req request.EnhancePromptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// Python バックエンドにプロキシ
	requestBody, err := json.Marshal(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// タイムアウト付きHTTPクライアント（30秒）
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Python バックエンドへリクエスト
	pythonReq, err := http.NewRequest(
		"POST",
		h.pythonBackendURL+"/api/v1/enhance-prompt",
		bytes.NewBuffer(requestBody),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	pythonReq.Header.Set("Content-Type", "application/json")

	// リクエスト実行
	pythonResp, err := client.Do(pythonReq)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "プロンプト生成サービスへの接続に失敗しました",
		})
		return
	}
	defer pythonResp.Body.Close()

	// レスポンスボディを読み取り
	body, err := io.ReadAll(pythonResp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	// エラーレスポンスの場合
	if pythonResp.StatusCode != http.StatusOK {
		var errorResp map[string]interface{}
		if unmarshalErr := json.Unmarshal(body, &errorResp); unmarshalErr == nil {
			c.JSON(pythonResp.StatusCode, errorResp)
		} else {
			c.JSON(pythonResp.StatusCode, gin.H{
				"error": "プロンプト生成に失敗しました",
			})
		}
		return
	}

	// 成功レスポンス
	var enhanceResp response.EnhancePromptResponse
	if unmarshalErr := json.Unmarshal(body, &enhanceResp); unmarshalErr != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(unmarshalErr, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, enhanceResp)
}
