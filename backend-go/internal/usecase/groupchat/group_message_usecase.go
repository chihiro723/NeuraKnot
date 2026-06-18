package groupchat

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"backend-go/internal/domain/ai"
	"backend-go/internal/domain/conversation"
	"backend-go/internal/domain/groupchat"
	"backend-go/internal/domain/service"
	"backend-go/internal/infrastructure/external"
	"backend-go/internal/usecase/usage"

	"github.com/google/uuid"
)

// sanitizeName は名前を英数字・アンダースコア・ハイフンのみに変換
// OpenAI APIの name フィールド要件: ^[a-zA-Z0-9_-]{1,64}$
//
// ロジック:
// 1. 名前から英数字・アンダースコア・ハイフンを抽出（スペースはアンダースコアに変換）
// 2. 抽出結果が空の場合（日本語のみ等）、元の名前のMD5ハッシュからIDを生成
// 3. 64文字を超える場合は切り詰め
func sanitizeName(name string) string {
	if name == "" {
		return "unknown"
	}

	// 英数字とアンダースコア、ハイフンのみを抽出
	var result strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') || r == '_' || r == '-' {
			result.WriteRune(r)
		} else if r == ' ' {
			result.WriteRune('_')
		}
	}

	sanitized := result.String()

	// 抽出結果が空の場合、ハッシュベースのIDを生成
	if sanitized == "" {
		hash := md5.Sum([]byte(name))
		sanitized = fmt.Sprintf("user_%x", hash[:4])
	}

	// 最大64文字に制限
	if len(sanitized) > 64 {
		sanitized = sanitized[:64]
	}

	return sanitized
}

// GroupMessageUsecase はグループメッセージのユースケース
type GroupMessageUsecase struct {
	groupChatRepo      groupchat.GroupChatRepository
	memberRepo         groupchat.GroupMemberRepository
	messageRepo        groupchat.GroupMessageRepository
	mentionRepo        groupchat.MessageMentionRepository
	usageRecorder      *usage.Recorder
	toolUsageRepo      conversation.ToolUsageRepository
	aiRepo             ai.Repository
	aiAgentServiceRepo service.AIAgentServiceRepository
	serviceConfigRepo  service.ServiceConfigRepository
	aiClient           *external.AIClient
}

// NewGroupMessageUsecase はグループメッセージユースケースを作成
func NewGroupMessageUsecase(
	groupChatRepo groupchat.GroupChatRepository,
	memberRepo groupchat.GroupMemberRepository,
	messageRepo groupchat.GroupMessageRepository,
	mentionRepo groupchat.MessageMentionRepository,
	usageRecorder *usage.Recorder,
	toolUsageRepo conversation.ToolUsageRepository,
	aiRepo ai.Repository,
	aiAgentServiceRepo service.AIAgentServiceRepository,
	serviceConfigRepo service.ServiceConfigRepository,
	aiClient *external.AIClient,
) *GroupMessageUsecase {
	return &GroupMessageUsecase{
		groupChatRepo:      groupChatRepo,
		memberRepo:         memberRepo,
		messageRepo:        messageRepo,
		mentionRepo:        mentionRepo,
		usageRecorder:      usageRecorder,
		toolUsageRepo:      toolUsageRepo,
		aiRepo:             aiRepo,
		aiAgentServiceRepo: aiAgentServiceRepo,
		serviceConfigRepo:  serviceConfigRepo,
		aiClient:           aiClient,
	}
}

// MentionInput はメンション入力
type MentionInput struct {
	AIAgentID uuid.UUID
	Order     int
}

// SendMessageStreamInput はメッセージ送信の入力
type SendMessageStreamInput struct {
	UserID      uuid.UUID
	GroupChatID uuid.UUID
	Content     string
	Mentions    interface{} // "all" or []MentionInput
}

// StreamEvent はSSEイベント
type StreamEvent struct {
	Event string
	Data  interface{}
}

