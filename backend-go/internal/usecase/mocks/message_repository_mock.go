package mocks

import (
	"context"

	"backend-go/internal/domain/conversation"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

// MockMessageRepository はconversation.MessageRepositoryのモック
type MockMessageRepository struct {
	mock.Mock
}

// Save はメッセージを保存
func (m *MockMessageRepository) Save(ctx context.Context, message *conversation.Message) error {
	args := m.Called(ctx, message)
	return args.Error(0)
}

// FindByID はIDでメッセージを取得
func (m *MockMessageRepository) FindByID(ctx context.Context, id uuid.UUID) (*conversation.Message, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*conversation.Message), args.Error(1)
}

// FindByConversationID は会話IDでメッセージ一覧を取得
func (m *MockMessageRepository) FindByConversationID(ctx context.Context, conversationID uuid.UUID, limit int) ([]*conversation.Message, error) {
	args := m.Called(ctx, conversationID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*conversation.Message), args.Error(1)
}

// Update はメッセージを更新
func (m *MockMessageRepository) Update(ctx context.Context, message *conversation.Message) error {
	args := m.Called(ctx, message)
	return args.Error(0)
}

// Delete はメッセージを削除
func (m *MockMessageRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}
