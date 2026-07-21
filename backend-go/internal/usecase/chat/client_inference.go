package chat

import (
	"context"
	"fmt"
	"log"

	"backend-go/internal/domain/conversation"
	"backend-go/internal/infrastructure/external"

	"github.com/google/uuid"
)

// ClientInferenceContext はクライアント(ブラウザ WebLLM)で推論するために
// 必要な材料一式。サーバーでは推論を行わず、これをクライアントに返す。
type ClientInferenceContext struct {
	// UserMessage は保存済みのユーザーメッセージ
	UserMessage *conversation.Message
	// SystemPrompt はペルソナ + カスタムを結合したシステムプロンプト
	SystemPrompt string
	// Messages は会話履歴（古い順、最新のユーザーメッセージを含む）。OpenAI 互換形式。
	Messages []external.ConversationMessage
	// LLM 実行パラメータ
	Provider    string
	Model       string
	Temperature float64
	MaxTokens   int
	AgentName   string
}

// PrepareClientInference はクライアント推論(WebLLM)のための材料を用意する。
//
// サーバー(Python)では推論せず、
//  1. ユーザーメッセージを DB に保存
//  2. 会話履歴とシステムプロンプト・LLM パラメータを組み立てて返す
// までを行う。実際の推論はブラウザで行い、結果は CompleteClientInference で保存する。
func (uc *ChatUsecase) PrepareClientInference(
	ctx context.Context,
	userID, conversationID uuid.UUID,
	messageContent string,
) (*ClientInferenceContext, error) {
	// 1. 会話を取得して所有者確認
	conv, err := uc.convRepo.FindByID(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to find conversation: %w", err)
	}
	if conv.UserID != userID {
		return nil, fmt.Errorf("unauthorized: user does not own this conversation")
	}

	// 2. AI設定を取得して検証
	agent, err := uc.aiRepo.FindByID(ctx, conv.AIAgentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI agent: %w", err)
	}
	if err := uc.validateAgentModel(ctx, agent); err != nil {
		return nil, err
	}

	// 3. ユーザーメッセージを保存
	userMessage, err := conversation.NewMessage(
		conversationID,
		conversation.SenderTypeUser,
		userID,
		messageContent,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create user message: %w", err)
	}
	if err := uc.msgRepo.Save(ctx, userMessage); err != nil {
		return nil, fmt.Errorf("failed to save user message: %w", err)
	}

	// ユーザーメッセージ保存時に会話の統計を更新（ストリーミング経路と同様）
	conv.IncrementMessageCount()
	if err := uc.convRepo.Update(ctx, conv); err != nil {
		log.Printf("ERROR: Failed to update conversation after user message: %v", err)
		// ベストエフォート（続行）
	}

	// 4. 会話履歴を取得（過去20件）して古い順に並べる（最新ユーザーメッセージを含む）
	messages, err := uc.msgRepo.FindByConversationID(ctx, conversationID, 20)
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation history: %w", err)
	}
	history := make([]external.ConversationMessage, 0, len(messages))
	for i := len(messages) - 1; i >= 0; i-- {
		msg := messages[i]
		role := "user"
		if msg.SenderType == conversation.SenderTypeAI {
			role = "assistant"
		}
		history = append(history, external.ConversationMessage{
			Role:    role,
			Content: msg.Content,
		})
	}

	return &ClientInferenceContext{
		UserMessage:  userMessage,
		SystemPrompt: agent.GetSystemPrompt(),
		Messages:     history,
		Provider:     agent.Provider.String(),
		Model:        agent.Model,
		Temperature:  agent.Temperature,
		MaxTokens:    agent.MaxTokens,
		AgentName:    agent.Name,
	}, nil
}

// CompleteClientInference はクライアント(ブラウザ)で生成された AI 応答を保存する。
//
// WebLLM(ローカル)推論はサーバーコストが発生しないため、
// トークン使用量は記録するがコストは $0 として扱われる（llm_pricing の webllm 単価$0 経由）。
func (uc *ChatUsecase) CompleteClientInference(
	ctx context.Context,
	userID, conversationID uuid.UUID,
	assistantContent string,
	promptTokens, completionTokens int,
	processingTimeMs int,
) (*conversation.Message, error) {
	// 1. 会話を取得して所有者確認
	conv, err := uc.convRepo.FindByID(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to find conversation: %w", err)
	}
	if conv.UserID != userID {
		return nil, fmt.Errorf("unauthorized: user does not own this conversation")
	}

	// 2. AI設定を取得（セッション記録の provider/model に使用）
	agent, err := uc.aiRepo.FindByID(ctx, conv.AIAgentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI agent: %w", err)
	}

	// 3. AIメッセージを保存
	aiMessage, err := conversation.NewMessage(
		conversationID,
		conversation.SenderTypeAI,
		conv.AIAgentID,
		assistantContent,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create AI message: %w", err)
	}
	if err := uc.msgRepo.Save(ctx, aiMessage); err != nil {
		return nil, fmt.Errorf("failed to save AI message: %w", err)
	}

	// 4. 会話とAgentの統計を更新（AIメッセージ分）
	conv.IncrementMessageCount()
	if err := uc.convRepo.Update(ctx, conv); err != nil {
		log.Printf("ERROR: Failed to update conversation after AI message: %v", err)
	}
	agent.IncrementMessageCount()
	if err := uc.aiRepo.Update(ctx, agent); err != nil {
		log.Printf("ERROR: Failed to update agent after AI message: %v", err)
	}

	// 5. セッション使用量を記録（コストは llm_pricing の単価に基づく。webllm は $0）
	totalTokens := promptTokens + completionTokens
	chatSession := conversation.NewChatSession(
		userID,
		conversationID,
		conv.AIAgentID,
		&aiMessage.ID,
		agent.Provider.String(),
		agent.Model,
		agent.PersonaType.String(),
		agent.Temperature,
		promptTokens,
		completionTokens,
		totalTokens,
		processingTimeMs,
		0, // ローカル推論ではツール未対応（Phase 1）
	)
	if err := uc.usageRecorder.RecordSessionUsage(ctx, chatSession); err != nil {
		// ベストエフォート（ユーザーへのレスポンスは正常に返す）
		log.Printf("ERROR: Failed to save chat session for client inference: %v", err)
	}

	return aiMessage, nil
}
