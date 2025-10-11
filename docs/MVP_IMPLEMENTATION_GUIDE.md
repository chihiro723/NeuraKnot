# BridgeSpeak MVP 実装ガイド

## 📋 目次

1. [MVP 概要](#mvp-概要)
2. [実装済み](#実装済み)
3. [次のステップ](#次のステップ)
4. [実装順序](#実装順序)
5. [チェックリスト](#チェックリスト)

---

## MVP 概要

### 🎯 目標

**シンプルな AI 分身チャットアプリ**

ユーザーが自分の AI Agent を作成し、チャットで会話できる MVP

### ✅ 実装する機能

1. **ユーザー管理**

   - 登録・ログイン（AWS Cognito）
   - プロフィール管理

2. **AI Agent 作成**

   - 名前、説明、アバター設定
   - 振る舞い選択：
     - `assistant`: 親切で丁寧
     - `creative`: 創造的
     - `analytical`: 論理的
   - モデル選択：
     - OpenAI: `gpt-4o`, `gpt-4o-mini`
     - Anthropic: `claude-3.5-sonnet`
     - Google: `gemini-pro`

3. **チャット機能**
   - AI Agent との 1 対 1 チャット
   - リアルタイムメッセージング
   - 会話履歴表示
   - AI 処理履歴の記録（デバッグ用）

### ❌ MVP では実装しない

- ユーザー間メッセージング
- 友達機能
- 既読管理
- グループチャット
- 複雑なペルソナ設定
- 統計ダッシュボード

---

## 実装済み

### ✅ データベース設計

1. **設計書**

   - ✅ `docs/DATABASE_DESIGN_MVP.md` - MVP 版の詳細設計
   - ✅ `docs/DATABASE_DESIGN.md` - 完全版（将来の拡張用）

2. **マイグレーションファイル**（全 6 個）

   **フェーズ 1: 基本機能（必須）**

   - ✅ `000001_create_users_table.up.sql` （既存）
   - ✅ `000002_create_ai_agents_table.up.sql` （ペルソナ統合版）
   - ✅ `000003_create_conversations_table.up.sql` （シンプル版）
   - ✅ `000004_create_messages_table.up.sql`

   **フェーズ 2: AI 処理履歴（推奨）**

   - ✅ `000005_create_ai_chat_sessions_table.up.sql`
   - ✅ `000006_create_ai_tool_usage_table.up.sql`

3. **マイグレーション管理**
   - ✅ `backend-go/migrations/README.md` - 実行手順

### ✅ Backend-python（AI 処理）

- ✅ FastAPI アプリケーション構造
- ✅ LangChain Agent 統合
- ✅ マルチ LLM 対応（OpenAI、Anthropic、Google）
- ✅ 基本ツール 19 個実装
- ✅ MCP 統合準備完了
- ✅ ストリーミング対応

---

## 次のステップ

### 1. Backend-python のクリーンアップ（優先度: 高）

**目的**: Backend-python をステートレスな AI 処理エンジンにする

#### 削除するもの

```bash
# 1. データベース関連のディレクトリを削除
rm -rf backend-python/app/database/

# 2. requirements.txtからDB関連パッケージを削除
# - asyncpg
# - databases
```

#### 更新するもの

**`backend-python/app/core/config.py`**

```python
# Before
class Settings(BaseSettings):
    POSTGRES_HOST: str
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    # ...

# After
class Settings(BaseSettings):
    # PostgreSQL設定を削除
    # DB接続はBackend-goのみが行う

    # LLM API Keys
    OPENAI_API_KEY: str
    ANTHROPIC_API_KEY: str
    GOOGLE_API_KEY: str
    # ...
```

**`.env.local.example`**

```env
# Before
POSTGRES_HOST=postgres
POSTGRES_USER=backend_python_user
POSTGRES_PASSWORD=...

# After
# PostgreSQL設定を削除（DBアクセスなし）

# LLM API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

---

### 2. Backend-go の実装（優先度: 高）

#### 2.1 ドメインモデルの作成

```
backend-go/internal/domain/
├── ai/
│   ├── agent.go           # AI Agentエンティティ
│   └── repository.go      # リポジトリインターフェース
├── conversation/
│   ├── conversation.go    # 会話エンティティ
│   ├── message.go         # メッセージエンティティ
│   └── repository.go
└── user/                  # 既存
    ├── user.go
    └── repository.go
```

**`internal/domain/ai/agent.go`**

```go
package ai

import (
    "time"
    "github.com/google/uuid"
)

// PersonaType は AI Agent の振る舞いタイプ
type PersonaType string

const (
    PersonaAssistant  PersonaType = "assistant"
    PersonaCreative   PersonaType = "creative"
    PersonaAnalytical PersonaType = "analytical"
)

// Provider は LLM プロバイダー
type Provider string

const (
    ProviderOpenAI    Provider = "openai"
    ProviderAnthropic Provider = "anthropic"
    ProviderGoogle    Provider = "google"
)

// Agent は AI Agent エンティティ
type Agent struct {
    ID           uuid.UUID
    UserID       uuid.UUID
    Name         string
    Description  *string
    AvatarURL    *string

    // ペルソナ設定
    PersonaType  PersonaType
    Provider     Provider
    Model        string
    Temperature  float64
    MaxTokens    int
    SystemPrompt *string
    ToolsEnabled bool

    // ステータス
    IsActive     bool

    // 統計
    MessageCount int
    LastChatAt   *time.Time

    // タイムスタンプ
    CreatedAt    time.Time
    UpdatedAt    time.Time
}

// NewAgent は新しい AI Agent を作成
func NewAgent(
    userID uuid.UUID,
    name string,
    personaType PersonaType,
    provider Provider,
    model string,
) (*Agent, error) {
    if name == "" {
        return nil, ErrInvalidAgentName
    }

    return &Agent{
        ID:           uuid.New(),
        UserID:       userID,
        Name:         name,
        PersonaType:  personaType,
        Provider:     provider,
        Model:        model,
        Temperature:  0.7,
        MaxTokens:    2000,
        ToolsEnabled: true,
        IsActive:     true,
        MessageCount: 0,
        CreatedAt:    time.Now(),
        UpdatedAt:    time.Now(),
    }, nil
}

// GetSystemPrompt はシステムプロンプトを取得（カスタムがなければデフォルト）
func (a *Agent) GetSystemPrompt() string {
    if a.SystemPrompt != nil && *a.SystemPrompt != "" {
        return *a.SystemPrompt
    }
    return DefaultSystemPrompts[a.PersonaType]
}

// DefaultSystemPrompts はペルソナタイプごとのデフォルトプロンプト
var DefaultSystemPrompts = map[PersonaType]string{
    PersonaAssistant: `あなたは親切で丁寧なアシスタントです。
ユーザーの質問に分かりやすく、丁寧に答えてください。
必要に応じて、ステップバイステップで説明してください。`,

    PersonaCreative: `あなたは創造的で発想豊かなアシスタントです。
ユーザーとの対話を通じて、新しいアイデアや視点を提供してください。
既成概念にとらわれず、自由な発想を大切にしてください。`,

    PersonaAnalytical: `あなたは論理的で分析的なアシスタントです。
データと事実に基づいて回答し、根拠を明確に示してください。
複雑な問題は要素に分解し、体系的に分析してください。`,
}
```

#### 2.2 インフラストラクチャ層の実装

```
backend-go/internal/infrastructure/
├── persistence/
│   ├── ai_agent_repository.go     # AI Agentリポジトリ実装
│   ├── conversation_repository.go # 会話リポジトリ実装
│   └── user_repository.go         # 既存
└── external/
    └── ai_client.go               # Backend-python通信クライアント
```

**`internal/infrastructure/external/ai_client.go`**

```go
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

// AIClient は Backend-python との通信クライアント
type AIClient struct {
    baseURL    string
    httpClient *http.Client
}

// NewAIClient は AIClient を作成
func NewAIClient(baseURL string, timeout time.Duration) *AIClient {
    return &AIClient{
        baseURL: baseURL,
        httpClient: &http.Client{
            Timeout: timeout,
        },
    }
}

// ChatRequest は AI チャットリクエスト
type ChatRequest struct {
    Message             string                  `json:"message"`
    ConversationHistory []ConversationMessage   `json:"conversation_history"`
    AgentConfig         AgentConfig             `json:"agent_config"`
    MCPServers          []MCPServerConfig       `json:"mcp_servers,omitempty"`
}

// ConversationMessage は会話履歴の1メッセージ
type ConversationMessage struct {
    Role    string `json:"role"`    // "user" or "assistant"
    Content string `json:"content"`
}

// AgentConfig は AI Agent の設定
type AgentConfig struct {
    Provider     string  `json:"provider"`
    Model        string  `json:"model"`
    Persona      string  `json:"persona"`
    Temperature  float64 `json:"temperature"`
    MaxTokens    int     `json:"max_tokens"`
    SystemPrompt string  `json:"system_prompt"`
}

// ChatResponse は AI チャットレスポンス
type ChatResponse struct {
    Response  string      `json:"response"`
    ToolCalls []ToolCall  `json:"tool_calls"`
    Metadata  AIMetadata  `json:"metadata"`
}

// ToolCall はツール呼び出し情報
type ToolCall struct {
    ToolName string                 `json:"tool_name"`
    Input    map[string]interface{} `json:"input"`
    Output   string                 `json:"output"`
}

// AIMetadata は AI 処理のメタデータ
type AIMetadata struct {
    Provider        string `json:"provider"`
    Model           string `json:"model"`
    TokensUsed      int    `json:"tokens_used"`
    ProcessingTimeMS int   `json:"processing_time_ms"`
}

// Chat は AI チャットを実行
func (c *AIClient) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
    body, err := json.Marshal(req)
    if err != nil {
        return nil, fmt.Errorf("failed to marshal request: %w", err)
    }

    httpReq, err := http.NewRequestWithContext(
        ctx,
        "POST",
        c.baseURL+"/api/v1/chat",
        bytes.NewReader(body),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create request: %w", err)
    }
    httpReq.Header.Set("Content-Type", "application/json")

    resp, err := c.httpClient.Do(httpReq)
    if err != nil {
        return nil, fmt.Errorf("failed to call AI service: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        bodyBytes, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("AI service error (status=%d): %s", resp.StatusCode, string(bodyBytes))
    }

    var chatResp ChatResponse
    if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
        return nil, fmt.Errorf("failed to decode response: %w", err)
    }

    return &chatResp, nil
}
```

#### 2.3 ユースケース層の実装

```
backend-go/internal/usecase/
├── ai/
│   └── agent_usecase.go    # AI Agent ユースケース
└── chat/
    └── chat_usecase.go     # チャットユースケース
```

#### 2.4 ハンドラー層の実装

```
backend-go/internal/handler/http/
├── ai_agent_handler.go     # AI Agent API
├── chat_handler.go         # チャット API
└── user_handler.go         # 既存
```

---

### 3. Frontend の実装（優先度: 中）

#### 3.1 AI Agent 作成画面

```tsx
// frontend/app/ai-agents/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAIAgentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    personaType: "assistant",
    provider: "openai",
    model: "gpt-4o",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch("/api/ai-agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      const agent = await response.json();
      router.push(`/chat/${agent.id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">AI Agent を作成</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 名前 */}
        <div>
          <label className="block text-sm font-medium mb-2">名前</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="マイアシスタント"
            required
          />
        </div>

        {/* 振る舞い */}
        <div>
          <label className="block text-sm font-medium mb-2">振る舞い</label>
          <select
            value={formData.personaType}
            onChange={(e) =>
              setFormData({ ...formData, personaType: e.target.value })
            }
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="assistant">アシスタント（親切で丁寧）</option>
            <option value="creative">クリエイティブ（創造的）</option>
            <option value="analytical">アナリティカル（論理的）</option>
          </select>
        </div>

        {/* モデル */}
        <div>
          <label className="block text-sm font-medium mb-2">モデル</label>
          <select
            value={formData.model}
            onChange={(e) =>
              setFormData({ ...formData, model: e.target.value })
            }
            className="w-full px-4 py-2 border rounded-lg"
          >
            <optgroup label="OpenAI">
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
            </optgroup>
            <optgroup label="Anthropic">
              <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
            </optgroup>
            <optgroup label="Google">
              <option value="gemini-pro">Gemini Pro</option>
            </optgroup>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          作成
        </button>
      </form>
    </div>
  );
}
```

#### 3.2 チャット画面

```tsx
// frontend/app/chat/[agentId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function ChatPage() {
  const params = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setLoading(true);
    const userMessage = { role: "user", content: input };
    setMessages([...messages, userMessage]);
    setInput("");

    const response = await fetch(`/api/chat/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ai_agent_id: params.agentId,
        message: input,
      }),
    });

    const data = await response.json();
    setMessages([
      ...messages,
      userMessage,
      {
        role: "assistant",
        content: data.content,
      },
    ]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-md px-4 py-2 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* 入力欄 */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 px-4 py-2 border rounded-lg"
            placeholder="メッセージを入力..."
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 実装順序

### Week 1: データベース + Backend-python クリーンアップ

1. ✅ マイグレーションファイル作成
2. ⬜ マイグレーション実行
3. ⬜ Backend-python の DB 関連コード削除
4. ⬜ Backend-python の動作確認

### Week 2: Backend-go（ドメイン + インフラ）

1. ⬜ ドメインモデル実装（AI Agent、Conversation、Message）
2. ⬜ リポジトリ実装（PostgreSQL）
3. ⬜ AI Client 実装（Backend-python 通信）
4. ⬜ 単体テスト

### Week 3: Backend-go（ユースケース + ハンドラー）

1. ⬜ AI Agent ユースケース
2. ⬜ チャットユースケース
3. ⬜ REST API ハンドラー
4. ⬜ Swagger ドキュメント更新
5. ⬜ 統合テスト

### Week 4: Frontend

1. ⬜ AI Agent 作成画面
2. ⬜ AI Agent 一覧画面
3. ⬜ チャット画面
4. ⬜ 会話履歴表示
5. ⬜ E2E テスト

---

## チェックリスト

### データベース

- [x] MVP 設計書作成
- [x] マイグレーションファイル作成
- [ ] マイグレーション実行
- [ ] データ整合性確認

### Backend-python

- [x] FastAPI アプリ実装
- [x] LangChain 統合
- [x] 基本ツール実装
- [ ] DB 関連コード削除
- [ ] 動作確認

### Backend-go

- [ ] ドメインモデル
  - [ ] AI Agent
  - [ ] Conversation
  - [ ] Message
- [ ] リポジトリ
  - [ ] AI Agent Repository
  - [ ] Conversation Repository
- [ ] AI Client
  - [ ] Chat API 呼び出し
  - [ ] エラーハンドリング
- [ ] ユースケース
  - [ ] AI Agent 作成
  - [ ] チャット送信
- [ ] ハンドラー
  - [ ] AI Agent API
  - [ ] Chat API
- [ ] テスト
  - [ ] 単体テスト
  - [ ] 統合テスト

### Frontend

- [ ] AI Agent 作成画面
- [ ] AI Agent 一覧画面
- [ ] チャット画面
- [ ] 会話履歴表示
- [ ] レスポンシブ対応
- [ ] E2E テスト

### インフラ

- [ ] Docker Compose 設定
- [ ] 環境変数設定
- [ ] CI/CD パイプライン
- [ ] デプロイ

---

## 参考ドキュメント

- [DATABASE_DESIGN_MVP.md](./DATABASE_DESIGN_MVP.md) - MVP データベース設計
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) - 完全版データベース設計（将来の拡張用）
- [backend-go/migrations/README.md](../backend-go/migrations/README.md) - マイグレーション実行手順
- [backend-python/README.md](../backend-python/README.md) - AI サーバー仕様

---

## 次のアクション

1. **マイグレーション実行**

   ```bash
   cd backend-go
   migrate -database "${DATABASE_URL}" -path migrations up
   ```

2. **Backend-python クリーンアップ**

   ```bash
   cd backend-python
   rm -rf app/database/
   # config.py と requirements.txt を編集
   ```

3. **Backend-go ドメインモデル実装開始**
   ```bash
   cd backend-go/internal/domain/ai
   touch agent.go repository.go
   ```

どれから始めますか？ 🚀
