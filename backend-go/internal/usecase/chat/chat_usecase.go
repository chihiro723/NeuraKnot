package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"backend-go/internal/domain/ai"
	"backend-go/internal/domain/conversation"
	"backend-go/internal/domain/service"
	"backend-go/internal/infrastructure/external"

	"github.com/google/uuid"
)

// ChatUsecase はチャットのユースケース
type ChatUsecase struct {
	aiRepo             ai.Repository
	convRepo           conversation.ConversationRepository
	msgRepo            conversation.MessageRepository
	toolUsageRepo      conversation.ToolUsageRepository
	chatSessionRepo    conversation.ChatSessionRepository
	aiAgentServiceRepo service.AIAgentServiceRepository
	serviceConfigRepo  service.ServiceConfigRepository
	aiClient           *external.AIClient
}

// NewChatUsecase はチャットユースケースを作成
func NewChatUsecase(
	aiRepo ai.Repository,
	convRepo conversation.ConversationRepository,
	msgRepo conversation.MessageRepository,
	toolUsageRepo conversation.ToolUsageRepository,
	chatSessionRepo conversation.ChatSessionRepository,
	aiAgentServiceRepo service.AIAgentServiceRepository,
	serviceConfigRepo service.ServiceConfigRepository,
	aiClient *external.AIClient,
) *ChatUsecase {
	return &ChatUsecase{
		aiRepo:             aiRepo,
		convRepo:           convRepo,
		msgRepo:            msgRepo,
		toolUsageRepo:      toolUsageRepo,
		chatSessionRepo:    chatSessionRepo,
		aiAgentServiceRepo: aiAgentServiceRepo,
		serviceConfigRepo:  serviceConfigRepo,
		aiClient:           aiClient,
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

// GetConversationWithAgent は会話とAI Agentを取得
func (uc *ChatUsecase) GetConversationWithAgent(
	ctx context.Context,
	userID, conversationID uuid.UUID,
) (*conversation.Conversation, *ai.Agent, error) {
	// 会話を取得
	conv, err := uc.convRepo.FindByID(ctx, conversationID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to find conversation: %w", err)
	}

	// ユーザーが会話の所有者か確認
	if conv.UserID != userID {
		return nil, nil, fmt.Errorf("unauthorized: user does not own this conversation")
	}

	// AI Agentを取得
	agent, err := uc.aiRepo.FindByID(ctx, conv.AIAgentID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get AI agent: %w", err)
	}

	return conv, agent, nil
}

// SendMessage はメッセージを送信してAI応答を取得
func (uc *ChatUsecase) SendMessage(
	ctx context.Context,
	userID, conversationID uuid.UUID,
	messageContent string,
) (*ChatResult, error) {
	var err error

	// 1. 会話を取得
	var conv *conversation.Conversation
	conv, err = uc.convRepo.FindByID(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to find conversation: %w", err)
	}

	// ユーザーが会話の所有者か確認
	if conv.UserID != userID {
		return nil, fmt.Errorf("unauthorized: user does not own this conversation")
	}

	// 2. ユーザーメッセージを保存
	var userMessage *conversation.Message
	userMessage, err = conversation.NewMessage(
		conversationID,
		conversation.SenderTypeUser,
		userID,
		messageContent,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create user message: %w", err)
	}

	if err = uc.msgRepo.Save(ctx, userMessage); err != nil {
		return nil, fmt.Errorf("failed to save user message: %w", err)
	}

	// 3. 会話履歴を取得（過去20件）
	var messages []*conversation.Message
	messages, err = uc.msgRepo.FindByConversationID(ctx, conversationID, 20)
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
	var agent *ai.Agent
	agent, err = uc.aiRepo.FindByID(ctx, conv.AIAgentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI agent: %w", err)
	}

	// 5. エージェントに紐付けられたサービス情報を取得
	var services []external.ServiceConfig
	if uc.aiAgentServiceRepo != nil {
		var agentServices []service.AIAgentService
		agentServices, err = uc.aiAgentServiceRepo.FindByAgentID(conv.AIAgentID)
		if err == nil && len(agentServices) > 0 {
			services = make([]external.ServiceConfig, 0, len(agentServices))
			for _, as := range agentServices {
				if as.Enabled {
					// ユーザーのサービス設定を取得して認証情報を含める
					var serviceConfig *service.ServiceConfig
					serviceConfig, _, _, _, _, err = uc.serviceConfigRepo.FindByUserAndClass(userID, as.ServiceClass)
					if err == nil && serviceConfig != nil {
						services = append(services, external.ServiceConfig{
							ServiceClass:      as.ServiceClass,
							ToolSelectionMode: as.ToolSelectionMode,
							SelectedTools:     as.SelectedTools,
							Auth:              serviceConfig.Auth, // Auth全体を送る（bot_token, api_key等、サービスごとに異なる）
							Headers:           nil,                // 必要に応じて設定
						})
					}
				}
			}
		}
	}

	// 6. Backend-pythonにリクエスト
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
		Services: services,
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

	// 8. ChatSessionを保存（トークン使用量を記録）
	chatSession := conversation.NewChatSession(
		userID,
		conversationID,
		conv.AIAgentID,
		&aiMessage.ID,
		agent.Provider.String(),
		agent.Model,
		agent.PersonaType.String(),
		agent.Temperature,
		aiResp.Metadata.TokensUsed.Prompt,
		aiResp.Metadata.TokensUsed.Completion,
		aiResp.Metadata.TokensUsed.Total,
		aiResp.Metadata.ProcessingTimeMs,
		len(aiResp.ToolCalls),
	)

	if err := uc.chatSessionRepo.Save(ctx, chatSession); err != nil {
		// ChatSession保存失敗してもユーザーへのレスポンスは正常に返す（ログに記録）
		log.Printf("ERROR: Failed to save chat session: %v", err)
	}

	// 9. ツール使用履歴を保存
	for _, toolCall := range aiResp.ToolCalls {
		inputJSON, err := json.Marshal(toolCall.Input)
		if err != nil {
			log.Printf("ERROR: Failed to marshal tool input: %v", err)
			continue
		}

		toolUsage, err := conversation.NewToolUsage(
			aiMessage.ID,
			toolCall.ToolName,
			"basic",
			inputJSON,
		)
		if err != nil {
			log.Printf("ERROR: Failed to create tool usage: %v", err)
			continue
		}

		// 出力、実行時間を設定（insert_positionはクライアント側で設定）
		if toolCall.Output != "" {
			toolUsage.SetOutput(toolCall.Output)
		}
		if toolCall.ExecutionTimeMs > 0 {
			toolUsage.SetExecutionTime(toolCall.ExecutionTimeMs)
		}
		// insert_positionはクライアント側で後から設定するため、ここでは設定しない
		// if toolCall.InsertPosition != nil {
		// 	toolUsage.SetInsertPosition(*toolCall.InsertPosition)
		// }
		if toolCall.Error != nil {
			toolUsage.SetError(*toolCall.Error)
		}

		// DBに保存
		if err := uc.toolUsageRepo.Save(toolUsage); err != nil {
			log.Printf("ERROR: Failed to save tool usage: %v", err)
		}
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

// MessageWithTools はメッセージとツール使用履歴のペア
type MessageWithTools struct {
	Message    *conversation.Message
	ToolUsages []*conversation.ToolUsage
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

// GetConversationMessagesWithTools は会話のメッセージ履歴をツール使用履歴付きで取得
func (uc *ChatUsecase) GetConversationMessagesWithTools(
	ctx context.Context,
	userID, conversationID uuid.UUID,
	limit int,
) ([]*MessageWithTools, error) {
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

	// 各メッセージのツール使用履歴を取得
	result := make([]*MessageWithTools, len(messages))
	for i, msg := range messages {
		toolUsages, err := uc.toolUsageRepo.FindByMessageID(msg.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get tool usages for message %s: %w", msg.ID, err)
		}

		result[i] = &MessageWithTools{
			Message:    msg,
			ToolUsages: toolUsages,
		}
	}

	return result, nil
}

// SendMessageStream はストリーミングでメッセージを送信
func (uc *ChatUsecase) SendMessageStream(
	ctx context.Context,
	userID, conversationID uuid.UUID,
	messageContent string,
) (<-chan external.StreamEvent, <-chan error, error) {
	var err error

	// 1. 会話を取得
	var conv *conversation.Conversation
	conv, err = uc.convRepo.FindByID(ctx, conversationID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to find conversation: %w", err)
	}

	// ユーザーが会話の所有者か確認
	if conv.UserID != userID {
		return nil, nil, fmt.Errorf("unauthorized: user does not own this conversation")
	}

	// 2. ユーザーメッセージを保存
	var userMessage *conversation.Message
	userMessage, err = conversation.NewMessage(
		conversationID,
		conversation.SenderTypeUser,
		userID,
		messageContent,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create user message: %w", err)
	}

	if err = uc.msgRepo.Save(ctx, userMessage); err != nil {
		return nil, nil, fmt.Errorf("failed to save user message: %w", err)
	}

	// 2.5. ユーザーメッセージ保存時に会話の last_message_at を更新
	conv.IncrementMessageCount()
	if err = uc.convRepo.Update(ctx, conv); err != nil {
		log.Printf("ERROR: Failed to update conversation after user message: %v", err)
		// エラーがあっても続行（ベストエフォート）
	}

	// 3. 会話履歴を取得（過去20件）
	var messages []*conversation.Message
	messages, err = uc.msgRepo.FindByConversationID(ctx, conversationID, 20)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get conversation history: %w", err)
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
	var agent *ai.Agent
	agent, err = uc.aiRepo.FindByID(ctx, conv.AIAgentID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get AI agent: %w", err)
	}

	// 5. エージェントに紐付けられたサービス情報を取得
	var services []external.ServiceConfig
	if uc.aiAgentServiceRepo != nil {
		var agentServices []service.AIAgentService
		agentServices, err = uc.aiAgentServiceRepo.FindByAgentID(conv.AIAgentID)
		if err == nil && len(agentServices) > 0 {
			services = make([]external.ServiceConfig, 0, len(agentServices))
			for _, as := range agentServices {
				if as.Enabled {
					// ユーザーのサービス設定を取得して認証情報を含める
					var serviceConfig *service.ServiceConfig
					serviceConfig, _, _, _, _, err = uc.serviceConfigRepo.FindByUserAndClass(userID, as.ServiceClass)
					if err == nil && serviceConfig != nil {
						services = append(services, external.ServiceConfig{
							ServiceClass:      as.ServiceClass,
							ToolSelectionMode: as.ToolSelectionMode,
							SelectedTools:     as.SelectedTools,
							Auth:              serviceConfig.Auth, // Auth全体を送る（bot_token, api_key等、サービスごとに異なる）
							Headers:           nil,                // 必要に応じて設定
						})
					}
				}
			}
		}
	}

	// 6. Backend-pythonにストリーミングリクエスト
	systemPrompt := agent.GetSystemPrompt()
	aiReq := external.ChatRequest{
		UserID:              userID.String(),
		ConversationID:      conversationID.String(),
		Message:             messageContent,
		ConversationHistory: history[:len(history)-1], // 最新のユーザーメッセージを除く
		AgentConfig: external.AgentConfig{
			Provider:           agent.Provider.String(),
			Model:              agent.Model,
			Temperature:        agent.Temperature,
			MaxTokens:          agent.MaxTokens,
			Persona:            agent.PersonaType.String(),
			CustomSystemPrompt: &systemPrompt,
		},
		Services: services,
	}

	eventChan, errChan := uc.aiClient.ChatStream(ctx, aiReq)

	// 6. イベントを中継しながらDB保存処理を行う
	relayEventChan := make(chan external.StreamEvent, 100)
	go uc.relayAndHandleStream(ctx, eventChan, relayEventChan, userID, conversationID, conv.AIAgentID, userMessage.ID, agent)

	return relayEventChan, errChan, nil
}

// relayAndHandleStream はイベントを中継しながらDB保存処理を行う
func (uc *ChatUsecase) relayAndHandleStream(
	ctx context.Context,
	eventChan <-chan external.StreamEvent,
	relayEventChan chan<- external.StreamEvent,
	userID, conversationID, agentID, userMessageID uuid.UUID,
	agent *ai.Agent,
) {
	defer close(relayEventChan)

	var fullContent string
	var toolUsages map[string]*conversation.ToolUsage = make(map[string]*conversation.ToolUsage)

	// AIメッセージを先に作成（ストリーミング開始時）
	aiMessage, err := conversation.NewMessageForStreaming(
		conversationID,
		conversation.SenderTypeAI,
		agentID,
	)
	if err != nil {
		log.Printf("ERROR: Failed to create AI message: %v", err)
		return
	}

	// AIメッセージをDBに保存
	if err := uc.msgRepo.Save(ctx, aiMessage); err != nil {
		log.Printf("ERROR: Failed to save initial AI message: %v", err)
		return
	}

	// イベントを中継しながらバッファリング
	for event := range eventChan {
		// イベントを中継
		relayEventChan <- event

		switch event.Type {
		case "token":
			fullContent += event.Content
		case "tool_start":
			// ツール使用開始: メモリ上でToolUsageオブジェクトを作成（DB保存はtool_endで）
			inputJSON := []byte("{}")
			if event.Input != "" {
				// Pythonスタイルのシングルクォートをダブルクォートに変換
				inputStr := strings.ReplaceAll(event.Input, "'", "\"")
				inputJSON = []byte(inputStr)
			}

			toolUsage, err := conversation.NewToolUsage(
				aiMessage.ID, // AIメッセージIDを使用
				event.ToolName,
				"basic",
				inputJSON,
			)
			if err == nil {
				// 挿入位置を設定
				if event.InsertPosition != nil {
					toolUsage.SetInsertPosition(*event.InsertPosition)
				}
				toolUsages[event.ToolID] = toolUsage
			}
		case "tool_end":
			// ツール使用完了: 出力と実行時間を設定してDBに保存（1回だけ）
			if toolUsage, exists := toolUsages[event.ToolID]; exists {
				// 出力データを設定
				if event.Output != "" {
					toolUsage.SetOutput(event.Output)
				} else {
					log.Printf("WARN: tool_end event has empty output for tool %s", event.ToolID)
				}

				// エラーがあれば設定
				if event.Error != nil && *event.Error != "" {
					toolUsage.SetError(*event.Error)
				}

				// 実行時間を設定
				if event.ExecutionTimeMs > 0 {
					toolUsage.SetExecutionTime(event.ExecutionTimeMs)
				}

				// DBに保存（1回だけ）
				err := uc.toolUsageRepo.Save(toolUsage)
				if err != nil {
					log.Printf("ERROR: Failed to save tool usage: %v", err)
				}
			}
		case "done", "error":
			// 完了時にAI応答の内容を更新
			if fullContent != "" {
				// AIメッセージの内容を更新
				aiMessage.Content = fullContent
				if err := uc.msgRepo.Update(ctx, aiMessage); err != nil {
					log.Printf("ERROR: Failed to update AI message content: %v", err)
				}

				// 会話とAgentの統計を更新
				conv, err := uc.convRepo.FindByID(ctx, conversationID)
				if err == nil {
					conv.IncrementMessageCount()
					conv.IncrementMessageCount()
					if updateErr := uc.convRepo.Update(ctx, conv); updateErr != nil {
						fmt.Printf("Warning: failed to update conversation: %v\n", updateErr)
					}
				}

				agent.IncrementMessageCount()
				if updateErr := uc.aiRepo.Update(ctx, agent); updateErr != nil {
					fmt.Printf("Warning: failed to update agent: %v\n", updateErr)
				}

				// ChatSessionを保存（doneイベントにメタデータが含まれる場合）
				if event.Metadata != nil {
					chatSession := conversation.NewChatSession(
						userID,
						conversationID,
						agentID,
						&aiMessage.ID,
						agent.Provider.String(),
						agent.Model,
						agent.PersonaType.String(),
						agent.Temperature,
						event.Metadata.TokensUsed.Prompt,
						event.Metadata.TokensUsed.Completion,
						event.Metadata.TokensUsed.Total,
						event.Metadata.ProcessingTimeMs,
						len(event.ToolCalls),
					)

					if err := uc.chatSessionRepo.Save(ctx, chatSession); err != nil {
						log.Printf("ERROR: Failed to save chat session: %v", err)
					}
				} else {
					log.Printf("WARN: Done event received without metadata")
				}
			}
			return
		}
	}
}

// UpdateToolPositions はツール使用履歴の挿入位置を一括更新
func (uc *ChatUsecase) UpdateToolPositions(
	ctx context.Context,
	userID, conversationID, messageID uuid.UUID,
	positions map[string]int,
) error {
	// 1. 会話の所有者確認
	conv, err := uc.convRepo.FindByID(ctx, conversationID)
	if err != nil {
		return fmt.Errorf("failed to find conversation: %w", err)
	}

	if conv.UserID != userID {
		return fmt.Errorf("unauthorized: user does not own this conversation")
	}

	// 2. メッセージの存在確認
	message, err := uc.msgRepo.FindByID(ctx, messageID)
	if err != nil {
		return fmt.Errorf("failed to find message: %w", err)
	}

	if message.ConversationID != conversationID {
		return fmt.Errorf("message does not belong to this conversation")
	}

	// 3. ツール使用履歴の挿入位置を更新
	for toolUsageIDStr, position := range positions {
		toolUsageID, err := uuid.Parse(toolUsageIDStr)
		if err != nil {
			log.Printf("WARN: Invalid tool usage ID: %s", toolUsageIDStr)
			continue
		}

		if err := uc.toolUsageRepo.UpdateInsertPosition(toolUsageID, position); err != nil {
			log.Printf("ERROR: Failed to update insert position for tool %s: %v", toolUsageID, err)
			// エラーがあっても続行（ベストエフォート）
		}
	}

	return nil
}

// SendAgentIntroduction はAIエージェントが自己紹介メッセージを送信
// messageContentはサービス・ツール情報などのヒント（AI生成のプロンプトに使用）
func (uc *ChatUsecase) SendAgentIntroduction(
	ctx context.Context,
	userID, conversationID uuid.UUID,
	messageContent string,
) (*ChatResult, error) {
	var err error

	// 1. 会話を取得
	var conv *conversation.Conversation
	conv, err = uc.convRepo.FindByID(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to find conversation: %w", err)
	}

	// ユーザーが会話の所有者か確認
	if conv.UserID != userID {
		return nil, fmt.Errorf("unauthorized: user does not own this conversation")
	}

	// 2. エージェントを取得
	var agent *ai.Agent
	agent, err = uc.aiRepo.FindByID(ctx, conv.AIAgentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI agent: %w", err)
	}

	// 3. エージェントのサービス設定を取得
	var services []external.ServiceConfig
	if uc.aiAgentServiceRepo != nil {
		var agentServices []service.AIAgentService
		agentServices, err = uc.aiAgentServiceRepo.FindByAgentID(conv.AIAgentID)
		if err == nil && len(agentServices) > 0 {
			services = make([]external.ServiceConfig, 0, len(agentServices))
			for _, as := range agentServices {
				if as.Enabled {
					// ユーザーのサービス設定を取得して認証情報を含める
					var serviceConfig *service.ServiceConfig
					serviceConfig, _, _, _, _, err = uc.serviceConfigRepo.FindByUserAndClass(userID, as.ServiceClass)
					if err == nil && serviceConfig != nil {
						services = append(services, external.ServiceConfig{
							ServiceClass:      as.ServiceClass,
							ToolSelectionMode: as.ToolSelectionMode,
							SelectedTools:     as.SelectedTools,
							Auth:              serviceConfig.Auth, // Auth全体を送る（bot_token, api_key等、サービスごとに異なる）
							Headers:           nil,                // 必要に応じて設定
						})
					}
				}
			}
		}
	}

	// 4. 自己紹介を促すプロンプトを作成
	introPrompt := fmt.Sprintf(
		"あなたは今、新しくユーザーと友達になりました。簡潔に自己紹介をしてください。\n"+
			"あなたの名前は「%s」です。\n"+
			"%s\n"+
			"ユーザーに対して温かく、自然な挨拶をしてください。200文字以内で簡潔にお願いします。",
		agent.Name,
		messageContent,
	)

	// 5. AIクライアントでエージェントのペルソナを反映した自己紹介を生成
	systemPrompt := agent.GetSystemPrompt()
	aiReq := external.ChatRequest{
		UserID:              userID.String(),
		ConversationID:      conversationID.String(),
		Message:             introPrompt,
		ConversationHistory: []external.ConversationMessage{}, // 会話履歴なし
		AgentConfig: external.AgentConfig{
			Provider:           agent.Provider.String(),
			Model:              agent.Model,
			Temperature:        agent.Temperature,
			MaxTokens:          agent.MaxTokens,
			Persona:            agent.PersonaType.String(),
			CustomSystemPrompt: &systemPrompt,
		},
		Services: services,
	}

	aiResp, err := uc.aiClient.Chat(ctx, aiReq)
	if err != nil {
		return nil, fmt.Errorf("failed to generate AI introduction: %w", err)
	}

	// 6. AIメッセージを保存
	aiMessage, err := conversation.NewMessage(
		conversationID,
		conversation.SenderTypeAI,
		conv.AIAgentID,
		aiResp.Message,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create AI message: %w", err)
	}

	if err := uc.msgRepo.Save(ctx, aiMessage); err != nil {
		return nil, fmt.Errorf("failed to save AI message: %w", err)
	}

	// 7. 会話とAgentの統計を更新
	conv.IncrementMessageCount()
	if err := uc.convRepo.Update(ctx, conv); err != nil {
		return nil, fmt.Errorf("failed to update conversation: %w", err)
	}

	agent.IncrementMessageCount()
	if err := uc.aiRepo.Update(ctx, agent); err != nil {
		return nil, fmt.Errorf("failed to update agent: %w", err)
	}

	// 8. ChatSessionを保存（トークン使用量を記録）
	chatSession := conversation.NewChatSession(
		userID,
		conversationID,
		conv.AIAgentID,
		&aiMessage.ID,
		agent.Provider.String(),
		agent.Model,
		agent.PersonaType.String(),
		agent.Temperature,
		aiResp.Metadata.TokensUsed.Prompt,
		aiResp.Metadata.TokensUsed.Completion,
		aiResp.Metadata.TokensUsed.Total,
		aiResp.Metadata.ProcessingTimeMs,
		len(aiResp.ToolCalls),
	)

	if err := uc.chatSessionRepo.Save(ctx, chatSession); err != nil {
		// ChatSession保存失敗してもユーザーへのレスポンスは正常に返す（ログに記録）
		log.Printf("ERROR: Failed to save chat session for introduction: %v", err)
	}

	// 9. ツール使用履歴を保存（もしツールが使われていた場合）
	for _, toolCall := range aiResp.ToolCalls {
		// ToolCallのInputをJSON化
		inputJSON, err := json.Marshal(toolCall.Input)
		if err != nil {
			log.Printf("ERROR: Failed to marshal tool input for introduction: %v", err)
			continue
		}

		toolUsage, err := conversation.NewToolUsage(
			aiMessage.ID,
			toolCall.ToolName,
			"service", // ツールカテゴリ（サービスツール）
			inputJSON,
		)
		if err != nil {
			log.Printf("ERROR: Failed to create tool usage for introduction: %v", err)
			continue
		}

		// 出力データを設定
		toolUsage.SetOutput(toolCall.Output)

		// 実行時間を設定
		if toolCall.ExecutionTimeMs > 0 {
			toolUsage.SetExecutionTime(toolCall.ExecutionTimeMs)
		}

		// 挿入位置を設定
		if toolCall.InsertPosition != nil {
			toolUsage.SetInsertPosition(*toolCall.InsertPosition)
		}

		if err := uc.toolUsageRepo.Save(toolUsage); err != nil {
			log.Printf("ERROR: Failed to save tool usage for introduction: %v", err)
		}
	}

	return &ChatResult{
		UserMessage: nil, // ユーザーメッセージはなし
		AIMessage:   aiMessage,
		Metadata:    aiResp.Metadata,
	}, nil
}
