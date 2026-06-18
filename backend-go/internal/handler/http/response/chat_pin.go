package response

import (
	"time"

	"backend-go/internal/domain/chatpin"
)

// ChatPinResponse は 1 件のチャットピンを表すレスポンス
type ChatPinResponse struct {
	ID       string `json:"id"`
	ChatType string `json:"chat_type"` // "direct" | "group"
	TargetID string `json:"target_id"`
	PinnedAt string `json:"pinned_at"` // RFC3339
}

// ChatPinsResponse はピン一覧のレスポンス
type ChatPinsResponse struct {
	Pins []*ChatPinResponse `json:"pins"`
}

// ToChatPinResponse は Pin を DTO に変換
func ToChatPinResponse(p *chatpin.Pin) *ChatPinResponse {
	return &ChatPinResponse{
		ID:       p.ID.String(),
		ChatType: string(p.ChatType),
		TargetID: p.TargetID.String(),
		PinnedAt: p.PinnedAt.UTC().Format(time.RFC3339),
	}
}

// ToChatPinsResponse はピン配列を一括で DTO に変換
func ToChatPinsResponse(pins []*chatpin.Pin) *ChatPinsResponse {
	result := make([]*ChatPinResponse, 0, len(pins))
	for _, p := range pins {
		result = append(result, ToChatPinResponse(p))
	}
	return &ChatPinsResponse{Pins: result}
}
