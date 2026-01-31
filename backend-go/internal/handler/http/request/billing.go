package request

// CreateCheckoutSessionRequest Checkout Session作成リクエスト
type CreateCheckoutSessionRequest struct {
	Tier       string `json:"tier" binding:"required"`        // free, pro, max
	SuccessURL string `json:"success_url" binding:"required"` // 成功時のリダイレクトURL
	CancelURL  string `json:"cancel_url" binding:"required"`  // キャンセル時のリダイレクトURL
}

// CreateBillingPortalSessionRequest Billing Portal Session作成リクエスト
type CreateBillingPortalSessionRequest struct {
	ReturnURL string `json:"return_url" binding:"required"` // 戻り先URL
}

// ChangeSubscriptionPlanRequest プラン変更リクエスト
type ChangeSubscriptionPlanRequest struct {
	Tier string `json:"tier" binding:"required"` // free, pro, max
}
