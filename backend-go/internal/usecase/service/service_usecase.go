package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"backend-go/internal/crypto"
	"backend-go/internal/domain/service"
	"backend-go/pkg/logger"

	"github.com/google/uuid"
)

// ServiceUsecase サービスユースケース
type ServiceUsecase struct {
	serviceConfigRepo  service.ServiceConfigRepository
	aiAgentServiceRepo service.AIAgentServiceRepository
	enc                *crypto.EncryptionService
	pythonServiceURL   string
	httpClient         *http.Client
	logger             logger.Logger
}

// NewServiceUsecase サービスユースケースを作成
func NewServiceUsecase(
	serviceConfigRepo service.ServiceConfigRepository,
	aiAgentServiceRepo service.AIAgentServiceRepository,
	enc *crypto.EncryptionService,
	pythonServiceURL string,
) *ServiceUsecase {
	return &ServiceUsecase{
		serviceConfigRepo:  serviceConfigRepo,
		aiAgentServiceRepo: aiAgentServiceRepo,
		enc:                enc,
		pythonServiceURL:   pythonServiceURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger.NewSimpleLogger(),
	}
}

// ListServices Pythonから全サービス一覧を取得（プロキシ）
func (u *ServiceUsecase) ListServices() ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/api/v1/services", u.pythonServiceURL)

	resp, err := u.httpClient.Get(url)
	if err != nil {
		u.logger.Error("Failed to fetch services from Python API", "error", err)
		return nil, fmt.Errorf("サービス一覧の取得に失敗しました: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		u.logger.Error("Python API returned error", "status", resp.StatusCode, "body", string(body))
		return nil, fmt.Errorf("サービス一覧の取得に失敗しました（ステータス: %d）", resp.StatusCode)
	}

	var services []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&services); err != nil {
		u.logger.Error("Failed to decode services response", "error", err)
		return nil, fmt.Errorf("レスポンスの解析に失敗しました: %w", err)
	}

	return services, nil
}

// GetServiceTools Pythonから指定サービスのツール一覧を取得（プロキシ）
func (u *ServiceUsecase) GetServiceTools(serviceClass string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/api/v1/services/%s/tools", u.pythonServiceURL, serviceClass)

	resp, err := u.httpClient.Get(url)
	if err != nil {
		u.logger.Error("Failed to fetch tools from Python API", "error", err, "service_class", serviceClass)
		return nil, fmt.Errorf("ツール一覧の取得に失敗しました: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("サービス '%s' が見つかりません", serviceClass)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		u.logger.Error("Python API returned error", "status", resp.StatusCode, "body", string(body))
		return nil, fmt.Errorf("ツール一覧の取得に失敗しました（ステータス: %d）", resp.StatusCode)
	}

	var tools []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&tools); err != nil {
		u.logger.Error("Failed to decode tools response", "error", err)
		return nil, fmt.Errorf("レスポンスの解析に失敗しました: %w", err)
	}

	return tools, nil
}

// CreateServiceConfig サービス設定を作成
func (u *ServiceUsecase) CreateServiceConfig(userID uuid.UUID, input *service.CreateServiceConfigInput) (*service.ServiceConfig, error) {
	// 既存の設定をチェック
	existing, _, _, _, _, err := u.serviceConfigRepo.FindByUserAndClass(userID, input.ServiceClass)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("サービス '%s' は既に登録されています", input.ServiceClass)
	}

	// Configを暗号化
	var encryptedConfig, configNonce []byte
	if input.Config != nil {
		configJSON, err := json.Marshal(input.Config)
		if err != nil {
			return nil, fmt.Errorf("設定のシリアライズに失敗しました: %w", err)
		}

		encryptedConfig, configNonce, err = u.enc.Encrypt(string(configJSON))
		if err != nil {
			return nil, fmt.Errorf("設定の暗号化に失敗しました: %w", err)
		}
	}

	// Authを暗号化
	var encryptedAuth, authNonce []byte
	if input.Auth != nil {
		authJSON, err := json.Marshal(input.Auth)
		if err != nil {
			return nil, fmt.Errorf("認証情報のシリアライズに失敗しました: %w", err)
		}

		encryptedAuth, authNonce, err = u.enc.Encrypt(string(authJSON))
		if err != nil {
			return nil, fmt.Errorf("認証情報の暗号化に失敗しました: %w", err)
		}
	}

	config := &service.ServiceConfig{
		UserID:       userID,
		ServiceClass: input.ServiceClass,
		Config:       input.Config,
		Auth:         input.Auth,
		IsEnabled:    true,
	}

	if err := u.serviceConfigRepo.Create(config, encryptedConfig, configNonce, encryptedAuth, authNonce); err != nil {
		u.logger.Error("Failed to create service config", "error", err)
		return nil, fmt.Errorf("サービス設定の作成に失敗しました: %w", err)
	}

	u.logger.Info("Service config created", "user_id", userID, "service_class", input.ServiceClass)
	return config, nil
}

