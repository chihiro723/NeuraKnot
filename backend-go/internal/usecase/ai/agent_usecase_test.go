package ai

import (
	"context"
	"errors"
	"testing"

	"backend-go/internal/domain/ai"
	"backend-go/internal/usecase/mocks"
	"backend-go/internal/usecase/testhelper"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// =============================================================================
// CreateAgent Tests
// =============================================================================

// TestCreateAgent_Success は正常なAgent作成をテスト
func TestCreateAgent_Success(t *testing.T) {
	// Arrange: モックとテストデータの準備
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	userID := uuid.New()
	name := "Test Agent"
	personaType := "assistant"
	provider := "openai"
	model := "gpt-4o"
	description := "Test Description"
	streamingEnabled := true

	// モックの期待値設定
	mockRepo.On("Save", mock.Anything, mock.MatchedBy(func(agent *ai.Agent) bool {
		return agent.Name == name &&
			agent.PersonaType == ai.PersonaAssistant &&
			agent.Provider == ai.ProviderOpenAI &&
			agent.Model == model
	})).Return(nil)

	// Act: Agent作成
	agent, err := uc.CreateAgent(
		context.Background(),
		userID,
		name,
		personaType,
		provider,
		model,
		&description,
		nil,
		nil,
		streamingEnabled,
	)

	// Assert: 検証
	assert.NoError(t, err)
	assert.NotNil(t, agent)
	assert.Equal(t, name, agent.Name)
	assert.Equal(t, ai.PersonaAssistant, agent.PersonaType)
	assert.Equal(t, ai.ProviderOpenAI, agent.Provider)
	assert.Equal(t, model, agent.Model)
	assert.NotNil(t, agent.Description)
	assert.Equal(t, description, *agent.Description)
	assert.Equal(t, streamingEnabled, agent.StreamingEnabled)
	mockRepo.AssertExpectations(t)
}

// TestCreateAgent_DefaultValues はデフォルト値が設定されることをテスト
func TestCreateAgent_DefaultValues(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	userID := uuid.New()
	name := "Test Agent"
	personaType := "assistant"

	mockRepo.On("Save", mock.Anything, mock.MatchedBy(func(agent *ai.Agent) bool {
		// デフォルト値の確認
		return agent.Provider == ai.ProviderOpenAI && // デフォルトProvider
			agent.Model == "gpt-4.1" // デフォルトModel
	})).Return(nil)

	// Act: ProviderとModelを空で作成
	agent, err := uc.CreateAgent(
		context.Background(),
		userID,
		name,
		personaType,
		"", // Provider空 → OpenAIがデフォルト
		"", // Model空 → gpt-4.1がデフォルト
		nil,
		nil,
		nil,
		false,
	)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, ai.ProviderOpenAI, agent.Provider)
	assert.Equal(t, "gpt-4.1", agent.Model)
	mockRepo.AssertExpectations(t)
}

// TestCreateAgent_InvalidPersonaType は無効なPersonaTypeでエラーになることをテスト
func TestCreateAgent_InvalidPersonaType(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	userID := uuid.New()

	// Act: 無効なPersonaType
	agent, err := uc.CreateAgent(
		context.Background(),
		userID,
		"Test Agent",
		"invalid-persona", // 無効な値
		"openai",
		"gpt-4o",
		nil,
		nil,
		nil,
		false,
	)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, agent)
	assert.Contains(t, err.Error(), "invalid persona type")
}

// TestCreateAgent_InvalidProvider は無効なProviderでエラーになることをテスト
func TestCreateAgent_InvalidProvider(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	userID := uuid.New()

	// Act: 無効なProvider
	agent, err := uc.CreateAgent(
		context.Background(),
		userID,
		"Test Agent",
		"assistant",
		"invalid-provider", // 無効な値
		"gpt-4o",
		nil,
		nil,
		nil,
		false,
	)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, agent)
	assert.Contains(t, err.Error(), "invalid provider")
}

// TestCreateAgent_RepositoryError はリポジトリエラーをテスト
func TestCreateAgent_RepositoryError(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	userID := uuid.New()
	repoErr := errors.New("database connection failed")

	mockRepo.On("Save", mock.Anything, mock.Anything).Return(repoErr)

	// Act
	agent, err := uc.CreateAgent(
		context.Background(),
		userID,
		"Test Agent",
		"assistant",
		"openai",
		"gpt-4o",
		nil,
		nil,
		nil,
		false,
	)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, agent)
	assert.Equal(t, repoErr, err)
	mockRepo.AssertExpectations(t)
}

// =============================================================================
// GetUserAgents Tests
// =============================================================================

// TestGetUserAgents_Success はAgent一覧取得の成功をテスト
func TestGetUserAgents_Success(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	userID := uuid.New()
	expectedAgents := []*ai.Agent{
		testhelper.CreateTestAgent("Agent 1"),
		testhelper.CreateTestAgent("Agent 2"),
		testhelper.CreateTestAgent("Agent 3"),
	}

	mockRepo.On("FindByUserID", mock.Anything, userID).Return(expectedAgents, nil)

	// Act
	agents, err := uc.GetUserAgents(context.Background(), userID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, agents, 3)
	assert.Equal(t, expectedAgents, agents)
	mockRepo.AssertExpectations(t)
}

// TestGetUserAgents_EmptyList は空のリストが返ることをテスト
func TestGetUserAgents_EmptyList(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	userID := uuid.New()
	emptyAgents := []*ai.Agent{}

	mockRepo.On("FindByUserID", mock.Anything, userID).Return(emptyAgents, nil)

	// Act
	agents, err := uc.GetUserAgents(context.Background(), userID)

	// Assert
	assert.NoError(t, err)
	assert.Empty(t, agents)
	mockRepo.AssertExpectations(t)
}