// SendMessageStream はメッセージを送信してストリーミング応答を取得
func (uc *GroupMessageUsecase) SendMessageStream(
	ctx context.Context,
	input SendMessageStreamInput,
	eventChan chan<- StreamEvent,
) error {
	defer close(eventChan)

	// 1. グループチャットを取得
	gc, err := uc.groupChatRepo.FindByID(ctx, input.GroupChatID)
	if err != nil {
		return fmt.Errorf("failed to find group chat: %w", err)
	}

	// ユーザーが所有者か確認
	if gc.UserID != input.UserID {
		return errors.New("unauthorized: user does not own this group chat")
	}

	// 2. メンバーを取得
	members, err := uc.memberRepo.FindByGroupChatID(ctx, input.GroupChatID)
	if err != nil {
		return fmt.Errorf("failed to find members: %w", err)
	}

	// 3. ユーザーメッセージを保存
	userMessage, err := groupchat.NewUserMessage(input.GroupChatID, input.UserID, input.Content)
	if err != nil {
		return fmt.Errorf("failed to create user message: %w", err)
	}

	if err := uc.messageRepo.Save(ctx, userMessage); err != nil {
		return fmt.Errorf("failed to save user message: %w", err)
	}

	// メッセージをDBから再取得してSenderNameを含める
	userMessage, err = uc.messageRepo.FindByID(ctx, userMessage.ID)
	if err != nil {
		return fmt.Errorf("failed to reload user message with sender info: %w", err)
	}

	// 4. メンションリストを構築（メッセージIDを使用）
	var mentions []*groupchat.MessageMention
	switch v := input.Mentions.(type) {
	case string:
		if v == "all" {
			// @all の場合、全メンバーを展開
			for i, member := range members {
				mention, err := groupchat.NewMessageMention(userMessage.ID, member.AIAgentID, i+1)
				if err != nil {
					return fmt.Errorf("failed to create mention: %w", err)
				}
				mention.AIAgentName = member.AIAgentName
				mention.AIAgentIcon = member.AIAgentIcon
				mention.AIAgentModel = member.AIAgentModel
				mentions = append(mentions, mention)
			}
		} else {
			return errors.New("invalid mentions value")
		}
	case []MentionInput:
		// 個別メンション
		for _, mi := range v {
			// メンバーに存在するか確認
			found := false
			for _, member := range members {
				if member.AIAgentID == mi.AIAgentID {
					mention, err := groupchat.NewMessageMention(userMessage.ID, mi.AIAgentID, mi.Order)
					if err != nil {
						return fmt.Errorf("failed to create mention: %w", err)
					}
					mention.AIAgentName = member.AIAgentName
					mention.AIAgentIcon = member.AIAgentIcon
					mention.AIAgentModel = member.AIAgentModel
					mentions = append(mentions, mention)
					found = true
					break
				}
			}
			if !found {
				return fmt.Errorf("AI agent %s is not a member of this group chat", mi.AIAgentID)
			}
		}
	default:
		return errors.New("invalid mentions type")
	}

	if len(mentions) == 0 {
		return errors.New("at least one mention is required")
	}

	// 5. メンションを保存
	for _, mention := range mentions {
		if err := uc.mentionRepo.Save(ctx, mention); err != nil {
			return fmt.Errorf("failed to save mention: %w", err)
		}
	}

	// 6. ユーザーメッセージ保存イベント送信
	eventChan <- StreamEvent{
		Event: "user_message_saved",
		Data: map[string]interface{}{
			"message_id": userMessage.ID,
			"content":    userMessage.Content,
			"created_at": userMessage.CreatedAt,
		},
	}

	// 7. メンションキューイベント送信
	mentionQueue := make([]map[string]interface{}, 0, len(mentions))
	for _, mention := range mentions {
		mentionQueue = append(mentionQueue, map[string]interface{}{
			"agent_id":   mention.AIAgentID,
			"agent_name": mention.AIAgentName,
			"agent_icon": mention.AIAgentIcon,
			"order":      mention.MentionOrder,
			"status":     mention.Status,
		})
	}
	eventChan <- StreamEvent{
		Event: "mention_queue",
		Data:  map[string]interface{}{"mentions": mentionQueue},
	}

	// 8. 各メンションを順番に処理（直列処理）
	for _, mention := range mentions {
		// キャンセルチェック
		select {
		case <-ctx.Done():
			// キャンセル処理
			if err := uc.mentionRepo.CancelPendingMentions(ctx, userMessage.ID); err != nil {
				log.Printf("failed to cancel pending mentions: %v", err)
			}
			return ctx.Err()
		default:
		}

		// メンション処理
		if err := uc.processMention(ctx, userMessage, mention, eventChan); err != nil {
			log.Printf("failed to process mention: %v", err)
			// エラーを記録して次のメンションに進む
			mention.Fail(err.Error())
			if err := uc.mentionRepo.Update(ctx, mention); err != nil {
				log.Printf("failed to update mention: %v", err)
			}
			continue
		}
	}

	// 9. 全完了イベント送信
	userMessage.UpdateProcessingStatus(groupchat.ProcessingStatusCompleted)
	if err := uc.messageRepo.Update(ctx, userMessage); err != nil {
		log.Printf("failed to update user message status: %v", err)
	}

	eventChan <- StreamEvent{
		Event: "all_complete",
		Data: map[string]interface{}{
			"user_message_id": userMessage.ID,
		},
	}

	return nil
}

