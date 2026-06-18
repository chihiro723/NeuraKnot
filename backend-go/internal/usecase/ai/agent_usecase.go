package ai

import (
	"context"
	"errors"
	"fmt"

	"backend-go/internal/domain/ai"
	"backend-go/internal/domain/chatpin"
	"backend-go/internal/domain/llmmodel"
	llmmodelusecase "backend-go/internal/usecase/llmmodel"

	"github.com/google/uuid"
)

// S3Client S3操作のインターフェース
type S3Client interface {
	DeleteAvatar(ctx context.Context, avatarURL string) error
}

// AgentUsecase はAI Agentのユースケース
type AgentUsecase struct {
	repo        ai.Repository
	s3Client    S3Client
	chatPinRepo chatpin.Repository
	llmModels   *llmmodelusecase.Usecase
}

// NewAgentUsecase はAI Agentユースケースを作成
// chatPinRepo は nil 可（ピン機能を無効化したい環境用の保険）
func NewAgentUsecase(
	repo ai.Repository,
	s3Client S3Client,
	chatPinRepo chatpin.Repository,
	llmModels *llmmodelusecase.Usecase,
) *AgentUsecase {
	return &AgentUsecase{
		repo:        repo,
		s3Client:    s3Client,
		chatPinRepo: chatPinRepo,
		llmModels:   llmModels,
	}
}

// CreateAgent はAI Agentを作成
func (uc *AgentUsecase) CreateAgent(
	ctx context.Context,
	userID uuid.UUID,
	name string,
	personaType string,
	provider string,
	model string,
	temperature float64,
	maxTokens int,
	description *string,
	avatarURL *string,
	systemPrompt *string,
	streamingEnabled bool,
) (*ai.Agent, error) {
	// PersonaTypeをパース
	persona, err := ai.ParsePersonaType(personaType)
	if err != nil {
		return nil, errors.New("invalid persona type")
	}

	// Providerをパース
	var prov ai.Provider
	if provider == "" {
		// デフォルトはOpenAI
		prov = ai.ProviderOpenAI
	} else {
		prov, err = ai.ParseProvider(provider)
		if err != nil {
			return nil, errors.New("invalid provider")
		}
	}

	// Modelのデフォルト
	if model == "" {
		model = "gpt-4.1"
	}

	if uc.llmModels != nil {
		if err := uc.llmModels.ValidateRuntimeConfig(ctx, prov.String(), model, temperature, maxTokens); err != nil {
			if errors.Is(err, llmmodel.ErrModelNotFound) || errors.Is(err, llmmodel.ErrModelDisabled) {
				return nil, err
			}
			return nil, fmt.Errorf("failed to validate llm model: %w", err)
		}
	}

	// AI Agentを作成
	agent, err := ai.NewAgent(userID, name, persona, prov, model)
	if err != nil {
		return nil, err
	}

	// 作成時に指定されたランタイム設定を反映
	agent.Temperature = temperature
	agent.MaxTokens = maxTokens

	// 説明を設定
	if description != nil && *description != "" {
		agent.SetDescription(*description)
	}

	// アバターURLを設定
	if avatarURL != nil && *avatarURL != "" {
		agent.AvatarURL = avatarURL
	}

	// システムプロンプトを設定
	if systemPrompt != nil && *systemPrompt != "" {
		agent.SetSystemPrompt(*systemPrompt)
	}

	// StreamingEnabledを設定
	agent.StreamingEnabled = streamingEnabled

	// バリデーション
	if err := agent.Validate(); err != nil {
		return nil, err
	}

	// 保存
	if err := uc.repo.Save(ctx, agent); err != nil {
		return nil, err
	}

	return agent, nil
}

// GetUserAgents はユーザーのAI Agentリストを取得
func (uc *AgentUsecase) GetUserAgents(ctx context.Context, userID uuid.UUID) ([]*ai.Agent, error) {
	agents, err := uc.repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return agents, nil
}

// GetAgentByID はIDでAI Agentを取得
func (uc *AgentUsecase) GetAgentByID(ctx context.Context, agentID uuid.UUID) (*ai.Agent, error) {
	agent, err := uc.repo.FindByID(ctx, agentID)
	if err != nil {
		return nil, err
	}
	return agent, nil
}

// UpdateAgent はAI Agentを更新
func (uc *AgentUsecase) UpdateAgent(ctx context.Context, agent *ai.Agent) error {
	if uc.llmModels != nil {
		if err := uc.llmModels.ValidateRuntimeConfig(
			ctx,
			agent.Provider.String(),
			agent.Model,
			agent.Temperature,
			agent.MaxTokens,
		); err != nil {
			return err
		}
	}

	if err := agent.Validate(); err != nil {
		return err
	}
	return uc.repo.Update(ctx, agent)
}

// DeleteAgent はAI Agentを削除
// 削除成功後、全ユーザーの該当ピン（chat_type='direct'）もまとめて掃除する
// （user_chat_pins には FK を張っていないため、DB レベルの CASCADE は効かない）
func (uc *AgentUsecase) DeleteAgent(ctx context.Context, agentID uuid.UUID) error {
	// エージェントを取得してアバターURLを確認
	agent, err := uc.repo.FindByID(ctx, agentID)
	if err != nil {
		return err
	}

	// アバターがあればS3から削除
	if agent.AvatarURL != nil && *agent.AvatarURL != "" {
		if err := uc.s3Client.DeleteAvatar(ctx, *agent.AvatarURL); err != nil {
			// S3削除失敗してもログだけ出して続行
			fmt.Printf("failed to delete agent avatar from S3: %v\n", err)
		}
	}

	// データベースから削除
	if err := uc.repo.Delete(ctx, agentID); err != nil {
		return err
	}

	// 関連するピンを掃除（失敗してもユーザー操作の結果には影響させない）
	if uc.chatPinRepo != nil {
		if err := uc.chatPinRepo.DeleteByTarget(ctx, chatpin.ChatTypeDirect, agentID); err != nil {
			fmt.Printf("failed to delete agent pins: %v\n", err)
		}
	}

	return nil
}
