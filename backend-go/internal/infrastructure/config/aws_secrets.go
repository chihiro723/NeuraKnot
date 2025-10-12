package config

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

// SecretsConfig AWS Secrets Managerから取得するシークレットの構造
type SecretsConfig struct {
	EncryptionMasterKey string `json:"encryption_master_key"`
	DatabaseURL         string `json:"database_url,omitempty"`
	CognitoClientSecret string `json:"cognito_client_secret,omitempty"`
}

// LoadFromSecretsManager はAWS Secrets Managerからシークレットを取得
func LoadFromSecretsManager(ctx context.Context, secretARN string) (*SecretsConfig, error) {
	// AWS SDK設定をロード
	cfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Secrets Managerクライアント作成
	client := secretsmanager.NewFromConfig(cfg)

	// シークレット取得
	input := &secretsmanager.GetSecretValueInput{
		SecretId: aws.String(secretARN),
	}

	result, err := client.GetSecretValue(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get secret from Secrets Manager: %w", err)
	}

	// シークレットがnilの場合
	if result.SecretString == nil {
		return nil, fmt.Errorf("secret string is nil")
	}

	// JSON解析
	var secrets SecretsConfig
	if err := json.Unmarshal([]byte(*result.SecretString), &secrets); err != nil {
		return nil, fmt.Errorf("failed to parse secret JSON: %w", err)
	}

	// 必須項目のチェック
	if secrets.EncryptionMasterKey == "" {
		return nil, fmt.Errorf("encryption_master_key is required in secrets")
	}

	return &secrets, nil
}

// LoadWithSecretsManager は環境変数とSecrets Managerを統合して設定を読み込み
func LoadWithSecretsManager(ctx context.Context) (*Config, error) {
	// 基本設定を環境変数から読み込み
	cfg := Load()

	// Secrets Managerを使用する場合
	if cfg.Security.UseSecretsManager && cfg.Security.SecretsManagerARN != "" {
		secrets, err := LoadFromSecretsManager(ctx, cfg.Security.SecretsManagerARN)
		if err != nil {
			return nil, fmt.Errorf("failed to load secrets: %w", err)
		}

		// Secrets Managerの値で上書き
		cfg.Security.EncryptionMasterKey = secrets.EncryptionMasterKey

		// オプション: データベースURLもSecrets Managerから取得する場合
		if secrets.DatabaseURL != "" {
			// データベースURL全体を使用する場合は、個別のフィールドをパースする必要がある
			// 今回はシンプルに既存の設定を維持
		}

		// オプション: Cognitoクライアントシークレットも取得
		if secrets.CognitoClientSecret != "" {
			cfg.Cognito.ClientSecret = secrets.CognitoClientSecret
		}
	}

	// マスターキーが設定されていない場合はエラー
	if cfg.Security.EncryptionMasterKey == "" {
		return nil, fmt.Errorf("ENCRYPTION_MASTER_KEY is required but not set")
	}

	return cfg, nil
}