// GetUserServiceConfigs ユーザーのサービス設定一覧を取得
func (u *ServiceUsecase) GetUserServiceConfigs(userID uuid.UUID) ([]service.ServiceConfig, error) {
	configs, err := u.serviceConfigRepo.FindByUserID(userID)
	if err != nil {
		u.logger.Error("Failed to get user service configs", "error", err, "user_id", userID)
		return nil, fmt.Errorf("サービス設定一覧の取得に失敗しました: %w", err)
	}

	// 認証情報は返さない（フロントエンドには渡さない）
	for i := range configs {
		configs[i].Auth = nil
	}

	return configs, nil
}

// GetServiceConfigByID IDでサービス設定を取得
func (u *ServiceUsecase) GetServiceConfigByID(configID uuid.UUID) (*service.ServiceConfig, error) {
	config, _, _, _, _, err := u.serviceConfigRepo.FindByID(configID)
	if err != nil {
		return nil, fmt.Errorf("サービス設定が見つかりません: %w", err)
	}

	// 認証情報は返さない
	config.Auth = nil

	return config, nil
}

// UpdateServiceConfig サービス設定を更新
func (u *ServiceUsecase) UpdateServiceConfig(configID uuid.UUID, input *service.UpdateServiceConfigInput) (*service.ServiceConfig, error) {
	// 既存の設定を取得
	config, oldEncConfig, oldConfigNonce, oldEncAuth, oldAuthNonce, err := u.serviceConfigRepo.FindByID(configID)
	if err != nil {
		return nil, fmt.Errorf("サービス設定が見つかりません: %w", err)
	}

	encryptedConfig := oldEncConfig
	configNonce := oldConfigNonce
	encryptedAuth := oldEncAuth
	authNonce := oldAuthNonce

	// Configを更新
	if input.Config != nil {
		config.Config = input.Config
		configJSON, err := json.Marshal(input.Config)
		if err != nil {
			return nil, fmt.Errorf("設定のシリアライズに失敗しました: %w", err)
		}

		encryptedConfig, configNonce, err = u.enc.Encrypt(string(configJSON))
		if err != nil {
			return nil, fmt.Errorf("設定の暗号化に失敗しました: %w", err)
		}
	}

	// Authを更新
	if input.Auth != nil {
		config.Auth = input.Auth
		authJSON, err := json.Marshal(input.Auth)
		if err != nil {
			return nil, fmt.Errorf("認証情報のシリアライズに失敗しました: %w", err)
		}

		encryptedAuth, authNonce, err = u.enc.Encrypt(string(authJSON))
		if err != nil {
			return nil, fmt.Errorf("認証情報の暗号化に失敗しました: %w", err)
		}
	}

	// IsEnabledを更新
	if input.IsEnabled != nil {
		config.IsEnabled = *input.IsEnabled
	}

	if err := u.serviceConfigRepo.Update(config, encryptedConfig, configNonce, encryptedAuth, authNonce); err != nil {
		u.logger.Error("Failed to update service config", "error", err, "config_id", configID)
		return nil, fmt.Errorf("サービス設定の更新に失敗しました: %w", err)
	}

	u.logger.Info("Service config updated", "config_id", configID)

	// 認証情報は返さない
	config.Auth = nil

	return config, nil
}

// DeleteServiceConfig サービス設定を削除
func (u *ServiceUsecase) DeleteServiceConfig(configID uuid.UUID) error {
	if err := u.serviceConfigRepo.Delete(configID); err != nil {
		u.logger.Error("Failed to delete service config", "error", err, "config_id", configID)
		return fmt.Errorf("サービス設定の削除に失敗しました: %w", err)
	}

	u.logger.Info("Service config deleted", "config_id", configID)
	return nil
}

// CreateAIAgentService AI Agentとサービスを紐付け
func (u *ServiceUsecase) CreateAIAgentService(agentID uuid.UUID, input *service.CreateAIAgentServiceInput) (*service.AIAgentService, error) {
	// ツール選択モードのデフォルト値
	if input.ToolSelectionMode == "" {
		input.ToolSelectionMode = "all"
	}

	agentService := &service.AIAgentService{
		AIAgentID:         agentID,
		ServiceClass:      input.ServiceClass,
		ToolSelectionMode: input.ToolSelectionMode,
		SelectedTools:     input.SelectedTools,
		Enabled:           input.Enabled,
	}

	if err := u.aiAgentServiceRepo.Create(agentService); err != nil {
		u.logger.Error("Failed to create AI agent service", "error", err)
		return nil, fmt.Errorf("AI Agentサービス紐付けの作成に失敗しました: %w", err)
	}

	u.logger.Info("AI agent service created", "agent_id", agentID, "service_class", input.ServiceClass)
	return agentService, nil
}

