package usage

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"backend-go/internal/domain/billing"
	"backend-go/internal/domain/conversation"

	"github.com/google/uuid"
)

// ErrPricingNotFound は利用したモデルの単価が未登録の場合のエラー
var ErrPricingNotFound = errors.New("llm pricing not found")

// Recorder はトークン使用量とコストを一元的に記録するユースケース。
//
// コスト計算の唯一の経路であり、以下の不変条件を保証する:
//   - チャットセッションのコストは利用時点(started_at)の単価で確定し、
//     ai_chat_sessions にスナップショット保存される（過去コストは不変）。
//   - セッション行を持たない補助的な利用（質問候補生成など）は
//     月次集計テーブル token_usage に加算される。
//
// ai_chat_sessions と token_usage はデータソースとして重複しないため、
// 両者を合算しても二重計上は発生しない。
type Recorder struct {
	pricingRepo     billing.LLMPricingRepository
	chatSessionRepo conversation.ChatSessionRepository
	tokenUsageRepo  billing.TokenUsageRepository
}

// NewRecorder は使用量レコーダーを作成
func NewRecorder(
	pricingRepo billing.LLMPricingRepository,
	chatSessionRepo conversation.ChatSessionRepository,
	tokenUsageRepo billing.TokenUsageRepository,
) *Recorder {
	return &Recorder{
		pricingRepo:     pricingRepo,
		chatSessionRepo: chatSessionRepo,
		tokenUsageRepo:  tokenUsageRepo,
	}
}

// RecordSessionUsage はチャットセッションのコストを確定し ai_chat_sessions に保存する。
//
// 単価は session.StartedAt 時点で有効な行を採用する（未来単価の誤適用を防ぐ）。
// 単価が未登録の場合でもトークン情報を失わないよう、cost=0 のまま保存して警告を出す
// （管理画面での単価登録を前提とするが、記録自体は best-effort で継続する）。
func (r *Recorder) RecordSessionUsage(ctx context.Context, session *conversation.ChatSession) error {
	pricing, err := r.pricingRepo.FindEffectiveAt(ctx, session.Provider, session.Model, session.StartedAt)
	if err != nil || pricing == nil {
		log.Printf(
			"WARN: llm pricing not found, recording session without cost (provider=%s model=%s): %v",
			session.Provider, session.Model, err,
		)
		return r.chatSessionRepo.Save(ctx, session)
	}

	session.ApplyPricing(pricing.ID, pricing.PromptCostPer1M, pricing.CompletionCostPer1M)
	return r.chatSessionRepo.Save(ctx, session)
}

// AuxiliaryUsageInput はセッション行を持たない補助利用の記録入力
type AuxiliaryUsageInput struct {
	UserID     uuid.UUID
	Provider   string
	Model      string
	Prompt     int64
	Completion int64
}

// RecordAuxiliaryUsage は質問候補生成などセッション行を持たない利用を
// 月次 token_usage に加算する。コストは現時点で有効な単価で計算する。
func (r *Recorder) RecordAuxiliaryUsage(ctx context.Context, in AuxiliaryUsageInput) error {
	now := time.Now()

	var cost float64
	pricing, err := r.pricingRepo.FindEffectiveAt(ctx, in.Provider, in.Model, now)
	if err != nil || pricing == nil {
		log.Printf(
			"WARN: llm pricing not found, recording auxiliary usage without cost (provider=%s model=%s): %v",
			in.Provider, in.Model, err,
		)
		cost = 0
	} else {
		cost = pricing.CalculateCost(in.Prompt, in.Completion)
	}

	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0)

	existing, findErr := r.tokenUsageRepo.FindByUserAndPeriod(ctx, in.UserID, periodStart, periodEnd)
	if findErr != nil || existing == nil {
		usage, newErr := billing.NewTokenUsage(in.UserID, periodStart, periodEnd)
		if newErr != nil {
			return fmt.Errorf("failed to create token usage: %w", newErr)
		}
		if addErr := usage.AddUsage(in.Provider, in.Prompt, in.Completion, cost); addErr != nil {
			return fmt.Errorf("failed to add usage: %w", addErr)
		}
		return r.tokenUsageRepo.Create(ctx, usage)
	}

	if addErr := existing.AddUsage(in.Provider, in.Prompt, in.Completion, cost); addErr != nil {
		return fmt.Errorf("failed to add usage: %w", addErr)
	}
	return r.tokenUsageRepo.Update(ctx, existing)
}
