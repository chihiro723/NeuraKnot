package external

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// AIClient はBackend-pythonとの通信クライアント
type AIClient struct {
	baseURL    string
	httpClient *http.Client
}

// NewAIClient はAI Clientを作成
func NewAIClient(baseURL string, timeout time.Duration) *AIClient {
	return &AIClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

// ConversationMessage は会話履歴のメッセージ
type ConversationMessage struct {
	Role    string `json:"role"`    // "user" or "assistant"
	Content string `json:"content"` // メッセージ内容
}

// MCPServerConfig はMCPサーバーの設定（オプション）
type MCPServerConfig struct {
	URL string `json:"url"`
}

// AgentConfig はAI Agentの設定
type AgentConfig struct {
	Provider           string  `json:"provider"`                       // プロバイダー（openai, anthropic等）
	Model              string  `json:"model"`                          // LLMモデル名
	Temperature        float64 `json:"temperature"`                    // 温度パラメータ
	MaxTokens          int     `json:"max_tokens"`                     // 最大トークン数
	Persona            string  `json:"persona"`                        // ペルソナ
	CustomSystemPrompt *string `json:"custom_system_prompt,omitempty"` // カスタムシステムプロンプト
}

// ChatRequest はチャットリクエスト
type ChatRequest struct {
	UserID              string                `json:"user_id"`                        // ユーザーID
	ConversationID      string                `json:"conversation_id"`                // 会話ID
	Message             string                `json:"message"`                        // ユーザーメッセージ
	ConversationHistory []ConversationMessage `json:"conversation_history,omitempty"` // 会話履歴
	AgentConfig         AgentConfig           `json:"agent_config"`                   // AI設定
	MCPServers          []MCPServerConfig     `json:"mcp_servers,omitempty"`          // MCPサーバー（オプション）
	IncludeBasicTools   bool                  `json:"include_basic_tools"`            // 基本ツールを含めるか
}

// ToolCall はツール呼び出し情報
type ToolCall struct {
	ToolID          string                 `json:"tool_id"`           // ツールID
	ToolName        string                 `json:"tool_name"`         // ツール名
	Status          string                 `json:"status"`            // ステータス（completed/failed）
	Input           map[string]interface{} `json:"input"`             // 入力パラメータ
	Output          string                 `json:"output"`            // 出力結果
	Error           *string                `json:"error,omitempty"`   // エラーメッセージ（オプション）
	ExecutionTimeMs int                    `json:"execution_time_ms"` // 実行時間（ミリ秒）
}

// TokenUsage はトークン使用量
type TokenUsage struct {
	Prompt     int `json:"prompt"`     // Pythonの形式に合わせる
	Completion int `json:"completion"` // Pythonの形式に合わせる
	Total      int `json:"total"`      // Pythonの形式に合わせる
}

// AIMetadata はAI処理のメタデータ
type AIMetadata struct {
	Model            string     `json:"model"`
	Provider         string     `json:"provider"`
	TokensUsed       TokenUsage `json:"tokens_used"`        // Pythonの形式に合わせる
	ProcessingTimeMs int        `json:"processing_time_ms"` // Pythonの形式に合わせる
	ToolsAvailable   int        `json:"tools_available"`
	BasicToolsCount  int        `json:"basic_tools_count"`
	MCPToolsCount    int        `json:"mcp_tools_count"`
}

// ChatResponse はチャットレスポンス
type ChatResponse struct {
	ConversationID string     `json:"conversation_id"` // Pythonの形式に合わせる
	Message        string     `json:"message"`         // Pythonの形式: "response" ではなく "message"
	ToolCalls      []ToolCall `json:"tool_calls"`      // ツール呼び出し履歴
	Metadata       AIMetadata `json:"metadata"`        // メタデータ
}

// Chat はチャットリクエストを送信
func (c *AIClient) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	// リクエストボディを作成
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// HTTPリクエストを作成
	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		fmt.Sprintf("%s/api/v1/ai/chat", c.baseURL),
		bytes.NewBuffer(body),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	// リクエストを送信
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// レスポンスボディを読み取り
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// ステータスコードをチェック
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI service returned error: %d - %s", resp.StatusCode, string(respBody))
	}

	// レスポンスをパース
	var chatResp ChatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &chatResp, nil
}

// HealthCheck はBackend-pythonのヘルスチェック
func (c *AIClient) HealthCheck(ctx context.Context) error {
	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("%s/api/v1/health", c.baseURL),
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health check failed: status %d", resp.StatusCode)
	}

	return nil
}
