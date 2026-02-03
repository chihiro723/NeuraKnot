package testhelper

import (
	"time"

	"backend-go/internal/domain/ai"
	"backend-go/internal/domain/conversation"
	"backend-go/internal/domain/user"

	"github.com/google/uuid"
)

// CreateTestUser テスト用のユーザーを作成
func CreateTestUser() *user.User {
	userID, _ := user.NewUserID("test-user-123")
	email, _ := user.NewEmail("test@example.com")
	u, _ := user.NewUser(userID, "cognito-123", email, "Test User")
	return u
}

// CreateTestUserWithID 指定したIDでテスト用のユーザーを作成
func CreateTestUserWithID(userIDStr string) *user.User {
	userID, _ := user.NewUserID(userIDStr)
	email, _ := user.NewEmail(userIDStr + "@example.com")
	u, _ := user.NewUser(userID, "cognito-"+userIDStr, email, "Test User")
	return u
}

// CreateTestAgent テスト用のAgentを作成
func CreateTestAgent(name string) *ai.Agent {
	userID := uuid.New()
	agent, _ := ai.NewAgent(userID, name, ai.PersonaAssistant, ai.ProviderOpenAI, "gpt-4o")
	agent.ID = uuid.New()
	return agent
}

// CreateTestAgentWithOptions オプション付きでテスト用のAgentを作成
func CreateTestAgentWithOptions(opts AgentOptions) *ai.Agent {
	agent, _ := ai.NewAgent(opts.UserID, opts.Name, opts.PersonaType, opts.Provider, opts.Model)
	agent.ID = opts.ID
	if opts.Description != "" {
		agent.SetDescription(opts.Description)
	}
	if opts.AvatarURL != "" {
		agent.AvatarURL = &opts.AvatarURL
	}
	return agent
}

// AgentOptions テスト用Agent作成のオプション
type AgentOptions struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	Name        string
	Provider    ai.Provider
	Model       string
	PersonaType ai.PersonaType
	Description string
	AvatarURL   string
}

// CreateTestConversation テスト用の会話を作成
func CreateTestConversation(userID, aiAgentID uuid.UUID) *conversation.Conversation {
	conv, _ := conversation.NewConversation(userID, aiAgentID)
	return conv
}

// CreateTestConversationWithID 指定したIDでテスト用の会話を作成
func CreateTestConversationWithID(id, userID, aiAgentID uuid.UUID) *conversation.Conversation {
	conv, _ := conversation.NewConversation(userID, aiAgentID)
	conv.ID = id
	return conv
}

// CreateTestMessage テスト用のメッセージを作成
func CreateTestMessage(conversationID uuid.UUID, senderType conversation.SenderType, senderID uuid.UUID, content string) *conversation.Message {
	msg, _ := conversation.NewMessage(conversationID, senderType, senderID, content)
	return msg
}

// CreateTestMessageWithID 指定したIDでテスト用のメッセージを作成
func CreateTestMessageWithID(id, conversationID uuid.UUID, senderType conversation.SenderType, senderID uuid.UUID, content string) *conversation.Message {
	msg, _ := conversation.NewMessage(conversationID, senderType, senderID, content)
	msg.ID = id
	msg.CreatedAt = time.Now()
	return msg
}
