package mocks

import (
	"context"

	"backend-go/internal/domain/ai"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

// MockAgentRepository はai.Repositoryのモック
type MockAgentRepository struct {
	mock.Mock
}

// Save はAgentを保存
func (m *MockAgentRepository) Save(ctx context.Context, agent *ai.Agent) error {
	args := m.Called(ctx, agent)
	return args.Error(0)
}

// FindByID はIDでAgentを取得
func (m *MockAgentRepository) FindByID(ctx context.Context, id uuid.UUID) (*ai.Agent, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*ai.Agent), args.Error(1)
}

// FindByUserID はユーザーIDでAgent一覧を取得
func (m *MockAgentRepository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*ai.Agent, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*ai.Agent), args.Error(1)
}

// Update はAgentを更新
func (m *MockAgentRepository) Update(ctx context.Context, agent *ai.Agent) error {
	args := m.Called(ctx, agent)
	return args.Error(0)
}

// Delete はAgentを削除
func (m *MockAgentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}
