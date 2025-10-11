# BridgeSpeak データベース設計書（MVP 版）

## 📋 目次

1. [MVP 概要](#mvp-概要)
2. [システム構成](#システム構成)
3. [テーブル定義](#テーブル定義)
4. [マイグレーション順序](#マイグレーション順序)
5. [実装ガイド](#実装ガイド)

---

## MVP 概要

### 対象機能

**✅ 実装する機能**

1. **ユーザー登録・ログイン**（AWS Cognito）
2. **AI Agent 作成**
   - 名前、説明、アバター設定
   - 振る舞い選択（assistant / creative / analytical）
   - LLM モデル選択（gpt-4o / claude-3.5-sonnet / gemini-pro）
3. **チャット機能**
   - AI Agent との 1 対 1 チャット
   - メッセージ送受信
   - 会話履歴表示
   - AI 処理履歴の記録

**❌ MVP では実装しない機能**

- ユーザー間のメッセージング（友達機能）
- 既読管理
- グループチャット
- 複雑なペルソナ設定（別テーブル不要）
- 統計ダッシュボード
- プッシュ通知

### ユーザーフロー

```
1. ユーザー登録/ログイン（Cognito）
   ↓
2. AI Agent 作成
   - 名前: "マイアシスタント"
   - 振る舞い: assistant（親切で丁寧）
   - モデル: gpt-4o
   ↓
3. チャット画面
   - AI Agent とリアルタイムで会話
   - メッセージ履歴を表示
```

---

## システム構成

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
└────────┬────────┘
         │ HTTP/REST
         ↓
┌─────────────────────────┐
│   Backend-go            │ ← データ管理の単一窓口
│   (API Gateway)         │
│                         │
│  ┌─────────────────┐   │
│  │ User Service    │   │
│  │ AI Agent Svc    │   │
│  │ Chat Service    │   │
│  │ MCP Service     │   │
│  └─────────────────┘   │
└────────┬────────────────┘
         │
         ↓
┌─────────────────┐
│   PostgreSQL    │
│  (8テーブル)     │
└─────────────────┘
         ↑
         │ 内部 HTTP
         ↓
┌─────────────────┐
│ Backend-python  │ ← AI 処理専用
│ (AI Engine)     │   (DB アクセスなし)
└─────────────────┘
```

---

## テーブル定義

### MVP で使用する 8 テーブル

| #   | テーブル名               | 説明                       | 重要度        |
| --- | ------------------------ | -------------------------- | ------------- |
| 1   | `users`                  | ユーザー情報               | 🔴 必須       |
| 2   | `ai_agents`              | AI Agent（ペルソナ統合）   | 🔴 必須       |
| 3   | `conversations`          | 会話（ユーザー ↔ AI のみ） | 🔴 必須       |
| 4   | `messages`               | メッセージ                 | 🔴 必須       |
| 5   | `ai_chat_sessions`       | AI 処理履歴                | 🟡 推奨       |
| 6   | `ai_tool_usage`          | ツール使用履歴             | 🟡 推奨       |
| 7   | `mcp_servers`            | MCP サーバー設定           | 🟢 オプション |
| 8   | `mcp_server_credentials` | MCP 認証情報               | 🟢 オプション |

---

### 1. users（ユーザー）

**目的**: ユーザーの基本情報を管理

```sql
CREATE TABLE users (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- AWS Cognito連携
    cognito_user_id VARCHAR(255) UNIQUE NOT NULL,

    -- 基本情報
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,

    -- ステータス
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    -- active: アクティブ
    -- inactive: 非アクティブ
    -- deleted: 削除済み（ソフトデリート）

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP,

    -- 制約
    CONSTRAINT chk_users_status CHECK (status IN ('active', 'inactive', 'deleted'))
);

-- インデックス
CREATE INDEX idx_users_cognito_user_id ON users(cognito_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE status = 'active';

-- トリガー
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 2. ai_agents（AI Agent - ペルソナ統合版）

**目的**: ユーザーが作成した AI Agent の情報とペルソナ設定

**重要**: MVP では `ai_personas` テーブルを作らず、すべて `ai_agents` に統合

```sql
CREATE TABLE ai_agents (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 所有者（必須）
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- AI Agent 基本情報
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,

    -- === ペルソナ設定（統合） ===

    -- 振る舞いタイプ
    persona_type VARCHAR(50) NOT NULL DEFAULT 'assistant',
    -- assistant: 親切で丁寧なアシスタント
    -- creative: 創造的で発想豊かな対話
    -- analytical: 論理的で分析的な対話

    -- LLM 設定
    provider VARCHAR(50) NOT NULL DEFAULT 'openai',
    -- openai, anthropic, google
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
    temperature DECIMAL(3, 2) NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 2000,

    -- システムプロンプト（オプション）
    system_prompt TEXT,
    -- NULLの場合、persona_typeに基づいてBackend-goが自動生成

    -- ツール設定
    tools_enabled BOOLEAN DEFAULT true,
    -- trueの場合、基本ツール（日時、計算など）を利用可能

    -- === 終了 ===

    -- ステータス
    is_active BOOLEAN DEFAULT true,

    -- 統計情報
    message_count INTEGER DEFAULT 0,
    last_chat_at TIMESTAMP,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_persona_type CHECK (persona_type IN ('assistant', 'creative', 'analytical')),
    CONSTRAINT chk_provider CHECK (provider IN ('openai', 'anthropic', 'google')),
    CONSTRAINT chk_temperature CHECK (temperature >= 0 AND temperature <= 2),
    CONSTRAINT chk_max_tokens CHECK (max_tokens >= 100 AND max_tokens <= 8000)
);

-- インデックス
CREATE INDEX idx_ai_agents_user ON ai_agents(user_id, is_active);
CREATE INDEX idx_ai_agents_active ON ai_agents(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_agents_last_chat ON ai_agents(user_id, last_chat_at DESC NULLS LAST);

-- トリガー
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- デフォルトのシステムプロンプト（アプリケーション側で管理）
-- assistant: "あなたは親切で丁寧なアシスタントです。ユーザーの質問に分かりやすく答えてください。"
-- creative: "あなたは創造的で発想豊かなアシスタントです。新しいアイデアや視点を提供してください。"
-- analytical: "あなたは論理的で分析的なアシスタントです。データと事実に基づいて回答してください。"
```

---

### 3. conversations（会話 - シンプル版）

**目的**: ユーザーと AI Agent の会話を管理

**MVP の制約**: 常に `user ↔ ai_agent` の 1 対 1 会話のみ

```sql
CREATE TABLE conversations (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ユーザー（必須）
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- AI Agent（必須）
    ai_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

    -- 統計情報
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約：1ユーザー・1AI Agentにつき1つの会話
    CONSTRAINT unique_user_agent_conversation UNIQUE(user_id, ai_agent_id)
);

-- インデックス
CREATE INDEX idx_conversations_user ON conversations(user_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_agent ON conversations(ai_agent_id);

-- トリガー
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 4. messages（メッセージ）

**目的**: チャットメッセージを保存

```sql
CREATE TABLE messages (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 会話
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- 送信者タイプ
    sender_type VARCHAR(20) NOT NULL,
    -- user: ユーザー
    -- ai: AI Agent

    -- 送信者ID
    sender_id UUID NOT NULL,
    -- sender_type='user' なら users.id
    -- sender_type='ai' なら ai_agents.id

    -- メッセージ内容
    content TEXT NOT NULL,

    -- AI関連（sender_type='ai'の場合）
    ai_session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE SET NULL,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_sender_type CHECK (sender_type IN ('user', 'ai'))
);

-- インデックス
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX idx_messages_ai_session ON messages(ai_session_id);

-- メッセージ送信時にconversationsを更新
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET
        last_message_at = NEW.created_at,
        message_count = message_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;

    -- AI Agentのメッセージカウントも更新
    IF NEW.sender_type = 'ai' THEN
        UPDATE ai_agents
        SET
            message_count = message_count + 1,
            last_chat_at = NEW.created_at,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.sender_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();
```

---

### 5. ai_chat_sessions（AI 処理セッション）

**目的**: AI 処理の実行履歴を記録（分析・デバッグ用）

```sql
CREATE TABLE ai_chat_sessions (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 関連
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    ai_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

    -- AI設定（スナップショット）
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    persona VARCHAR(50) NOT NULL,
    temperature DECIMAL(3, 2) NOT NULL,

    -- トークン使用量
    tokens_prompt INTEGER,
    tokens_completion INTEGER,
    tokens_total INTEGER,

    -- パフォーマンス
    processing_time_ms INTEGER,
    tools_used INTEGER DEFAULT 0,

    -- ステータス
    status VARCHAR(50) NOT NULL DEFAULT 'processing',
    -- processing: 処理中
    -- completed: 完了
    -- failed: 失敗

    error_message TEXT,

    -- タイムスタンプ
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    -- 制約
    CONSTRAINT chk_session_status CHECK (status IN ('processing', 'completed', 'failed'))
);

-- インデックス
CREATE INDEX idx_ai_sessions_user ON ai_chat_sessions(user_id, started_at DESC);
CREATE INDEX idx_ai_sessions_conversation ON ai_chat_sessions(conversation_id);
CREATE INDEX idx_ai_sessions_agent ON ai_chat_sessions(ai_agent_id);
CREATE INDEX idx_ai_sessions_status ON ai_chat_sessions(status) WHERE status = 'processing';
```

---

### 6. ai_tool_usage（ツール使用履歴）

**目的**: AI が使用したツールの実行履歴

```sql
CREATE TABLE ai_tool_usage (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 関連
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,

    -- ツール情報
    tool_name VARCHAR(255) NOT NULL,
    tool_category VARCHAR(100) DEFAULT 'basic',
    -- basic: 基本ツール（日時、計算など）
    -- mcp: MCPツール

    -- 実行情報
    input_data JSONB NOT NULL,
    output_data TEXT,

    -- ステータス
    status VARCHAR(50) NOT NULL,
    -- completed: 完了
    -- failed: 失敗

    error_message TEXT,
    execution_time_ms INTEGER,

    -- タイムスタンプ
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_tool_status CHECK (status IN ('completed', 'failed'))
);

-- インデックス
CREATE INDEX idx_ai_tool_usage_session ON ai_tool_usage(session_id);
CREATE INDEX idx_ai_tool_usage_tool ON ai_tool_usage(tool_name);
CREATE INDEX idx_ai_tool_usage_executed ON ai_tool_usage(executed_at DESC);
```

---

### 7. mcp_servers（MCP サーバー設定 - オプション）

**目的**: ユーザーごとの MCP サーバー設定（高度な機能）

**MVP での扱い**: 初期は不要。後から追加可能

```sql
CREATE TABLE mcp_servers (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ユーザー
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- MCPサーバー情報
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_url VARCHAR(500) NOT NULL,

    -- ステータス
    enabled BOOLEAN DEFAULT true,

    -- 統計情報
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT unique_user_mcp_name UNIQUE(user_id, name)
);

-- インデックス
CREATE INDEX idx_mcp_servers_user ON mcp_servers(user_id, enabled);
CREATE INDEX idx_mcp_servers_enabled ON mcp_servers(enabled) WHERE enabled = true;

-- トリガー
CREATE TRIGGER update_mcp_servers_updated_at BEFORE UPDATE ON mcp_servers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 8. mcp_server_credentials（MCP 認証情報 - オプション）

**目的**: MCP サーバーの認証情報を暗号化して保存

```sql
CREATE TABLE mcp_server_credentials (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- MCPサーバー
    mcp_server_id UUID NOT NULL UNIQUE REFERENCES mcp_servers(id) ON DELETE CASCADE,

    -- 暗号化された認証情報
    encrypted_credentials TEXT NOT NULL,
    encryption_key_id VARCHAR(100) NOT NULL,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_mcp_credentials_server ON mcp_server_credentials(mcp_server_id);

-- トリガー
CREATE TRIGGER update_mcp_credentials_updated_at BEFORE UPDATE ON mcp_server_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## マイグレーション順序

### フェーズ 1: 基本機能（必須）

```
000001_create_users_table.up.sql              ← 既存
000002_create_ai_agents_table.up.sql           ← NEW（ペルソナ統合版）
000003_create_conversations_table.up.sql       ← NEW（シンプル版）
000004_create_messages_table.up.sql            ← NEW
```

### フェーズ 2: AI 処理履歴（推奨）

```
000005_create_ai_chat_sessions_table.up.sql    ← NEW
000006_create_ai_tool_usage_table.up.sql       ← NEW
```

### フェーズ 3: MCP 統合（オプション）

```
000007_create_mcp_servers_table.up.sql         ← 後回し
000008_create_mcp_credentials_table.up.sql     ← 後回し
```

---

## 実装ガイド

### 1. ユーザー登録フロー

```
Frontend → Backend-go:
  POST /api/v1/auth/signup
  {
    "email": "user@example.com",
    "password": "...",
    "display_name": "太郎"
  }

Backend-go:
  1. Cognitoにユーザー登録
  2. usersテーブルにレコード作成

  INSERT INTO users (cognito_user_id, email, display_name)
  VALUES (${cognito_id}, ${email}, ${display_name});
```

### 2. AI Agent 作成フロー

```
Frontend → Backend-go:
  POST /api/v1/ai-agents
  {
    "name": "マイアシスタント",
    "description": "日常業務をサポートするAI",
    "persona_type": "assistant",
    "provider": "openai",
    "model": "gpt-4o",
    "temperature": 0.7,
    "max_tokens": 2000
  }

Backend-go:
  INSERT INTO ai_agents (
    user_id,
    name,
    description,
    persona_type,
    provider,
    model,
    temperature,
    max_tokens
  ) VALUES (...);

  Response:
  {
    "id": "...",
    "name": "マイアシスタント",
    "persona_type": "assistant",
    "model": "gpt-4o"
  }
```

### 3. チャット開始フロー

```
Frontend → Backend-go:
  POST /api/v1/conversations
  {
    "ai_agent_id": "..."
  }

Backend-go:
  1. 既存の会話をチェック
  SELECT id FROM conversations
  WHERE user_id = ${user_id} AND ai_agent_id = ${ai_agent_id};

  2. なければ作成
  INSERT INTO conversations (user_id, ai_agent_id)
  VALUES (${user_id}, ${ai_agent_id})
  ON CONFLICT (user_id, ai_agent_id) DO NOTHING
  RETURNING id;

  Response:
  {
    "conversation_id": "...",
    "ai_agent": {...}
  }
```

### 4. メッセージ送信フロー

```
Frontend → Backend-go:
  POST /api/v1/chat/send
  {
    "conversation_id": "...",
    "message": "こんにちは"
  }

Backend-go:
  1. ユーザーメッセージを保存
  INSERT INTO messages (conversation_id, sender_type, sender_id, content)
  VALUES (${conv_id}, 'user', ${user_id}, ${message});

  2. 会話履歴を取得
  SELECT sender_type, content, created_at
  FROM messages
  WHERE conversation_id = ${conv_id}
  ORDER BY created_at DESC
  LIMIT 20;

  3. AI Agent設定を取得
  SELECT persona_type, provider, model, temperature, max_tokens, system_prompt
  FROM ai_agents
  WHERE id = ${ai_agent_id};

  4. Backend-pythonにリクエスト
  POST http://backend-python:8001/api/v1/chat
  {
    "message": "こんにちは",
    "conversation_history": [...],
    "agent_config": {
      "provider": "openai",
      "model": "gpt-4o",
      "persona": "assistant",
      "temperature": 0.7,
      "system_prompt": "あなたは親切で丁寧なアシスタントです..."
    }
  }

  5. AIレスポンスを受信
  {
    "response": "こんにちは！何かお手伝いできることはありますか？",
    "metadata": {
      "tokens_used": 45,
      "processing_time_ms": 850
    }
  }

  6. AIメッセージを保存
  INSERT INTO messages (conversation_id, sender_type, sender_id, content, ai_session_id)
  VALUES (${conv_id}, 'ai', ${ai_agent_id}, ${response}, ${session_id});

  7. AI処理履歴を記録
  INSERT INTO ai_chat_sessions (
    user_id, conversation_id, ai_agent_id, message_id,
    provider, model, persona, tokens_total, processing_time_ms, status
  ) VALUES (...);

  Response:
  {
    "message_id": "...",
    "content": "こんにちは！何かお手伝いできることはありますか？",
    "created_at": "2025-10-11T..."
  }
```

### 5. 会話履歴取得フロー

```
Frontend → Backend-go:
  GET /api/v1/conversations/:id/messages?limit=50

Backend-go:
  SELECT
    m.id,
    m.sender_type,
    m.sender_id,
    m.content,
    m.created_at,
    CASE
      WHEN m.sender_type = 'user' THEN u.display_name
      WHEN m.sender_type = 'ai' THEN a.name
    END as sender_name
  FROM messages m
  LEFT JOIN users u ON m.sender_type = 'user' AND m.sender_id = u.id
  LEFT JOIN ai_agents a ON m.sender_type = 'ai' AND m.sender_id = a.id
  WHERE m.conversation_id = ${conv_id}
  ORDER BY m.created_at DESC
  LIMIT ${limit};

  Response:
  {
    "messages": [
      {
        "id": "...",
        "sender_type": "ai",
        "sender_name": "マイアシスタント",
        "content": "...",
        "created_at": "..."
      },
      {
        "id": "...",
        "sender_type": "user",
        "sender_name": "太郎",
        "content": "...",
        "created_at": "..."
      }
    ]
  }
```

---

## ER 図（MVP 版）

```
┌──────────────┐
│    users     │
│  (ユーザー)   │
└──────┬───────┘
       │ 1:N
       ↓
┌──────────────┐
│  ai_agents   │ ← ペルソナ設定を統合
│ (AI Agent)   │
└──────┬───────┘
       │
       │ 1:N
       ↓
┌──────────────────┐
│  conversations   │ ← user ↔ ai_agent のみ
│   (会話)          │
└────────┬─────────┘
         │ 1:N
         ↓
┌──────────────────┐
│    messages      │
│  (メッセージ)     │
└────────┬─────────┘
         │ 1:1
         ↓
┌──────────────────────┐
│  ai_chat_sessions    │
│  (AI処理セッション)   │
└────────┬─────────────┘
         │ 1:N
         ↓
┌──────────────────────┐
│   ai_tool_usage      │
│  (ツール使用履歴)     │
└──────────────────────┘

※ mcp_servers と mcp_server_credentials は
  オプション（後から追加）
```

---

## データ量見積もり（MVP）

### 想定: 1,000 ユーザー × 3 ヶ月

| テーブル         | 想定レコード数               | ストレージ |
| ---------------- | ---------------------------- | ---------- |
| users            | 1,000                        | ~200KB     |
| ai_agents        | 2,000（1 ユーザー平均 2 個） | ~400KB     |
| conversations    | 2,000                        | ~400KB     |
| messages         | 100,000（1 会話平均 50 件）  | ~50MB      |
| ai_chat_sessions | 50,000                       | ~25MB      |
| ai_tool_usage    | 100,000                      | ~50MB      |

**合計**: 約 130MB（3 ヶ月運用）

---

## セキュリティ

### 1. アクセス制御

```sql
-- Backend-go用ロール（唯一のDBアクセス権限）
CREATE ROLE backend_go_user WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO backend_go_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO backend_go_user;
```

### 2. 行レベルセキュリティ（RLS）の検討

```sql
-- ユーザーは自分のAI Agentのみアクセス可能
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_agents_user_policy ON ai_agents
    FOR ALL
    TO backend_go_user
    USING (user_id = current_setting('app.current_user_id')::UUID);
```

---

## 次のステップ

### 実装順序

1. **マイグレーションファイル作成**（フェーズ 1: 4 ファイル）

   - `000002_create_ai_agents_table.up.sql`
   - `000003_create_conversations_table.up.sql`
   - `000004_create_messages_table.up.sql`

2. **Backend-go 実装**

   - ドメインモデル: `ai_agent`, `conversation`, `message`
   - リポジトリ: PostgreSQL 接続
   - ユースケース: AI Agent 作成、チャット送信
   - ハンドラー: REST API

3. **Backend-python クリーンアップ**

   - DB 接続コード削除
   - ステートレス API 化

4. **Frontend 実装**

   - AI Agent 作成画面
   - チャット画面
   - 会話履歴表示

5. **統合テスト**

---

## MVP 完成後の拡張

### フェーズ 2（将来）

- ユーザー間メッセージング（friendships）
- 既読管理（message_reads）
- グループチャット（groups, group_members）
- 高度なペルソナ設定（ai_personas テーブル復活）
- 統計ダッシュボード（llm_usage_stats）
- プッシュ通知

---

## 補足: ペルソナタイプとシステムプロンプト

Backend-go で管理する デフォルトシステムプロンプト：

```go
var DefaultSystemPrompts = map[string]string{
    "assistant": `あなたは親切で丁寧なアシスタントです。
ユーザーの質問に分かりやすく、丁寧に答えてください。
必要に応じて、ステップバイステップで説明してください。`,

    "creative": `あなたは創造的で発想豊かなアシスタントです。
ユーザーとの対話を通じて、新しいアイデアや視点を提供してください。
既成概念にとらわれず、自由な発想を大切にしてください。`,

    "analytical": `あなたは論理的で分析的なアシスタントです。
データと事実に基づいて回答し、根拠を明確に示してください。
複雑な問題は要素に分解し、体系的に分析してください。`,
}
```

ユーザーが `system_prompt` を指定した場合は、そちらを優先使用。
