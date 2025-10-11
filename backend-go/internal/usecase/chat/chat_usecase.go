package chat

import (
	"context"
	"fmt"

	"backend-go/internal/domain/ai"
	"backend-go/internal/domain/conversation"
	"backend-go/internal/infrastructure/external"

	"github.com/google/uuid"
)

// ChatUsecase はチャットのユースケース
type ChatUsecase struct {
	aiRepo   ai.Repository
	convRepo conversation.ConversationRepository
	msgRepo  conversation.MessageRepository
	aiClient *external.AIClient
}

// NewChatUsecase はチャットユースケースを作成
func NewChatUsecase(
	aiRepo ai.Repository,
	convRepo conversation.ConversationRepository,
	msgRepo conversation.MessageRepository,
	aiClient *external.AIClient,
) *ChatUsecase {
	return &ChatUsecase{
		aiRepo:   aiRepo,
		convRepo: convRepo,
		msgRepo:  msgRepo,
		aiClient: aiClient,
	}
}

// ChatResult はチャット結果
type ChatResult struct {
	UserMessage *conversation.Message
	AIMessage   *conversation.Message
	Metadata    external.AIMetadata
}

// GetOrCreateConversation は会話を取得または作成
func (uc *ChatUsecase) GetOrCreateConversation(
	ctx context.Context,
	userID, aiAgentID uuid.UUID,
) (*conversation.Conversation, error) {
	// 既存の会話を検索
	conv, err := uc.convRepo.FindByUserAndAgent(ctx, userID, aiAgentID)
	if err != nil {
		return nil, fmt.Errorf("failed to find conversation: %w", err)
	}

	// 会話が存在すれば返す
	if conv != nil {
		return conv, nil
	}

	// 新しい会話を作成
	conv, err = conversation.NewConversation(userID, aiAgentID)
	if err != nil {
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	// 保存
	if err := uc.convRepo.Save(ctx, conv); err != nil {
		return nil, fmt.Errorf("failed to save conversation: %w", err)
	}

	return conv, nil
}

// SendMessage はメッセージを送信してAI応答を取得
func (uc *ChatUsecase) SendMessage(
	ctx context.Context,
	userID, conversationID uuid.UUID,
	messageContent string,
) (*ChatResult, error) {
	// 1. 会話を取得
	conv, err := uc.convRepo.FindByID(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to find conversation: %w", err)
	}

	// ユーザーが会話の所有者か確認
	if conv.UserID != userID {
		return nil, fmt.Errorf("unauthorized: user does not own this conversation")
	}

	// 2. ユーザーメッセージを保存
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

	// 3. 会話履歴を取得（過去20件）
	messages, err := uc.msgRepo.FindByConversationID(ctx, conversationID, 20)
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation history: %w", err)
	}

	// 履歴を逆順に並べる（古い順）
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

	// 4. AI設定を取得
	agent, err := uc.aiRepo.FindByID(ctx, conv.AIAgentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI agent: %w", err)
	}

	// 5. Backend-pythonにリクエスト
	// システムプロンプトをカスタムシステムプロンプトとして設定
	systemPrompt := agent.GetSystemPrompt()
	aiReq := external.ChatRequest{
		UserID:              userID.String(),
		ConversationID:      conversationID.String(),
		Message:             messageContent,
		ConversationHistory: history[:len(history)-1], // 最新のユーザーメッセージを除く
		AgentConfig: external.AgentConfig{
			Provider:           agent.Provider.String(), // Providerを文字列に変換
			Model:              agent.Model,
			Temperature:        agent.Temperature,
			MaxTokens:          agent.MaxTokens,
			Persona:            agent.PersonaType.String(), // PersonaTypeを文字列に変換
			CustomSystemPrompt: &systemPrompt,
		},
		IncludeBasicTools: true, // 基本ツールを含める
	}

	aiResp, err := uc.aiClient.Chat(ctx, aiReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI response: %w", err)
	}

	// 6. AIレスポンスを保存
	aiMessage, err := conversation.NewMessage(
		conversationID,
		conversation.SenderTypeAI,
		conv.AIAgentID,
		aiResp.Message, // Response から Message に変更
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create AI message: %w", err)
	}

	if err := uc.msgRepo.Save(ctx, aiMessage); err != nil {
		return nil, fmt.Errorf("failed to save AI message: %w", err)
	}

	// 7. 会話とAgentの統計を更新
	conv.IncrementMessageCount()
	conv.IncrementMessageCount() // ユーザーとAIの2回
	if err := uc.convRepo.Update(ctx, conv); err != nil {
		return nil, fmt.Errorf("failed to update conversation: %w", err)
	}

	agent.IncrementMessageCount()
	if err := uc.aiRepo.Update(ctx, agent); err != nil {
		return nil, fmt.Errorf("failed to update agent: %w", err)
	}

	return &ChatResult{
		UserMessage: userMessage,
		AIMessage:   aiMessage,
		Metadata:    aiResp.Metadata,
	}, nil
}

// ListConversations はユーザーの会話一覧を取得
func (uc *ChatUsecase) ListConversations(
	ctx context.Context,
	userID uuid.UUID,
) ([]*conversation.Conversation, error) {
	// ユーザーの会話一覧を取得
	conversations, err := uc.convRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list conversations: %w", err)
	}

	return conversations, nil
}

// GetConversationMessages は会話のメッセージ履歴を取得
func (uc *ChatUsecase) GetConversationMessages(
	ctx context.Context,
	userID, conversationID uuid.UUID,
	limit int,
) ([]*conversation.Message, error) {
	// 会話を取得してユーザー確認
	conv, err := uc.convRepo.FindByID(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to find conversation: %w", err)
	}

	if conv.UserID != userID {
		return nil, fmt.Errorf("unauthorized: user does not own this conversation")
	}

	// メッセージを取得
	messages, err := uc.msgRepo.FindByConversationID(ctx, conversationID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}

	// 時系列順に並べ替え（古い順）
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}
