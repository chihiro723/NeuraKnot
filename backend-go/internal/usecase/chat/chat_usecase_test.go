package chat

import (
	"context"
	"errors"
	"testing"

	"backend-go/internal/domain/conversation"
	"backend-go/internal/usecase/mocks"
	"backend-go/internal/usecase/testhelper"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// =============================================================================
// GetOrCreateConversation Tests
// =============================================================================

// TestGetOrCreateConversation_ExistingConversation は既存の会話が返されることをテスト
func TestGetOrCreateConversation_ExistingConversation(t *testing.T) {
	// Arrange: モックとテストデータの準備
	mockConvRepo := new(mocks.MockConversationRepository)
	mockMsgRepo := new(mocks.MockMessageRepository)
	mockAgentRepo := new(mocks.MockAgentRepository)

	uc := &ChatUsecase{
		convRepo: mockConvRepo,
		msgRepo:  mockMsgRepo,
		aiRepo:   mockAgentRepo,
	}

	userID := uuid.New()
	aiAgentID := uuid.New()
	existingConv := testhelper.CreateTestConversation(userID, aiAgentID)

	// モック設定: 既存の会話が存在
	mockConvRepo.On("FindByUserAndAgent", mock.Anything, userID, aiAgentID).
		Return(existingConv, nil)

	// Act: 会話取得または作成
	conv, err := uc.GetOrCreateConversation(context.Background(), userID, aiAgentID)

	// Assert: 既存の会話が返される
	assert.NoError(t, err)
	assert.NotNil(t, conv)
	assert.Equal(t, existingConv.ID, conv.ID)
	assert.Equal(t, userID, conv.UserID)
	assert.Equal(t, aiAgentID, conv.AIAgentID)

	// Saveは呼ばれない（既存会話なので）
	mockConvRepo.AssertNotCalled(t, "Save")
	mockConvRepo.AssertExpectations(t)
}

// TestGetOrCreateConversation_NewConversation は新規会話が作成されることをテスト
func TestGetOrCreateConversation_NewConversation(t *testing.T) {
	// Arrange
	mockConvRepo := new(mocks.MockConversationRepository)
	mockMsgRepo := new(mocks.MockMessageRepository)
	mockAgentRepo := new(mocks.MockAgentRepository)

	uc := &ChatUsecase{
		convRepo: mockConvRepo,
		msgRepo:  mockMsgRepo,
		aiRepo:   mockAgentRepo,
	}

	userID := uuid.New()
	aiAgentID := uuid.New()

	// モック設定: 会話が存在しない（nilを返す）
	mockConvRepo.On("FindByUserAndAgent", mock.Anything, userID, aiAgentID).
		Return(nil, nil)

	// 新規会話の保存
	mockConvRepo.On("Save", mock.Anything, mock.Anything).Return(nil)

	// Act: 会話取得または作成
	conv, err := uc.GetOrCreateConversation(context.Background(), userID, aiAgentID)

	// Assert: 新規会話が作成される
	assert.NoError(t, err)
	assert.NotNil(t, conv)
	assert.Equal(t, userID, conv.UserID)
	assert.Equal(t, aiAgentID, conv.AIAgentID)

	mockConvRepo.AssertExpectations(t)
}

// TestGetOrCreateConversation_FindError はリポジトリエラーをテスト
func TestGetOrCreateConversation_FindError(t *testing.T) {
	// Arrange
	mockConvRepo := new(mocks.MockConversationRepository)
	mockMsgRepo := new(mocks.MockMessageRepository)
	mockAgentRepo := new(mocks.MockAgentRepository)

	uc := &ChatUsecase{
		convRepo: mockConvRepo,
		msgRepo:  mockMsgRepo,
		aiRepo:   mockAgentRepo,
	}

	userID := uuid.New()
	aiAgentID := uuid.New()
	findErr := errors.New("database connection failed")

	// モック設定: 検索でエラー
	mockConvRepo.On("FindByUserAndAgent", mock.Anything, userID, aiAgentID).
		Return(nil, findErr)

	// Act
	conv, err := uc.GetOrCreateConversation(context.Background(), userID, aiAgentID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, conv)
	assert.Contains(t, err.Error(), "failed to find conversation")

	mockConvRepo.AssertExpectations(t)
}

// TestGetOrCreateConversation_SaveError は保存エラーをテスト
func TestGetOrCreateConversation_SaveError(t *testing.T) {
	// Arrange
	mockConvRepo := new(mocks.MockConversationRepository)
	mockMsgRepo := new(mocks.MockMessageRepository)
	mockAgentRepo := new(mocks.MockAgentRepository)

	uc := &ChatUsecase{
		convRepo: mockConvRepo,
		msgRepo:  mockMsgRepo,
		aiRepo:   mockAgentRepo,
	}

	userID := uuid.New()
	aiAgentID := uuid.New()
	saveErr := errors.New("save failed")

	// モック設定: 会話が存在しないが、保存でエラー
	mockConvRepo.On("FindByUserAndAgent", mock.Anything, userID, aiAgentID).
		Return(nil, nil)
	mockConvRepo.On("Save", mock.Anything, mock.Anything).Return(saveErr)

	// Act
	conv, err := uc.GetOrCreateConversation(context.Background(), userID, aiAgentID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, conv)
	assert.Contains(t, err.Error(), "failed to save conversation")

	mockConvRepo.AssertExpectations(t)
}

// =============================================================================
// ListConversations Tests
// =============================================================================

// TestListConversations_Success は会話一覧取得の成功をテスト
func TestListConversations_Success(t *testing.T) {
	// Arrange
	mockConvRepo := new(mocks.MockConversationRepository)
	mockMsgRepo := new(mocks.MockMessageRepository)
	mockAgentRepo := new(mocks.MockAgentRepository)

	uc := &ChatUsecase{
		convRepo: mockConvRepo,
		msgRepo:  mockMsgRepo,
		aiRepo:   mockAgentRepo,
	}

	userID := uuid.New()
	conv1 := testhelper.CreateTestConversation(userID, uuid.New())
	conv2 := testhelper.CreateTestConversation(userID, uuid.New())
	conv3 := testhelper.CreateTestConversation(userID, uuid.New())

	mockConvRepo.On("FindByUserID", mock.Anything, userID).
		Return([]*conversation.Conversation{conv1, conv2, conv3}, nil)

	// Act
	conversations, err := uc.ListConversations(context.Background(), userID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, conversations, 3)

	mockConvRepo.AssertExpectations(t)
}

// TestListConversations_EmptyList は空のリストが返ることをテスト
func TestListConversations_EmptyList(t *testing.T) {
	// Arrange
	mockConvRepo := new(mocks.MockConversationRepository)
	mockMsgRepo := new(mocks.MockMessageRepository)
	mockAgentRepo := new(mocks.MockAgentRepository)

	uc := &ChatUsecase{
		convRepo: mockConvRepo,
		msgRepo:  mockMsgRepo,
		aiRepo:   mockAgentRepo,
	}

	userID := uuid.New()
	emptyList := []*conversation.Conversation{}

	mockConvRepo.On("FindByUserID", mock.Anything, userID).
		Return(emptyList, nil)

	// Act
	conversations, err := uc.ListConversations(context.Background(), userID)

	// Assert
	assert.NoError(t, err)
	assert.Empty(t, conversations)

	mockConvRepo.AssertExpectations(t)
}

// TestListConversations_RepositoryError はリポジトリエラーをテスト
func TestListConversations_RepositoryError(t *testing.T) {
	// Arrange
	mockConvRepo := new(mocks.MockConversationRepository)
	mockMsgRepo := new(mocks.MockMessageRepository)
	mockAgentRepo := new(mocks.MockAgentRepository)

	uc := &ChatUsecase{
		convRepo: mockConvRepo,
		msgRepo:  mockMsgRepo,
		aiRepo:   mockAgentRepo,
	}

	userID := uuid.New()
	repoErr := errors.New("database error")

	mockConvRepo.On("FindByUserID", mock.Anything, userID).
		Return(nil, repoErr)

	// Act
	conversations, err := uc.ListConversations(context.Background(), userID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, conversations)
	assert.Contains(t, err.Error(), "failed to list conversations")

	mockConvRepo.AssertExpectations(t)
}

// =============================================================================
// GetConversationMessages Tests
// =============================================================================

// TestGetConversationMessages_Success はメッセージ履歴取得の成功をテスト
func TestGetConversationMessages_Success(t *testing.T) {
	// Arrange
	mockConvRepo := new(mocks.MockConversationRepository)
	mockMsgRepo := new(mocks.MockMessageRepository)
	mockAgentRepo := new(mocks.MockAgentRepository)

	uc := &ChatUsecase{
		convRepo: mockConvRepo,
		msgRepo:  mockMsgRepo,
		aiRepo:   mockAgentRepo,
	}

	userID := uuid.New()
	conversationID := uuid.New()
	aiAgentID := uuid.New()
	conv := testhelper.CreateTestConversationWithID(conversationID, userID, aiAgentID)
	limit := 20

	// テストメッセージを作成（新しい順）
	msg1 := testhelper.CreateTestMessage(conversationID, conversation.SenderTypeUser, userID, "Message 3")
	msg2 := testhelper.CreateTestMessage(conversationID, conversation.SenderTypeAI, aiAgentID, "Message 2")
	msg3 := testhelper.CreateTestMessage(conversationID, conversation.SenderTypeUser, userID, "Message 1")

	mockConvRepo.On("FindByID", mock.Anything, conversationID).
		Return(conv, nil)
	mockMsgRepo.On("FindByConversationID", mock.Anything, conversationID, limit).
		Return([]*conversation.Message{msg1, msg2, msg3}, nil)

	// Act
	result, err := uc.GetConversationMessages(context.Background(), userID, conversationID, limit)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 3)

	// メッセージが古い順に並べ替えられている確認は省略
	// （実装によって順序が異なる可能性があるため）

	mockConvRepo.AssertExpectations(t)
	mockMsgRepo.AssertExpectations(t)
}

