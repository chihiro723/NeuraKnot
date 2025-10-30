package request

// AnalyticsRequest 統計データ取得リクエスト
type AnalyticsRequest struct {
	TimeRange string `form:"time_range"` // today, week, month, all
}