// GetAIAgentServices AI Agentの紐付けサービス一覧を取得
func (u *ServiceUsecase) GetAIAgentServices(agentID uuid.UUID) ([]service.AIAgentService, error) {
	services, err := u.aiAgentServiceRepo.FindByAgentID(agentID)
	if err != nil {
		u.logger.Error("Failed to get AI agent services", "error", err, "agent_id", agentID)
		return nil, fmt.Errorf("AI Agentサービス一覧の取得に失敗しました: %w", err)
	}

	return services, nil
}

// ExecuteTool Pythonでツールを実行（プロキシ）
func (u *ServiceUsecase) ExecuteTool(userID uuid.UUID, serviceClass, toolName string, arguments map[string]interface{}) (map[string]interface{}, error) {
	// ユーザーのサービス設定を取得
	serviceConfig, _, _, _, _, err := u.serviceConfigRepo.FindByUserAndClass(userID, serviceClass)
	if err != nil {
		return nil, fmt.Errorf("サービス設定が見つかりません: %w", err)
	}

	if !serviceConfig.IsEnabled {
		return nil, fmt.Errorf("サービス '%s' は無効化されています", serviceClass)
	}

	// Python APIへリクエスト
	url := fmt.Sprintf("%s/api/v1/services/%s/execute", u.pythonServiceURL, serviceClass)

	requestBody := map[string]interface{}{
		"tool_name": toolName,
		"arguments": arguments,
		"user_id":   userID.String(),
		"config":    serviceConfig.Config,
		"auth":      serviceConfig.Auth,
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("リクエストのシリアライズに失敗しました: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("リクエストの作成に失敗しました: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", userID.String())

	resp, err := u.httpClient.Do(req)
	if err != nil {
		u.logger.Error("Failed to execute tool via Python API", "error", err)
		return nil, fmt.Errorf("ツールの実行に失敗しました: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		u.logger.Error("Python API returned error", "status", resp.StatusCode, "body", string(body))
		return nil, fmt.Errorf("ツールの実行に失敗しました（ステータス: %d）", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		u.logger.Error("Failed to decode tool execution response", "error", err)
		return nil, fmt.Errorf("レスポンスの解析に失敗しました: %w", err)
	}

	return result, nil
}

// ValidateServiceAuth サービスの認証情報を検証
func (u *ServiceUsecase) ValidateServiceAuth(serviceClass string, auth map[string]interface{}) error {
	u.logger.Info("Starting service auth validation", "service_class", serviceClass, "auth_keys", getAuthKeys(auth))

	// Built-inサービス（認証不要）の場合は検証をスキップ
	if u.isBuiltInService(serviceClass) {
		u.logger.Info("Skipping validation for built-in service", "service_class", serviceClass)
		return nil
	}

	// 検証用ツールとパラメータを選択
	toolName, arguments := u.getValidationToolAndArgs(serviceClass)
	if toolName == "" {
		return fmt.Errorf("サービス '%s' の検証ツールが見つかりません", serviceClass)
	}
	u.logger.Info("Selected validation tool", "tool_name", toolName, "arguments", arguments)

	// Python APIへリクエスト
	url := fmt.Sprintf("%s/api/v1/services/%s/execute", u.pythonServiceURL, serviceClass)
	u.logger.Info("Calling Python API", "url", url)

	requestBody := map[string]interface{}{
		"tool_name": toolName,
		"arguments": arguments,
		"config":    map[string]interface{}{},
		"auth":      auth,
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("リクエストのシリアライズに失敗しました: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("リクエストの作成に失敗しました: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := u.httpClient.Do(req)
	if err != nil {
		u.logger.Error("Failed to validate service auth via Python API", "error", err, "service_class", serviceClass)
		return fmt.Errorf("接続の確認に失敗しました: %w", err)
	}
	defer resp.Body.Close()

	u.logger.Info("Python API response received", "status_code", resp.StatusCode)

	// ステータスコードで認証の成否を判定
	switch resp.StatusCode {
	case http.StatusOK:
		// レスポンスボディを確認してエラーメッセージがないかチェック
		body, _ := io.ReadAll(resp.Body)
		var result map[string]interface{}
		if err := json.Unmarshal(body, &result); err != nil {
			u.logger.Error("Failed to parse Python API response", "error", err, "body", string(body))
			return fmt.Errorf("レスポンスの解析に失敗しました")
		}

		u.logger.Info("Python API response parsed", "success", result["success"], "result", result["result"])

		// successフィールドをチェック
		if success, ok := result["success"].(bool); ok {
			if !success {
				// エラーメッセージを取得
				if errorMsg, ok := result["error"].(string); ok && errorMsg != "" {
					return fmt.Errorf("認証情報が正しくありません: %s", errorMsg)
				}
				// resultフィールドにエラーメッセージがある場合
				if resultMsg, ok := result["result"].(string); ok && resultMsg != "" {
					return fmt.Errorf("認証情報が正しくありません: %s", resultMsg)
				}
				return fmt.Errorf("認証情報が正しくありません")
			}
		} else {
			u.logger.Error("Invalid response format from Python API", "response", result)
			return fmt.Errorf("無効なレスポンス形式です")
		}

		// successがtrueでも、resultフィールドにエラーメッセージが含まれている場合は失敗とする
		if resultMsg, ok := result["result"].(string); ok && resultMsg != "" {
			// エラーメッセージのパターンをチェック
			if strings.Contains(resultMsg, "エラー:") ||
				strings.Contains(resultMsg, "error") ||
				strings.Contains(resultMsg, "無効") ||
				strings.Contains(resultMsg, "invalid") ||
				strings.Contains(resultMsg, "unauthorized") ||
				strings.Contains(resultMsg, "forbidden") {
				u.logger.Info("Auth validation failed due to error in result", "result", resultMsg)
				return fmt.Errorf("認証情報が正しくありません: %s", resultMsg)
			}
		}

		u.logger.Info("Service auth validation successful", "service_class", serviceClass)
		return nil // 認証成功
	case http.StatusUnauthorized, http.StatusForbidden:
		return fmt.Errorf("認証情報が正しくありません。APIキーを確認してください")
	case http.StatusNotFound:
		return fmt.Errorf("サービスが見つかりません")
	case http.StatusTooManyRequests:
		return fmt.Errorf("レート制限を超えました。しばらく待ってから再試行してください")
	default:
		body, _ := io.ReadAll(resp.Body)
		u.logger.Error("Python API returned error during validation", "status", resp.StatusCode, "body", string(body))
		return fmt.Errorf("接続の確認に失敗しました（ステータス: %d）", resp.StatusCode)
	}
}

// getAuthKeys 認証情報のキー一覧を取得（ログ用）
func getAuthKeys(auth map[string]interface{}) []string {
	keys := make([]string, 0, len(auth))
	for key := range auth {
		keys = append(keys, key)
	}
	return keys
}

// isBuiltInService サービスがBuilt-inサービスかどうかを判定
func (u *ServiceUsecase) isBuiltInService(serviceClass string) bool {
	builtInServices := map[string]bool{
		"DateTimeService":    true,
		"CalculationService": true,
		"TextService":        true,
		"DataService":        true,
		"UtilityService":     true,
	}
	return builtInServices[serviceClass]
}

// getValidationToolAndArgs サービスごとに適切な検証用ツールとパラメータを選択
func (u *ServiceUsecase) getValidationToolAndArgs(serviceClass string) (string, map[string]interface{}) {
	switch serviceClass {
	// API Wrapper サービス（認証が必要）
	case "SlackService":
		return "list_channels", map[string]interface{}{"limit": 1}
	case "NotionService":
		return "search_pages", map[string]interface{}{"query": "", "page_size": 1}
	case "BraveSearchService":
		return "web_search", map[string]interface{}{"query": "test", "count": 1}
	case "GoogleCalendarService":
		return "list_calendars", map[string]interface{}{}
	case "OpenWeatherService":
		return "get_current_weather", map[string]interface{}{"city": "Tokyo"}
	case "ExchangeRateService":
		return "get_exchange_rate", map[string]interface{}{"from": "USD", "to": "JPY"}
	case "IPApiService":
		return "get_ip_info", map[string]interface{}{"ip": "8.8.8.8"}

	// Built-in サービス（認証不要）
	case "DateTimeService":
		return "get_current_time", map[string]interface{}{}
	case "CalculationService":
		return "add", map[string]interface{}{"a": 1, "b": 1}
	case "TextService":
		return "count_words", map[string]interface{}{"text": "test"}
	case "DataService":
		return "generate_uuid", map[string]interface{}{}
	case "UtilityService":
		return "generate_password", map[string]interface{}{"length": 8}

	default:
		// 未知のサービスはエラーを返す
		u.logger.Error("Unknown service class for validation", "service_class", serviceClass)
		return "", map[string]interface{}{}
	}
}
