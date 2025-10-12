package config

import (
	"os"
	"strconv"
)

// Config アプリケーション設定
type Config struct {
	// サーバー設定
	Server ServerConfig

	// データベース設定
	Database DatabaseConfig

	// AWS Cognito設定
	Cognito CognitoConfig

	// AI Service設定
	AIService AIServiceConfig

	// ログ設定
	Log LogConfig

	// セキュリティ設定
	Security SecurityConfig
}

// ServerConfig サーバー設定
type ServerConfig struct {
	Port string
	Host string
}

// DatabaseConfig データベース設定
type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// CognitoConfig AWS Cognito設定
type CognitoConfig struct {
	Region          string
	UserPoolID      string
	ClientID        string
	ClientSecret    string
	RedirectURL     string
	TokenExpiration int
}

// AIServiceConfig AI Service設定
type AIServiceConfig struct {
	URL     string
	Timeout int
}

// LogConfig ログ設定
type LogConfig struct {
	Level  string
	Format string
}

// SecurityConfig セキュリティ設定
type SecurityConfig struct {
	// AES-256-GCM暗号化用マスターキー（Base64エンコード済み）
	EncryptionMasterKey string
	// AWS Secrets Manager設定
	UseSecretsManager bool
	SecretsManagerARN string
}

// Load 設定を環境変数から読み込み
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "8080"),
			Host: getEnv("SERVER_HOST", "0.0.0.0"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnvAsInt("DB_PORT", 5432),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "password"),
			DBName:   getEnv("DB_NAME", "bridgespeak"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Cognito: CognitoConfig{
			Region:          getEnv("AWS_REGION", "ap-northeast-1"),
			UserPoolID:      getEnv("COGNITO_USER_POOL_ID", ""),
			ClientID:        getEnv("COGNITO_CLIENT_ID", ""),
			ClientSecret:    getEnv("COGNITO_CLIENT_SECRET", ""),
			RedirectURL:     getEnv("COGNITO_REDIRECT_URL", "http://localhost:3000/auth/callback"),
			TokenExpiration: getEnvAsInt("COGNITO_TOKEN_EXPIRATION", 3600),
		},
		AIService: AIServiceConfig{
			URL:     getEnv("AI_SERVICE_URL", "http://localhost:8001"),
			Timeout: getEnvAsInt("AI_SERVICE_TIMEOUT", 120),
		},
		Log: LogConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
		Security: SecurityConfig{
			EncryptionMasterKey: getEnv("ENCRYPTION_MASTER_KEY", ""),
			UseSecretsManager:   getEnv("USE_SECRETS_MANAGER", "false") == "true",
			SecretsManagerARN:   getEnv("SECRETS_MANAGER_ARN", ""),
		},
	}
}

// getEnv 環境変数を取得（デフォルト値付き）
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt 環境変数を整数として取得（デフォルト値付き）
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
