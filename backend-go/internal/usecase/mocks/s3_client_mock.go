package mocks

import (
	"context"

	"github.com/stretchr/testify/mock"
)

// MockS3Client はS3Clientのモック
type MockS3Client struct {
	mock.Mock
}

// DeleteAvatar はアバターを削除
func (m *MockS3Client) DeleteAvatar(ctx context.Context, avatarURL string) error {
	args := m.Called(ctx, avatarURL)
	return args.Error(0)
}