// processMention はメンションを処理
func (uc *GroupMessageUsecase) processMention(
	ctx context.Context,
	userMessage *groupchat.GroupMessage,
	mention *groupchat.MessageMention,
	eventChan chan<- StreamEvent,
) error {
	// 1. 処理開始
	mention.StartProcessing()
	if err := uc.mentionRepo.Update(ctx, mention); err != nil {
		return fmt.Errorf("failed to update mention status: %w", err)
	}

	// 2. agent_preparing イベント送信
	log.Printf("[GROUP_CHAT_STREAM] Sending agent_preparing event: agent_id=%s, agent_name=%s",
		mention.AIAgentID, mention.AIAgentName)
	eventChan <- StreamEvent{
		Event: "agent_preparing",
		Data: map[string]interface{}{
			"agent_id":   mention.AIAgentID,
			"agent_name": mention.AIAgentName,
			"agent_icon": mention.AIAgentIcon,
			"order":      mention.MentionOrder,
		},
	}
	log.Printf("[GROUP_CHAT_STREAM] agent_preparing event sent successfully")

	// 3. 会話履歴を取得（このメッセージより前 + 同一メッセージ内の完了したAI応答）
	log.Printf("Getting history before message: id=%s, content='%s', created_at=%s",
		userMessage.ID, userMessage.Content, userMessage.CreatedAt)

	history, err := uc.messageRepo.FindHistoryBeforeMessage(ctx, userMessage.GroupChatID, userMessage.ID)
	if err != nil {
		return fmt.Errorf("failed to get conversation history: %w", err)
	}

	log.Printf("Retrieved %d history messages", len(history))

	// 同一メッセージ内の既に完了したAI応答を追加（現在のメンションより前のもののみ）
	completedMentions, err := uc.mentionRepo.FindByMessageID(ctx, userMessage.ID)
	if err != nil {
		return fmt.Errorf("failed to get mentions: %w", err)
	}

	log.Printf("Processing: %s (order=%d/%d)", mention.AIAgentName, mention.MentionOrder, len(completedMentions))
	log.Printf("  Current message ID: %s", userMessage.ID)

	addedToHistory := 0
	for _, m := range completedMentions {
		log.Printf("  Checking mention: agent=%s, order=%d, completed=%v, hasResponseID=%v, mentionOrder<%d=%v",
			m.AIAgentName, m.MentionOrder, m.IsCompleted(), m.ResponseMessageID != nil,
			mention.MentionOrder, m.MentionOrder < mention.MentionOrder)

		// 現在のメンションより前のもののみを追加（自分より後のメンションは見えない）
		if m.IsCompleted() && m.ResponseMessageID != nil && m.MentionOrder < mention.MentionOrder {
			responseMsg, err := uc.messageRepo.FindByID(ctx, *m.ResponseMessageID)
			if err == nil {
				log.Printf("  ✓ Adding to history: agent=%s, responseID=%s, content='%s'",
					m.AIAgentName, *m.ResponseMessageID, responseMsg.Content)
				history = append(history, responseMsg)
				addedToHistory++
			} else {
				log.Printf("  ✗ Failed to get response message: %v", err)
			}
		}
	}
	log.Printf("Added %d same-message responses to history (total history: %d)", addedToHistory, len(history))

	// 4. AIエージェントを取得
	agent, err := uc.aiRepo.FindByID(ctx, mention.AIAgentID)
	if err != nil {
		return fmt.Errorf("failed to find AI agent: %w", err)
	}

	// 5. AIサービス設定を取得（ツール連携）
	aiAgentServices, err := uc.aiAgentServiceRepo.FindByAgentID(agent.ID)
	if err != nil {
		return fmt.Errorf("failed to get AI agent services: %w", err)
	}

	log.Printf("===== Agent %s: Service Configuration =====", mention.AIAgentName)
	log.Printf("Found %d agent services", len(aiAgentServices))
	for i, as := range aiAgentServices {
		log.Printf("  [%d] ServiceClass=%s, Enabled=%v, ToolSelectionMode=%s, SelectedTools=%v",
			i, as.ServiceClass, as.Enabled, as.ToolSelectionMode, as.SelectedTools)
	}

	// グループチャットのユーザーIDを取得（認証情報取得に必要）
	gc, err := uc.groupChatRepo.FindByID(ctx, userMessage.GroupChatID)
	if err != nil {
		return fmt.Errorf("failed to get group chat: %w", err)
	}
	userID := gc.UserID

	// サービス設定を構築（1対1チャットと同様に認証情報を含める）
	var serviceConfigs []external.ServiceConfig
	for _, as := range aiAgentServices {
		if as.Enabled {
			// ユーザーのサービス設定を取得して認証情報を含める
			serviceConfig, _, _, _, _, err := uc.serviceConfigRepo.FindByUserAndClass(userID, as.ServiceClass)
			if err == nil && serviceConfig != nil {
				serviceConfigs = append(serviceConfigs, external.ServiceConfig{
					ServiceClass:      as.ServiceClass,
					ToolSelectionMode: as.ToolSelectionMode,
					SelectedTools:     as.SelectedTools,
					Auth:              serviceConfig.Auth, // Auth全体を送る（bot_token, api_key等、サービスごとに異なる）
					Headers:           nil,                // 必要に応じて設定
				})
				log.Printf("  ✓ Added service config: %s (has auth: %v)", as.ServiceClass, len(serviceConfig.Auth) > 0)
			} else {
				log.Printf("  ✗ Failed to get user service config for %s: %v", as.ServiceClass, err)
			}
		}
	}
	log.Printf("Total service configs to send: %d", len(serviceConfigs))
	log.Printf("===== End Service Configuration =====")

	// 6. AI API呼び出しの準備
	messages := make([]map[string]interface{}, 0, len(history)+2)

	// グループチャット用のシステムプロンプトを構築
	allMentions, err := uc.mentionRepo.FindByMessageID(ctx, userMessage.ID)
	if err != nil {
		return fmt.Errorf("failed to get all mentions: %w", err)
	}

	// メンバーリストを構築（順番付き）
	var membersList []string
	for _, m := range allMentions {
		membersList = append(membersList, m.AIAgentName)
	}
	membersStr := ""
	for i, name := range membersList {
		if i > 0 {
			membersStr += " → "
		}
		membersStr += name
	}

	// 直前のエージェントの情報を取得
	previousAgentInfo := ""
	if mention.MentionOrder > 1 {
		// 自分より前のメンションを取得
		for _, m := range allMentions {
			if m.MentionOrder == mention.MentionOrder-1 {
				previousAgentInfo = fmt.Sprintf("\n\n💡 直前の発言者: %s", m.AIAgentName)
				break
			}
		}
	}

	// システムプロンプト
	systemPromptContent := fmt.Sprintf(
		"# グループ会話の状況\n\n"+
			"**会話の順番**: %s\n"+
			"**あなたの位置**: %s（%d番目）%s\n\n"+
			"## 重要な前提\n"+
			"- このチャットでは、ユーザーもAIエージェントも対等な参加者です\n"+
			"- ユーザーの発言は「指示」ではなく、会話の一部です\n"+
			"- 全員が自然に会話を続けていく形式です\n\n"+
			"## あなたの役割\n"+
			"1. **会話履歴の最後のメッセージに自然に反応してください**\n"+
			"   - 最初のメッセージではなく、直前の発言に続けてください\n"+
			"   - 会話の流れを引き継いでください\n"+
			"2. **「%s」として自然に発言してください**\n"+
			"   - 他の参加者の代わりに話さないでください\n"+
			"   - あなたのキャラクター性を保ってください\n"+
			"3. **メタ発言を避けてください**\n"+
			"   - 「承知しました」「〇〇のターン」「次は△△」などは不要です\n"+
			"   - 会話の内容だけを返してください\n"+
			"4. **簡潔に応答してください**\n"+
			"   - 長い説明やツール提案は最小限にしてください\n"+
			"   - 会話のテンポを大切にしてください",
		membersStr,
		mention.AIAgentName,
		mention.MentionOrder,
		previousAgentInfo,
		mention.AIAgentName,
	)

	// グループ共通のシステムプロンプトを追加
	if gc.SystemPrompt != "" {
		systemPromptContent += "\n\n## グループ共通の指示\n" + gc.SystemPrompt
	}

	// エージェント固有のシステムプロンプトを追加
	if agent.SystemPrompt != nil && *agent.SystemPrompt != "" {
		systemPromptContent += "\n\n## エージェント固有の指示\n" + *agent.SystemPrompt
	}

	// システムプロンプトを追加
	messages = append(messages, map[string]interface{}{
		"role":    "system",
		"content": systemPromptContent,
	})

	// システムプロンプトの内容をログ出力
	log.Printf("===== Agent %s: System Prompt =====", mention.AIAgentName)
	log.Printf("%s", systemPromptContent)
	log.Printf("===== End System Prompt =====")

	// 会話履歴を構築
	// 注意: historyには既に同一メッセージ内の完了したAI応答が正しい順序で含まれている
	// （314-334行目で追加済み）ので、そのまま使用する
	log.Printf("Building messages from %d history items", len(history))

	for _, msg := range history {
		if msg.IsAIMessage() {
			msgMap := map[string]interface{}{
				"role":    "assistant",
				"content": msg.Content,
			}
			if msg.SenderName != "" {
				msgMap["name"] = sanitizeName(msg.SenderName)
			}
			messages = append(messages, msgMap)
		} else {
			msgMap := map[string]interface{}{
				"role":    "user",
				"content": msg.Content,
			}
			if msg.SenderName != "" {
				msgMap["name"] = sanitizeName(msg.SenderName)
			}
			messages = append(messages, msgMap)
		}
	}

	// デバッグ: messagesの内容を出力
	log.Printf("===== Agent %s: Messages for Go-side prompt =====", mention.AIAgentName)
	for i, msg := range messages {
		role := msg["role"]
		content := fmt.Sprintf("%v", msg["content"])
		if i == 0 && len(content) > 200 {
				content = content[:200] + "..."
		} else if len(content) > 100 {
			content = content[:100] + "..."
			}
		nameStr := "nil"
		if name, ok := msg["name"]; ok {
			nameStr = fmt.Sprintf("%v", name)
		}
		log.Printf("  [%d] role=%s, name=%s, content=%s", i, role, nameStr, content)
	}
	log.Printf("===== End Messages =====")

	// 7. agent_start イベント送信
	log.Printf("[GROUP_CHAT_STREAM] Sending agent_start event: agent_id=%s, agent_name=%s",
		mention.AIAgentID, mention.AIAgentName)
	eventChan <- StreamEvent{
		Event: "agent_start",
		Data: map[string]interface{}{
			"agent_id":   mention.AIAgentID,
			"agent_name": mention.AIAgentName,
			"agent_icon": mention.AIAgentIcon,
		},
	}

	// 8. AI APIストリーミング呼び出し
	// 会話履歴を変換（nameフィールドを使用）
	// 注意: historyには既に同一メッセージ内の完了したAI応答が正しい順序で含まれている
	// （314-334行目で追加済み）ので、そのまま使用する
	var conversationHistory []external.ConversationMessage

	log.Printf("Building conversationHistory from %d history messages", len(history))
	for _, msg := range history {
		convMsg := external.ConversationMessage{
			Role:    "",
			Content: msg.Content,
			Name:    nil,
		}

		if msg.IsAIMessage() {
			convMsg.Role = "assistant"
			if msg.SenderName != "" {
				sanitized := sanitizeName(msg.SenderName)
				convMsg.Name = &sanitized
			}
		} else {
			convMsg.Role = "user"
			if msg.SenderName != "" {
				sanitized := sanitizeName(msg.SenderName)
				convMsg.Name = &sanitized
			}
		}

		conversationHistory = append(conversationHistory, convMsg)
	}

	// 現在のユーザーメッセージを追加（LLMが何に対して応答すべきかを明確にする）
	currentUserMsg := external.ConversationMessage{
		Role:    "user",
		Content: userMessage.Content,
		Name:    nil,
	}
	if userMessage.SenderName != "" {
		sanitized := sanitizeName(userMessage.SenderName)
		currentUserMsg.Name = &sanitized
	}
	conversationHistory = append(conversationHistory, currentUserMsg)

	// 会話履歴を最新の20件に制限（1対1チャットと同じ）
	// 長すぎる履歴はLLMが古いパターンを参照する原因になる
	maxHistorySize := 20
	if len(conversationHistory) > maxHistorySize {
		log.Printf("⚠️ Trimming conversation history from %d to %d messages", len(conversationHistory), maxHistorySize)
		conversationHistory = conversationHistory[len(conversationHistory)-maxHistorySize:]
	}

	// デバッグ: conversationHistoryの内容を出力
	log.Printf("===== Agent %s: ConversationHistory for Python API =====", mention.AIAgentName)
	for i, msg := range conversationHistory {
		nameStr := "nil"
		if msg.Name != nil {
			nameStr = *msg.Name
		}
		content := msg.Content
		if len(content) > 100 {
			content = content[:100] + "..."
		}
		log.Printf("  [%d] role=%s, name=%s, content=%s", i, msg.Role, nameStr, content)
	}
	log.Printf("===== End ConversationHistory =====")

	// エージェントのシステムプロンプト（Persona + CustomSystemPrompt）を取得
	agentSystemPrompt := agent.GetSystemPrompt()

	// Messageフィールドの構築
	// 1番目のエージェント: ユーザーメッセージに直接応答
	// 2番目以降: 直前のエージェントの発言に続けて応答
	messagePrompt := "会話履歴を踏まえて、あなたのターンで応答してください。"
	if mention.MentionOrder > 1 {
		// 直前のエージェントの名前を取得
		var previousAgentName string
		for _, m := range allMentions {
			if m.MentionOrder == mention.MentionOrder-1 {
				previousAgentName = m.AIAgentName
				break
			}
		}
		if previousAgentName != "" {
			messagePrompt = fmt.Sprintf("会話履歴の最後にある「%s」の発言に続けて、あなたのターンで応答してください。", previousAgentName)
		}
	}

	log.Printf("===== Agent %s: Message Field =====", mention.AIAgentName)
	log.Printf("%s", messagePrompt)
	log.Printf("===== End Message Field =====")

	streamReq := external.ChatRequest{
		UserID:              gc.UserID.String(),
		ConversationID:      userMessage.GroupChatID.String(),
		Message:             messagePrompt,
		ConversationHistory: conversationHistory,
		AgentConfig: external.AgentConfig{
			Provider:           string(agent.Provider),
			Model:              agent.Model,
			Temperature:        agent.Temperature,
			MaxTokens:          agent.MaxTokens,
			Persona:            agent.PersonaType.String(),
			CustomSystemPrompt: &agentSystemPrompt,
		},
		Services: serviceConfigs,
	}

	eventStream, errStream := uc.aiClient.ChatStream(ctx, streamReq)

	var fullResponse strings.Builder
	var metadata external.AIMetadata
	var streamToolCalls []external.ToolCall
	toolUsages := make(map[string]*conversation.ToolUsage) // ツール使用を一時保存

	// 9. ストリーミング応答を処理
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case event, ok := <-eventStream:
			if !ok {
				// ストリームが閉じられた
				goto streamDone
			}

			// テキストチャンク
			if event.Content != "" {
				fullResponse.WriteString(event.Content)
				eventChan <- StreamEvent{
					Event: "agent_chunk",
					Data: map[string]interface{}{
						"agent_id":   mention.AIAgentID,
						"agent_name": mention.AIAgentName,
						"agent_icon": mention.AIAgentIcon,
						"content":    event.Content,
						"is_delta":   true,
					},
				}
			}

			// ツール使用開始
			if event.Type == "tool_start" {
				log.Printf("[GROUP_CHAT_STREAM] Sending tool_start event: agent_id=%s, tool_id=%s, tool_name=%s",
					mention.AIAgentID, event.ToolID, event.ToolName)
				// tool_startイベントをフロントエンドに送信
					eventChan <- StreamEvent{
					Event: "tool_start",
						Data: map[string]interface{}{
							"agent_id":  mention.AIAgentID,
						"tool_id":   event.ToolID,
						"tool_name": event.ToolName,
						"input":     event.Input,
					},
				}
				log.Printf("[GROUP_CHAT_STREAM] tool_start event sent successfully")

				// ツール使用オブジェクトをメモリ上に作成（まだDB保存しない）
				inputJSON := []byte("{}")
				if event.Input != "" {
					inputStr := strings.ReplaceAll(event.Input, "'", "\"")
					inputJSON = []byte(inputStr)
				}

				// 一時的にmessage_idをnilで作成（後でAIメッセージIDに更新）
				toolUsage := &conversation.ToolUsage{
					ID:           uuid.New(),
					ToolName:     event.ToolName,
					ToolCategory: "basic",
					InputData:    inputJSON,
					Status:       "completed",
					ExecutedAt:   time.Now(),
				}

				if event.InsertPosition != nil {
					toolUsage.SetInsertPosition(*event.InsertPosition)
				}

				toolUsages[event.ToolID] = toolUsage
			}

			// ツール使用完了
			if event.Type == "tool_end" {
				log.Printf("[GROUP_CHAT_STREAM] Sending tool_end event: agent_id=%s, tool_id=%s",
					mention.AIAgentID, event.ToolID)
				// tool_endイベントをフロントエンドに送信
				eventChan <- StreamEvent{
					Event: "tool_end",
					Data: map[string]interface{}{
						"agent_id":          mention.AIAgentID,
						"tool_id":           event.ToolID,
						"status":            "completed",
						"output":            event.Output,
						"execution_time_ms": event.ExecutionTimeMs,
					},
				}
				log.Printf("[GROUP_CHAT_STREAM] tool_end event sent successfully")

				// ツール使用オブジェクトに出力と実行時間を設定
				if toolUsage, exists := toolUsages[event.ToolID]; exists {
					if event.Output != "" {
						toolUsage.SetOutput(event.Output)
					}
					if event.Error != nil && *event.Error != "" {
						toolUsage.SetError(*event.Error)
					}
					if event.ExecutionTimeMs > 0 {
						toolUsage.SetExecutionTime(event.ExecutionTimeMs)
					}

					// Inputをmap[string]interface{}に変換
					var inputMap map[string]interface{}
					if event.Input != "" {
						inputStr := strings.ReplaceAll(event.Input, "'", "\"")
						json.Unmarshal([]byte(inputStr), &inputMap)
					}

					streamToolCalls = append(streamToolCalls, external.ToolCall{
						ToolID:          event.ToolID,
						ToolName:        event.ToolName,
						Input:           inputMap,
						Output:          event.Output,
						Error:           event.Error,
						ExecutionTimeMs: event.ExecutionTimeMs,
						Status:          "completed",
					})
				}
			}

			// メタデータ
			if event.Metadata != nil {
				metadata = *event.Metadata
			}

		case err := <-errStream:
			if err != nil {
				return fmt.Errorf("stream error: %w", err)
			}
		}
	}