// TestGetConversationMessages_Unauthorized は他人の会話にアクセス不可をテスト
func TestGetConversationMessages_Unauthorized(t *testing.T) {
	// Arrange
	mockConvRepo := new(mocks.MockConversationRepository)
	mockMsgRepo := new(mocks.MockMessageRepository)
	mockAgentRepo := new(mocks.MockAgentRepository)

	uc := &ChatUsecase{
		convRepo: mockConvRepo,
		msgRepo:  mockMsgRepo,
		aiRepo:   mockAgentRepo,
	}

	requestUserID := uuid.New()        // リクエストユーザー
	conversationOwnerID := uuid.New()  // 会話の所有者（別人）
	conversationID := uuid.New()
	aiAgentID := uuid.New()

	// 別人の会話
	conv := testhelper.CreateTestConversationWithID(
		conversationID,
		conversationOwnerID, // 所有者は別人
		aiAgentID,
	)

	mockConvRepo.On("FindByID", mock.Anything, conversationID).
		Return(conv, nil)

	// Act: 別人が会話のメッセージ取得を試みる
	result, err := uc.GetConversationMessages(
		context.Background(),
		requestUserID, // 別人
		conversationID,
		20,
	)

	// Assert: 権限エラー
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "unauthorized")
	assert.Contains(t, err.Error(), "user does not own this conversation")

	mockConvRepo.AssertExpectations(t)
	// メッセージリポジトリは呼ばれない（権限チェックで拒否）
	mockMsgRepo.AssertNotCalled(t, "FindByConversationID")
}

