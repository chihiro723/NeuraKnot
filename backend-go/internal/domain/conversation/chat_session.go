package conversation

import (
	"time"

	"github.com/google/uuid"
)

// ChatSession はAI処理セッションのドメインモデル
type ChatSession struct {
	ID               uuid.UUID
	UserID           uuid.UUID
	ConversationID   *uuid.UUID // NULLable (グループチャットの場合はNULL)
	GroupChatID      *uuid.UUID // グループチャットID (1対1チャットの場合はNULL)
	AIAgentID        uuid.UUID
	MessageID        *uuid.UUID
	Provider         string
	Model            string
	Persona          string
	Temperature      float64
	TokensPrompt     int
	TokensCompletion int
	TokensTotal      int
	ProcessingTimeMs int
	ToolsUsed        int
	Status           string
	ErrorMessage     *string
	StartedAt        time.Time
	CompletedAt      *time.Time

	// コストスナップショット（利用時点の単価で確定し、以降は不変）
	CostUSD             float64
	PromptCostPer1M     float64
	CompletionCostPer1M float64
	PricingID           *uuid.UUID
}

// ApplyPricing は利用時点の単価を適用し、コストを確定する。
// 単価はスナップショットとして保存され、後から単価マスタが変わっても
// このセッションのコストは変化しない（過去コストの不変性を担保）。
func (cs *ChatSession) ApplyPricing(pricingID uuid.UUID, promptCostPer1M, completionCostPer1M float64) {
	cs.PricingID = &pricingID
	cs.PromptCostPer1M = promptCostPer1M
	cs.CompletionCostPer1M = completionCostPer1M
	cs.CostUSD = float64(cs.TokensPrompt)/1_000_000.0*promptCostPer1M +
		float64(cs.TokensCompletion)/1_000_000.0*completionCostPer1M
}

// NewChatSession は新しいChatSession（1対1チャット用）を作成
func NewChatSession(
	userID, conversationID, aiAgentID uuid.UUID,
	messageID *uuid.UUID,
	provider, model, persona string,
	temperature float64,
	tokensPrompt, tokensCompletion, tokensTotal int,
	processingTimeMs, toolsUsed int,
) *ChatSession {
	now := time.Now()
	return &ChatSession{
		ID:               uuid.New(),
		UserID:           userID,
		ConversationID:   &conversationID,
		GroupChatID:      nil,
		AIAgentID:        aiAgentID,
		MessageID:        messageID,
		Provider:         provider,
		Model:            model,
		Persona:          persona,
		Temperature:      temperature,
		TokensPrompt:     tokensPrompt,
		TokensCompletion: tokensCompletion,
		TokensTotal:      tokensTotal,
		ProcessingTimeMs: processingTimeMs,
		ToolsUsed:        toolsUsed,
		Status:           "completed",
		StartedAt:        now,
		CompletedAt:      &now,
	}
}

// NewGroupChatSession は新しいChatSession（グループチャット用）を作成
func NewGroupChatSession(
	userID, groupChatID, aiAgentID uuid.UUID,
	messageID *uuid.UUID,
	provider, model, persona string,
	temperature float64,
	tokensPrompt, tokensCompletion, tokensTotal int,
	processingTimeMs, toolsUsed int,
) *ChatSession {
	now := time.Now()
	return &ChatSession{
		ID:               uuid.New(),
		UserID:           userID,
		ConversationID:   nil,
		GroupChatID:      &groupChatID,
		AIAgentID:        aiAgentID,
		MessageID:        messageID,
		Provider:         provider,
		Model:            model,
		Persona:          persona,
		Temperature:      temperature,
		TokensPrompt:     tokensPrompt,
		TokensCompletion: tokensCompletion,
		TokensTotal:      tokensTotal,
		ProcessingTimeMs: processingTimeMs,
		ToolsUsed:        toolsUsed,
		Status:           "completed",
		StartedAt:        now,
		CompletedAt:      &now,
	}
}

// MarkAsFailed はセッションを失敗としてマーク
func (cs *ChatSession) MarkAsFailed(errorMessage string) {
	cs.Status = "failed"
	cs.ErrorMessage = &errorMessage
	now := time.Now()
	cs.CompletedAt = &now
}
