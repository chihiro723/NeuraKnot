package mocks

import (
	"context"

	"backend-go/internal/domain/conversation"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

// MockConversationRepository はconversation.ConversationRepositoryのモック
type MockConversationRepository struct {
	mock.Mock
}

// Save は会話を保存
func (m *MockConversationRepository) Save(ctx context.Context, conv *conversation.Conversation) error {
	args := m.Called(ctx, conv)
	return args.Error(0)
}

// FindByID はIDで会話を取得
func (m *MockConversationRepository) FindByID(ctx context.Context, id uuid.UUID) (*conversation.Conversation, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*conversation.Conversation), args.Error(1)
}

// FindByUserID はユーザーIDで会話一覧を取得
func (m *MockConversationRepository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*conversation.Conversation, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*conversation.Conversation), args.Error(1)
}

// FindByUserAndAgent はユーザーIDとAgentIDで会話を取得
func (m *MockConversationRepository) FindByUserAndAgent(ctx context.Context, userID, aiAgentID uuid.UUID) (*conversation.Conversation, error) {
	args := m.Called(ctx, userID, aiAgentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*conversation.Conversation), args.Error(1)
}

// Update は会話を更新
func (m *MockConversationRepository) Update(ctx context.Context, conv *conversation.Conversation) error {
	args := m.Called(ctx, conv)
	return args.Error(0)
}

// Delete は会話を削除
func (m *MockConversationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}