streamDone:

	// 10. AI応答メッセージを保存
	responseContent := strings.TrimSpace(fullResponse.String())

	aiMessage, err := groupchat.NewAIMessage(
		userMessage.GroupChatID,
		mention.AIAgentID,
		responseContent,
		&userMessage.ID,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to create AI message: %w", err)
	}

	// SenderNameとSenderIconを設定
	aiMessage.SenderName = mention.AIAgentName
	aiMessage.SenderIcon = mention.AIAgentIcon

	if err := uc.messageRepo.Save(ctx, aiMessage); err != nil {
		return fmt.Errorf("failed to save AI message: %w", err)
	}

	// 11. ChatSessionを保存（トークン使用量等）
	if metadata.TokensUsed.Total > 0 {
		// グループチャットの場合、message_idはNIL（group_messagesテーブルを参照するため）
		chatSession := conversation.NewGroupChatSession(
			gc.UserID,
			userMessage.GroupChatID,
			mention.AIAgentID,
			nil, // message_id は NULL（グループチャット用）
			string(agent.Provider),
			agent.Model,
			agent.PersonaType.String(),
			agent.Temperature,
			metadata.TokensUsed.Prompt,
			metadata.TokensUsed.Completion,
			metadata.TokensUsed.Total,
			0, // processing_time_ms
			len(streamToolCalls),
		)

		if err := uc.usageRecorder.RecordSessionUsage(ctx, chatSession); err != nil {
			log.Printf("ERROR: failed to save chat session: %v", err)
		} else {
			log.Printf("SUCCESS: saved chat session (id=%s, tokens=%d)", chatSession.ID, chatSession.TokensTotal)
			aiMessage.AISessionID = &chatSession.ID
			if err := uc.messageRepo.Update(ctx, aiMessage); err != nil {
				log.Printf("failed to update AI message with session ID: %v", err)
			}
		}
	}

	// 12. ツール使用を保存（グループメッセージ用）
	// メモリ上に作成したツール使用オブジェクトにAIメッセージIDを設定して保存
	for _, toolUsage := range toolUsages {
		// グループメッセージIDを設定
		toolUsage.GroupMessageID = &aiMessage.ID

		// DBに保存
		if err := uc.toolUsageRepo.Save(toolUsage); err != nil {
			log.Printf("ERROR: failed to save tool usage: %v", err)
		} else {
			log.Printf("SUCCESS: saved tool usage (id=%s, tool=%s, group_message_id=%s)",
				toolUsage.ID, toolUsage.ToolName, aiMessage.ID)
		}
	}

	// 13. メンション完了
	mention.Complete(aiMessage.ID)
	if err := uc.mentionRepo.Update(ctx, mention); err != nil {
		return fmt.Errorf("failed to update mention: %w", err)
	}

	// 14. agent_complete イベント送信
	eventChan <- StreamEvent{
		Event: "agent_complete",
		Data: map[string]interface{}{
			"agent_id":   mention.AIAgentID,
			"agent_name": mention.AIAgentName,
			"agent_icon": mention.AIAgentIcon,
			"message_id": aiMessage.ID,
			"content":    aiMessage.Content,
			"metadata":   metadata,
		},
	}

	return nil
}

