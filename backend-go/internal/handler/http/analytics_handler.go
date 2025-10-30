package http

import (
	"backend-go/internal/domain/analytics"
	"backend-go/internal/handler/http/middleware"
	"backend-go/internal/handler/http/request"
	"backend-go/internal/handler/http/response"
	analyticsUsecase "backend-go/internal/usecase/analytics"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AnalyticsHandler 統計データのハンドラー
type AnalyticsHandler struct {
	analyticsUsecase *analyticsUsecase.AnalyticsUsecase
}

// NewAnalyticsHandler 統計データハンドラーを作成
func NewAnalyticsHandler(analyticsUsecase *analyticsUsecase.AnalyticsUsecase) *AnalyticsHandler {
	return &AnalyticsHandler{
		analyticsUsecase: analyticsUsecase,
	}
}

// GetUserAnalytics ユーザーの統計データを取得
// @Summary ユーザーの統計データを取得
// @Description 認証済みユーザーの統計データ（トークン使用量、活動量、エージェントパフォーマンス、ツール使用統計、サービス連携状況）を取得します
// @Tags Analytics
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param time_range query string false "期間フィルター (today, week, month, all)" default(all)
// @Success 200 {object} response.AnalyticsResponse "統計データ取得成功"
// @Failure 400 {object} response.ErrorResponse "バリデーションエラー"
// @Failure 401 {object} response.ErrorResponse "認証エラー"
// @Failure 500 {object} response.ErrorResponse "サーバーエラー"
// @Router /analytics [get]
func (h *AnalyticsHandler) GetUserAnalytics(c *gin.Context) {
	// 認証ミドルウェアからユーザーを取得
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("User not found in context"))
		return
	}

	// クエリパラメータから期間フィルターを取得
	var req request.AnalyticsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse(err.Error()))
		return
	}

	// デフォルトは全期間
	if req.TimeRange == "" {
		req.TimeRange = "all"
	}

	// TimeRangeをパース
	timeRange := analytics.ParseTimeRange(req.TimeRange)

	// UserIDをUUIDに変換
	userUUID, err := uuid.Parse(user.ID.String())
	if err != nil {
		c.JSON(http.StatusBadRequest, response.NewValidationErrorResponse("Invalid user ID"))
		return
	}

	// 統計データを取得
	analyticsData, err := h.analyticsUsecase.GetUserAnalytics(c.Request.Context(), userUUID, timeRange)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.NewErrorResponse(err, http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, response.ToAnalyticsResponse(analyticsData))
}