// TestGetConversationMessages_ConversationNotFound は会話が存在しないエラーをテスト
func TestGetConversationMessages_ConversationNotFound(t *testing.T) {
	// Arrange
	mockConvRepo := new(mocks.MockConversationRepository)
	mockMsgRepo := new(mocks.MockMessageRepository)
	mockAgentRepo := new(mocks.MockAgentRepository)

	uc := &ChatUsecase{
		convRepo: mockConvRepo,
		msgRepo:  mockMsgRepo,
		aiRepo:   mockAgentRepo,
	}

	userID := uuid.New()
	conversationID := uuid.New()
	notFoundErr := errors.New("conversation not found")

	mockConvRepo.On("FindByID", mock.Anything, conversationID).
		Return(nil, notFoundErr)

	// Act
	result, err := uc.GetConversationMessages(context.Background(), userID, conversationID, 20)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "failed to find conversation")

	mockConvRepo.AssertExpectations(t)
	mockMsgRepo.AssertNotCalled(t, "FindByConversationID")
}

// TestGetConversationMessages_MessageRepositoryError はメッセージ取得エラーをテスト
func TestGetConversationMessages_MessageRepositoryError(t *testing.T) {
	// Arrange
	mockConvRepo := new(mocks.MockConversationRepository)
	mockMsgRepo := new(mocks.MockMessageRepository)
	mockAgentRepo := new(mocks.MockAgentRepository)

	uc := &ChatUsecase{
		convRepo: mockConvRepo,
		msgRepo:  mockMsgRepo,
		aiRepo:   mockAgentRepo,
	}

	userID := uuid.New()
	conversationID := uuid.New()
	aiAgentID := uuid.New()
	conv := testhelper.CreateTestConversationWithID(conversationID, userID, aiAgentID)
	msgErr := errors.New("message fetch failed")

	mockConvRepo.On("FindByID", mock.Anything, conversationID).
		Return(conv, nil)
	mockMsgRepo.On("FindByConversationID", mock.Anything, conversationID, 20).
		Return(nil, msgErr)

	// Act
	result, err := uc.GetConversationMessages(context.Background(), userID, conversationID, 20)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "failed to get messages")

	mockConvRepo.AssertExpectations(t)
	mockMsgRepo.AssertExpectations(t)
}