// TestGetUserAgents_RepositoryError はリポジトリエラーをテスト
func TestGetUserAgents_RepositoryError(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	userID := uuid.New()
	repoErr := errors.New("database error")

	mockRepo.On("FindByUserID", mock.Anything, userID).Return(nil, repoErr)

	// Act
	agents, err := uc.GetUserAgents(context.Background(), userID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, agents)
	assert.Equal(t, repoErr, err)
	mockRepo.AssertExpectations(t)
}

// =============================================================================
// GetAgentByID Tests
// =============================================================================

// TestGetAgentByID_Success はAgent取得の成功をテスト
func TestGetAgentByID_Success(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	agentID := uuid.New()
	expectedAgent := testhelper.CreateTestAgent("Test Agent")
	expectedAgent.ID = agentID

	mockRepo.On("FindByID", mock.Anything, agentID).Return(expectedAgent, nil)

	// Act
	agent, err := uc.GetAgentByID(context.Background(), agentID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, agent)
	assert.Equal(t, agentID, agent.ID)
	assert.Equal(t, expectedAgent.Name, agent.Name)
	mockRepo.AssertExpectations(t)
}

// TestGetAgentByID_NotFound は存在しないAgentでエラーになることをテスト
func TestGetAgentByID_NotFound(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	agentID := uuid.New()
	notFoundErr := errors.New("agent not found")

	mockRepo.On("FindByID", mock.Anything, agentID).Return(nil, notFoundErr)

	// Act
	agent, err := uc.GetAgentByID(context.Background(), agentID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, agent)
	assert.Equal(t, notFoundErr, err)
	mockRepo.AssertExpectations(t)
}

// =============================================================================
// DeleteAgent Tests
// =============================================================================

// TestDeleteAgent_WithoutAvatar はアバターなしAgent削除をテスト
func TestDeleteAgent_WithoutAvatar(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	agentID := uuid.New()
	agent := testhelper.CreateTestAgent("Test Agent")
	agent.ID = agentID
	agent.AvatarURL = nil // アバターなし

	mockRepo.On("FindByID", mock.Anything, agentID).Return(agent, nil)
	mockRepo.On("Delete", mock.Anything, agentID).Return(nil)

	// Act
	err := uc.DeleteAgent(context.Background(), agentID)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
	// S3Clientは呼ばれない
	mockS3.AssertNotCalled(t, "DeleteAvatar")
}

// TestDeleteAgent_WithAvatar はアバターありAgent削除をテスト
func TestDeleteAgent_WithAvatar(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	agentID := uuid.New()
	avatarURL := "https://example.com/avatar.jpg"
	agent := testhelper.CreateTestAgent("Test Agent")
	agent.ID = agentID
	agent.AvatarURL = &avatarURL // アバターあり

	mockRepo.On("FindByID", mock.Anything, agentID).Return(agent, nil)
	mockS3.On("DeleteAvatar", mock.Anything, avatarURL).Return(nil)
	mockRepo.On("Delete", mock.Anything, agentID).Return(nil)

	// Act
	err := uc.DeleteAgent(context.Background(), agentID)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
	mockS3.AssertExpectations(t)
}

// TestDeleteAgent_S3ErrorContinues はS3削除失敗でも続行することをテスト
func TestDeleteAgent_S3ErrorContinues(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	agentID := uuid.New()
	avatarURL := "https://example.com/avatar.jpg"
	agent := testhelper.CreateTestAgent("Test Agent")
	agent.ID = agentID
	agent.AvatarURL = &avatarURL

	s3Err := errors.New("S3 connection failed")

	mockRepo.On("FindByID", mock.Anything, agentID).Return(agent, nil)
	mockS3.On("DeleteAvatar", mock.Anything, avatarURL).Return(s3Err) // S3エラー
	mockRepo.On("Delete", mock.Anything, agentID).Return(nil)         // DB削除は続行

	// Act
	err := uc.DeleteAgent(context.Background(), agentID)

	// Assert: S3エラーでもDB削除は成功
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
	mockS3.AssertExpectations(t)
}

// TestDeleteAgent_AgentNotFound はAgent取得失敗をテスト
func TestDeleteAgent_AgentNotFound(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	agentID := uuid.New()
	notFoundErr := errors.New("agent not found")

	mockRepo.On("FindByID", mock.Anything, agentID).Return(nil, notFoundErr)

	// Act
	err := uc.DeleteAgent(context.Background(), agentID)

	// Assert
	assert.Error(t, err)
	assert.Equal(t, notFoundErr, err)
	mockRepo.AssertExpectations(t)
	// Deleteは呼ばれない
	mockRepo.AssertNotCalled(t, "Delete")
}

// TestDeleteAgent_DeleteError はDB削除失敗をテスト
func TestDeleteAgent_DeleteError(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.MockAgentRepository)
	mockS3 := new(mocks.MockS3Client)
	uc := NewAgentUsecase(mockRepo, mockS3)

	agentID := uuid.New()
	agent := testhelper.CreateTestAgent("Test Agent")
	agent.ID = agentID
	agent.AvatarURL = nil

	deleteErr := errors.New("delete failed")

	mockRepo.On("FindByID", mock.Anything, agentID).Return(agent, nil)
	mockRepo.On("Delete", mock.Anything, agentID).Return(deleteErr)

	// Act
	err := uc.DeleteAgent(context.Background(), agentID)

	// Assert
	assert.Error(t, err)
	assert.Equal(t, deleteErr, err)
	mockRepo.AssertExpectations(t)
}