// GetMessages はメッセージ履歴を取得
func (uc *GroupMessageUsecase) GetMessages(
	ctx context.Context,
	userID, groupChatID uuid.UUID,
	limit int,
	before *uuid.UUID,
) ([]*groupchat.GroupMessage, error) {
	// グループチャットを取得
	gc, err := uc.groupChatRepo.FindByID(ctx, groupChatID)
	if err != nil {
		return nil, fmt.Errorf("failed to find group chat: %w", err)
	}

	// ユーザーが所有者か確認
	if gc.UserID != userID {
		return nil, errors.New("unauthorized: user does not own this group chat")
	}

	// メッセージを取得
	messages, err := uc.messageRepo.FindByGroupChatID(ctx, groupChatID, limit, before)
	if err != nil {
		return nil, fmt.Errorf("failed to find messages: %w", err)
	}

	return messages, nil
}

// CancelMessage はメッセージ処理をキャンセル
func (uc *GroupMessageUsecase) CancelMessage(
	ctx context.Context,
	userID, groupChatID, messageID uuid.UUID,
) error {
	// グループチャットを取得
	gc, err := uc.groupChatRepo.FindByID(ctx, groupChatID)
	if err != nil {
		return fmt.Errorf("failed to find group chat: %w", err)
	}

	// ユーザーが所有者か確認
	if gc.UserID != userID {
		return errors.New("unauthorized: user does not own this group chat")
	}

	// メッセージを取得
	message, err := uc.messageRepo.FindByID(ctx, messageID)
	if err != nil {
		return fmt.Errorf("failed to find message: %w", err)
	}

	// グループチャットのメッセージか確認
	if message.GroupChatID != groupChatID {
		return errors.New("message does not belong to this group chat")
	}

	// 未処理メンションをキャンセル
	if err := uc.mentionRepo.CancelPendingMentions(ctx, messageID); err != nil {
		return fmt.Errorf("failed to cancel mentions: %w", err)
	}

	// メッセージをキャンセル
	message.UpdateProcessingStatus(groupchat.ProcessingStatusCancelled)
	if err := uc.messageRepo.Update(ctx, message); err != nil {
		return fmt.Errorf("failed to update message: %w", err)
	}

	return nil
}

// ToJSON はStreamEventをJSON文字列に変換
func (e StreamEvent) ToJSON() string {
	data, err := json.Marshal(e.Data)
	if err != nil {
		log.Printf("failed to marshal event data: %v", err)
		return "{}"
	}
	return string(data)
}
