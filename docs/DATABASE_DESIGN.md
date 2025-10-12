# BridgeSpeak データベース設計書

## 📋 目次

1. [概要](#概要)
2. [設計原則](#設計原則)
3. [ER 図](#er図)
4. [テーブル定義](#テーブル定義)
5. [インデックス戦略](#インデックス戦略)
6. [パーティショニング戦略](#パーティショニング戦略)
7. [マイグレーション戦略](#マイグレーション戦略)

---

## 概要

### システム構成

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
│  │ Chat Service    │   │
│  │ MCP Service     │   │
│  │ AI Proxy        │←──┼─┐
│  └─────────────────┘   │ │
└────────┬────────────────┘ │
         │                  │ HTTP (内部 API)
         ↓                  │
┌─────────────────┐        │
│   PostgreSQL    │        │
│  (Backend-go    │        │
│   のみアクセス)  │        │
└─────────────────┘        │
                           ↓
                 ┌──────────────────┐
                 │ Backend-python   │ ← AI 処理専用
                 │ (AI Engine)      │   (DB アクセスなし)
                 │                  │
                 │ • LLM 呼び出し    │
                 │ • ツール実行      │
                 │ • ストリーミング  │
                 └────────┬─────────┘
                          │
                          ↓
                 ┌──────────────────┐
                 │  MCP Servers     │
                 │  (外部ツール)     │
                 └──────────────────┘
```

### データベースアクセス方針

**重要: Backend-go のみが PostgreSQL にアクセスします**

| 領域             | 管理サービス   | 説明                                 |
| ---------------- | -------------- | ------------------------------------ |
| ユーザー管理     | Backend-go     | 認証、プロフィール、友達関係         |
| 会話・メッセージ | Backend-go     | チャット履歴、既読管理               |
| AI 処理履歴      | Backend-go     | AI セッション、ツール使用履歴の記録  |
| MCP 設定         | Backend-go     | MCP サーバー設定、認証情報           |
| AI 処理実行      | Backend-python | LLM 統合、ツール実行（ステートレス） |

**Backend-python の役割:**

- ✅ LLM API の呼び出し（OpenAI、Anthropic、Google）
- ✅ LangChain Agent の実行
- ✅ MCP ツールの動的実行
- ✅ ストリーミングレスポンス生成
- ❌ データベースアクセス（なし）

---

## 設計原則

### 1. 単一データアクセスポイント

- **Backend-go のみ**が PostgreSQL にアクセス
- データ整合性の保証とトランザクション管理の一元化
- Backend-python はステートレスな AI 処理エンジンとして機能

### 2. パフォーマンス最適化

- 適切なインデックス設計
- 大量データを想定したパーティショニング
- キャッシュ戦略（Redis）との連携

### 3. セキュリティ

- 機密情報の暗号化（API キー、トークン）
- 監査ログの記録
- ソフトデリート対応

### 4. スケーラビリティ

- 将来的な機能拡張を考慮
- JSONB 型の活用（柔軟なスキーマ）
- 水平分割可能な設計

---

## ER 図

```
┌─────────────┐
│   users     │ 1:N ┌──────────────────┐
│  (ユーザー)  │─────│   friendships    │
└─────────────┘     │   (友達関係)      │
       │            └──────────────────┘
       │ 1:N
       ↓
┌─────────────────┐ 1:N ┌──────────────────┐
│  conversations  │─────│    messages      │
│   (会話)         │     │   (メッセージ)     │
└─────────────────┘     └──────────────────┘
       │                        │ 1:N
       │                        ↓
       │                 ┌──────────────────┐
       │                 │  message_reads   │
       │                 │   (既読管理)      │
       │                 └──────────────────┘
       │
       │ 1:N
       ↓
┌─────────────────────┐
│  ai_chat_sessions   │ 1:N ┌──────────────────┐
│  (AI処理セッション)   │─────│  ai_tool_usage   │
└─────────────────────┘     │  (ツール使用)     │
                            └──────────────────┘

┌─────────────┐ 1:N ┌──────────────────────┐
│   users     │─────│    mcp_servers       │
└─────────────┘     │  (MCPサーバー設定)    │
                    └──────────────────────┘
                            │ 1:1
                            ↓
                    ┌──────────────────────────┐
                    │ mcp_server_credentials   │
                    │  (MCP認証情報・暗号化)    │
                    └──────────────────────────┘

┌─────────────┐
│ ai_agents   │ 1:N ┌──────────────────┐
│ (AI分身)     │─────│  ai_personas     │
└─────────────┘     │  (ペルソナ設定)   │
                    └──────────────────┘

┌─────────────┐ 1:N ┌──────────────────┐
│   users     │─────│     groups       │
└─────────────┘     │   (グループ)      │
                    └──────────────────┘
                            │ 1:N
                            ↓
                    ┌──────────────────┐
                    │  group_members   │
                    │ (グループメンバー) │
                    └──────────────────┘
```

---

## テーブル定義

### 1. ユーザー管理

#### 1.1 users（ユーザー）

**目的**: ユーザーの基本情報を管理（Cognito 連携）

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
    bio TEXT,

    -- ステータス
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    -- active: アクティブ
    -- inactive: 非アクティブ
    -- suspended: 停止中
    -- deleted: 削除済み（ソフトデリート）

    -- 設定
    preferences JSONB DEFAULT '{}'::JSONB,
    -- 例: {"theme": "dark", "language": "ja", "notifications": true}

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP,
    deleted_at TIMESTAMP,

    -- 制約
    CONSTRAINT chk_users_status CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'))
);

-- インデックス
CREATE INDEX idx_users_cognito_user_id ON users(cognito_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE status != 'deleted';
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);
CREATE INDEX idx_users_preferences ON users USING GIN(preferences);

-- トリガー
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. AI 関連

#### 2.1 ai_agents（AI エージェント）

**目的**: AI 分身の基本情報を管理

```sql
CREATE TABLE ai_agents (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- AI情報
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,

    -- 公開設定
    is_public BOOLEAN DEFAULT true,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- 統計情報
    usage_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3, 2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_rating_range CHECK (rating_average >= 0 AND rating_average <= 5)
);

-- インデックス
CREATE INDEX idx_ai_agents_is_public ON ai_agents(is_public) WHERE is_public = true;
CREATE INDEX idx_ai_agents_creator ON ai_agents(creator_id);
CREATE INDEX idx_ai_agents_rating ON ai_agents(rating_average DESC, rating_count DESC);

-- トリガー
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 2.2 ai_personas（AI ペルソナ設定）

**目的**: AI エージェントのペルソナ設定を管理

```sql
CREATE TABLE ai_personas (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 関連
    ai_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

    -- ペルソナ設定
    persona_type VARCHAR(50) NOT NULL,
    -- assistant: 親切で丁寧
    -- creative: 創造的
    -- analytical: 分析的
    -- concise: 簡潔
    -- custom: カスタム

    -- LLM設定
    provider VARCHAR(50) NOT NULL DEFAULT 'openai',
    -- openai, anthropic, google
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
    temperature DECIMAL(3, 2) NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 2000,

    -- カスタムプロンプト
    system_prompt TEXT,

    -- ツール設定
    allowed_tools TEXT[], -- 許可されたツール名の配列
    include_basic_tools BOOLEAN DEFAULT true,

    -- バージョン管理
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_persona_type CHECK (persona_type IN ('assistant', 'creative', 'analytical', 'concise', 'custom')),
    CONSTRAINT chk_provider CHECK (provider IN ('openai', 'anthropic', 'google')),
    CONSTRAINT chk_temperature CHECK (temperature >= 0 AND temperature <= 2),
    CONSTRAINT chk_max_tokens CHECK (max_tokens >= 1 AND max_tokens <= 8000)
);

-- インデックス
CREATE INDEX idx_ai_personas_agent ON ai_personas(ai_agent_id);
CREATE INDEX idx_ai_personas_active ON ai_personas(ai_agent_id, is_active) WHERE is_active = true;

-- トリガー
CREATE TRIGGER update_ai_personas_updated_at BEFORE UPDATE ON ai_personas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. 友達関係

#### 3.1 friendships（友達関係）

**目的**: ユーザー間およびユーザーと AI 間の関係を管理

```sql
CREATE TABLE friendships (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ユーザー
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 友達（ポリモーフィック）
    friend_type VARCHAR(20) NOT NULL,
    -- human: 人間ユーザー
    -- ai: エージェント
    friend_id UUID NOT NULL,

    -- ステータス
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- pending: 承認待ち（人間同士のみ）
    -- accepted: 承認済み
    -- blocked: ブロック

    -- カスタム設定
    nickname VARCHAR(255), -- 友達に付けたニックネーム
    is_favorite BOOLEAN DEFAULT false,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_friend_type CHECK (friend_type IN ('human', 'ai')),
    CONSTRAINT chk_friendship_status CHECK (status IN ('pending', 'accepted', 'blocked')),
    CONSTRAINT unique_friendship UNIQUE(user_id, friend_type, friend_id)
);

-- インデックス
CREATE INDEX idx_friendships_user ON friendships(user_id, status);
CREATE INDEX idx_friendships_friend ON friendships(friend_type, friend_id);
CREATE INDEX idx_friendships_favorite ON friendships(user_id, is_favorite) WHERE is_favorite = true;

-- トリガー
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. 会話・メッセージ

#### 4.1 conversations（会話）

**目的**: チャット会話のメタデータを管理

```sql
CREATE TABLE conversations (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 会話タイプ
    conversation_type VARCHAR(20) NOT NULL,
    -- direct: 1対1
    -- group: グループ

    -- 参加者1（ポリモーフィック）
    participant1_type VARCHAR(20) NOT NULL,
    participant1_id UUID NOT NULL,

    -- 参加者2（directの場合のみ）
    participant2_type VARCHAR(20),
    participant2_id UUID,

    -- グループ情報（groupの場合のみ）
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,

    -- 統計情報
    message_count INTEGER DEFAULT 0,

    -- タイムスタンプ
    last_message_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_conversation_type CHECK (conversation_type IN ('direct', 'group')),
    CONSTRAINT chk_participant_type CHECK (
        participant1_type IN ('human', 'ai') AND
        (participant2_type IS NULL OR participant2_type IN ('human', 'ai'))
    ),
    CONSTRAINT chk_direct_participants CHECK (
        (conversation_type = 'direct' AND participant2_type IS NOT NULL AND participant2_id IS NOT NULL AND group_id IS NULL) OR
        (conversation_type = 'group' AND participant2_type IS NULL AND participant2_id IS NULL AND group_id IS NOT NULL)
    )
);

-- インデックス
CREATE INDEX idx_conversations_participant1 ON conversations(participant1_type, participant1_id);
CREATE INDEX idx_conversations_participant2 ON conversations(participant2_type, participant2_id);
CREATE INDEX idx_conversations_group ON conversations(group_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_type ON conversations(conversation_type);

-- ユニーク制約（directの場合、同じペアの会話は1つのみ）
CREATE UNIQUE INDEX unique_direct_conversation ON conversations(
    LEAST(participant1_type, participant2_type),
    LEAST(participant1_id, participant2_id),
    GREATEST(participant1_type, participant2_type),
    GREATEST(participant1_id, participant2_id)
) WHERE conversation_type = 'direct';

-- トリガー
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 4.2 messages（メッセージ）

**目的**: チャットメッセージを保存

```sql
CREATE TABLE messages (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 会話
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- 送信者（ポリモーフィック）
    sender_type VARCHAR(20) NOT NULL,
    sender_id UUID NOT NULL,

    -- メッセージ内容
    content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text',
    -- text: テキスト
    -- image: 画像
    -- file: ファイル
    -- system: システムメッセージ

    -- AI関連（sender_type='ai'の場合）
    ai_session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE SET NULL,

    -- メタデータ
    metadata JSONB DEFAULT '{}'::JSONB,
    -- 例: {"edited": true, "reply_to": "message_id", "attachments": [...]}

    -- ステータス
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_sender_type CHECK (sender_type IN ('human', 'ai')),
    CONSTRAINT chk_message_type CHECK (message_type IN ('text', 'image', 'file', 'system'))
);

-- インデックス
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX idx_messages_ai_session ON messages(ai_session_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_metadata ON messages USING GIN(metadata);

-- パーティショニング（将来的に実装）
-- CREATE TABLE messages_2024_01 PARTITION OF messages
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- トリガー
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();
```

#### 4.3 message_reads（既読管理）

**目的**: メッセージの既読状態を追跡

```sql
CREATE TABLE message_reads (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- メッセージ
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

    -- ユーザー
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- タイムスタンプ
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT unique_message_read UNIQUE(message_id, user_id)
);

-- インデックス
CREATE INDEX idx_message_reads_message ON message_reads(message_id);
CREATE INDEX idx_message_reads_user ON message_reads(user_id, read_at DESC);
```

### 5. MCP 統合

#### 5.1 mcp_servers（MCP サーバー設定）

**目的**: ユーザーごとの MCP サーバー設定を管理

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

    -- 認証設定
    requires_auth BOOLEAN DEFAULT false,
    auth_type VARCHAR(50),
    -- bearer: Bearer Token
    -- api_key: API Key
    -- oauth: OAuth
    -- basic: Basic Auth

    -- ステータス
    enabled BOOLEAN DEFAULT true,

    -- カスタムヘッダー
    custom_headers JSONB DEFAULT '{}'::JSONB,

    -- 統計情報
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error_at TIMESTAMP,
    last_error_message TEXT,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_auth_type CHECK (auth_type IN ('bearer', 'api_key', 'oauth', 'basic', NULL)),
    CONSTRAINT unique_user_mcp_name UNIQUE(user_id, name)
);

-- インデックス
CREATE INDEX idx_mcp_servers_user ON mcp_servers(user_id, enabled);
CREATE INDEX idx_mcp_servers_enabled ON mcp_servers(enabled) WHERE enabled = true;
CREATE INDEX idx_mcp_servers_last_used ON mcp_servers(last_used_at DESC NULLS LAST);

-- トリガー
CREATE TRIGGER update_mcp_servers_updated_at BEFORE UPDATE ON mcp_servers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 5.2 mcp_server_credentials（MCP 認証情報）

**目的**: MCP サーバーの認証情報を暗号化して保存

```sql
CREATE TABLE mcp_server_credentials (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- MCPサーバー
    mcp_server_id UUID NOT NULL UNIQUE REFERENCES mcp_servers(id) ON DELETE CASCADE,

    -- 暗号化された認証情報
    encrypted_credentials TEXT NOT NULL,
    -- AES-256で暗号化されたJSONデータ
    -- 例: {"api_key": "...", "token": "...", "client_id": "...", "client_secret": "..."}

    -- 暗号化メタデータ
    encryption_key_id VARCHAR(100) NOT NULL,
    encryption_algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- トークン有効期限（OAuth等）
    expires_at TIMESTAMP
);

-- インデックス
CREATE INDEX idx_mcp_credentials_server ON mcp_server_credentials(mcp_server_id);
CREATE INDEX idx_mcp_credentials_expires ON mcp_server_credentials(expires_at) WHERE expires_at IS NOT NULL;

-- トリガー
CREATE TRIGGER update_mcp_credentials_updated_at BEFORE UPDATE ON mcp_server_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 6. AI 処理履歴

#### 6.1 ai_chat_sessions（AI 処理セッション）

**目的**: AI 処理の実行セッションを記録

```sql
CREATE TABLE ai_chat_sessions (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 関連
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

    -- AI設定
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    persona VARCHAR(50) NOT NULL,
    temperature DECIMAL(3, 2) NOT NULL,
    max_tokens INTEGER NOT NULL,

    -- 実行情報
    completion_mode VARCHAR(50) NOT NULL,
    -- auto, tools_required, completion_only

    -- トークン使用量
    tokens_prompt INTEGER,
    tokens_completion INTEGER,
    tokens_total INTEGER,

    -- パフォーマンス
    processing_time_ms INTEGER,
    tools_available INTEGER DEFAULT 0,
    tools_used INTEGER DEFAULT 0,

    -- ステータス
    status VARCHAR(50) NOT NULL,
    -- processing: 処理中
    -- completed: 完了
    -- failed: 失敗
    -- cancelled: キャンセル

    error_code VARCHAR(100),
    error_message TEXT,

    -- タイムスタンプ
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    -- 制約
    CONSTRAINT chk_session_status CHECK (status IN ('processing', 'completed', 'failed', 'cancelled'))
);

-- インデックス
CREATE INDEX idx_ai_sessions_user ON ai_chat_sessions(user_id, started_at DESC);
CREATE INDEX idx_ai_sessions_conversation ON ai_chat_sessions(conversation_id);
CREATE INDEX idx_ai_sessions_status ON ai_chat_sessions(status) WHERE status = 'processing';
CREATE INDEX idx_ai_sessions_completed ON ai_chat_sessions(completed_at DESC) WHERE status = 'completed';

-- パーティショニング（月次）推奨
```

#### 6.2 ai_tool_usage（ツール使用履歴）

**目的**: AI が使用したツールの実行履歴を記録

```sql
CREATE TABLE ai_tool_usage (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 関連
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,

    -- ツール情報
    tool_id VARCHAR(255) NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    tool_category VARCHAR(100),
    -- basic: 基本ツール
    -- mcp: MCPツール

    -- MCPツールの場合
    mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE SET NULL,

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
    CONSTRAINT chk_tool_status CHECK (status IN ('completed', 'failed')),
    CONSTRAINT chk_tool_category CHECK (tool_category IN ('basic', 'mcp', NULL))
);

-- インデックス
CREATE INDEX idx_ai_tool_usage_session ON ai_tool_usage(session_id);
CREATE INDEX idx_ai_tool_usage_tool ON ai_tool_usage(tool_id);
CREATE INDEX idx_ai_tool_usage_mcp ON ai_tool_usage(mcp_server_id) WHERE mcp_server_id IS NOT NULL;
CREATE INDEX idx_ai_tool_usage_executed ON ai_tool_usage(executed_at DESC);
CREATE INDEX idx_ai_tool_usage_category ON ai_tool_usage(tool_category);
```

#### 6.3 llm_usage_stats（LLM 使用統計）

**目的**: ユーザーごとの LLM 使用統計を集計（日次）

```sql
CREATE TABLE llm_usage_stats (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 集計対象
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- プロバイダー別統計
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,

    -- 使用量
    request_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,

    -- ツール使用
    tool_usage_count INTEGER DEFAULT 0,

    -- エラー
    error_count INTEGER DEFAULT 0,

    -- パフォーマンス
    avg_processing_time_ms INTEGER,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT unique_daily_stats UNIQUE(user_id, date, provider, model)
);

-- インデックス
CREATE INDEX idx_llm_stats_user_date ON llm_usage_stats(user_id, date DESC);
CREATE INDEX idx_llm_stats_date ON llm_usage_stats(date DESC);
CREATE INDEX idx_llm_stats_provider ON llm_usage_stats(provider, model);

-- トリガー
CREATE TRIGGER update_llm_stats_updated_at BEFORE UPDATE ON llm_usage_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 7. グループチャット

#### 7.1 groups（グループ）

**目的**: グループチャットの情報を管理

```sql
CREATE TABLE groups (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- グループ情報
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,

    -- 作成者
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- 設定
    is_public BOOLEAN DEFAULT false,
    max_members INTEGER DEFAULT 100,

    -- ステータス
    is_active BOOLEAN DEFAULT true,

    -- 統計
    member_count INTEGER DEFAULT 0,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_max_members CHECK (max_members >= 2 AND max_members <= 1000)
);

-- インデックス
CREATE INDEX idx_groups_creator ON groups(creator_id);
CREATE INDEX idx_groups_public ON groups(is_public) WHERE is_public = true;
CREATE INDEX idx_groups_active ON groups(is_active) WHERE is_active = true;

-- トリガー
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 7.2 group_members（グループメンバー）

**目的**: グループのメンバー構成を管理

```sql
CREATE TABLE group_members (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- グループ
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

    -- メンバー（ポリモーフィック）
    member_type VARCHAR(20) NOT NULL,
    -- human: 人間ユーザー
    -- ai: エージェント
    member_id UUID NOT NULL,

    -- ロール
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    -- admin: 管理者
    -- moderator: モデレーター
    -- member: 一般メンバー

    -- 権限設定
    can_invite BOOLEAN DEFAULT false,
    can_remove BOOLEAN DEFAULT false,

    -- タイムスタンプ
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_member_type CHECK (member_type IN ('human', 'ai')),
    CONSTRAINT chk_member_role CHECK (role IN ('admin', 'moderator', 'member')),
    CONSTRAINT unique_group_member UNIQUE(group_id, member_type, member_id)
);

-- インデックス
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_member ON group_members(member_type, member_id);
CREATE INDEX idx_group_members_role ON group_members(group_id, role);

-- メンバー追加時にgroupsのmember_countを更新
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE groups SET member_count = member_count - 1 WHERE id = OLD.group_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_member_count
AFTER INSERT OR DELETE ON group_members
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();
```

---

## インデックス戦略

### 1. 基本方針

| インデックスタイプ | 用途           | 例                                   |
| ------------------ | -------------- | ------------------------------------ |
| B-Tree             | 等価・範囲検索 | PRIMARY KEY, UNIQUE, 日付範囲        |
| GIN                | JSONB, 配列    | preferences, metadata, allowed_tools |
| Partial Index      | 条件付き       | WHERE enabled = true                 |
| Composite Index    | 複合条件       | (user_id, created_at DESC)           |

### 2. パフォーマンス最適化

```sql
-- よく使われるクエリ用の複合インデックス
CREATE INDEX idx_messages_conversation_created
ON messages(conversation_id, created_at DESC)
INCLUDE (content, sender_type);

-- カバリングインデックス（INDEX-ONLY SCAN）
CREATE INDEX idx_ai_sessions_user_stats
ON ai_chat_sessions(user_id, started_at DESC)
INCLUDE (tokens_total, processing_time_ms)
WHERE status = 'completed';
```

---

## パーティショニング戦略

### 1. 対象テーブル

大量データが予想されるテーブルを月次パーティション：

```sql
-- messagesテーブルのパーティショニング例
CREATE TABLE messages (
    -- ... 既存のカラム定義 ...
) PARTITION BY RANGE (created_at);

CREATE TABLE messages_2024_01 PARTITION OF messages
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE messages_2024_02 PARTITION OF messages
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 自動パーティション作成（pg_partman等を使用推奨）
```

### 2. 推奨パーティショニング対象

- `messages` - 月次
- `ai_chat_sessions` - 月次
- `ai_tool_usage` - 月次
- `message_reads` - 月次

---

## マイグレーション戦略

### 1. マイグレーションファイル命名規則

```
000001_create_users_table.up.sql
000001_create_users_table.down.sql
000002_create_ai_agents.up.sql
000002_create_ai_agents.down.sql
...
```

### 2. 実装順序

1. **フェーズ 1: 基本機能** (既存)

   - `users`

2. **フェーズ 2: AI・友達機能**

   - `ai_agents`
   - `ai_personas`
   - `friendships`

3. **フェーズ 3: 会話・メッセージ**

   - `conversations`
   - `messages`
   - `message_reads`

4. **フェーズ 4: MCP 統合**

   - `mcp_servers`
   - `mcp_server_credentials`

5. **フェーズ 5: AI 処理履歴**

   - `ai_chat_sessions`
   - `ai_tool_usage`
   - `llm_usage_stats`

6. **フェーズ 6: グループチャット**
   - `groups`
   - `group_members`

### 3. ロールバック戦略

各マイグレーションには必ず`.down.sql`を用意：

```sql
-- 依存関係の逆順で削除
DROP TRIGGER IF EXISTS ...;
DROP INDEX IF EXISTS ...;
DROP TABLE IF EXISTS ... CASCADE;
```

---

## データ量見積もり

### 想定ユーザー数: 10,000 人

| テーブル         | 1 ユーザーあたり | 総レコード数 | ストレージ見積 |
| ---------------- | ---------------- | ------------ | -------------- |
| users            | 1                | 10,000       | ~2MB           |
| ai_agents        | -                | 100          | ~50KB          |
| ai_personas      | -                | 200          | ~100KB         |
| friendships      | 20               | 200,000      | ~40MB          |
| conversations    | 30               | 300,000      | ~60MB          |
| messages         | 1,000/月         | 10M/月       | ~5GB/月        |
| mcp_servers      | 3                | 30,000       | ~10MB          |
| ai_chat_sessions | 100/月           | 1M/月        | ~500MB/月      |
| ai_tool_usage    | 500/月           | 5M/月        | ~2GB/月        |

**合計（1 年）**: 約 90GB

---

## セキュリティ考慮事項

### 1. 暗号化

- `mcp_server_credentials.encrypted_credentials`: AES-256-GCM
- SSL/TLS 通信（PostgreSQL）
- バックアップの暗号化

### 2. アクセス制御

```sql
-- Backend-go用ロール（唯一のDBアクセス権限）
CREATE ROLE backend_go_user WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO backend_go_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO backend_go_user;

-- Backend-pythonはDBアクセス権限なし（接続情報も不要）
-- AIサービスとして完全にステートレスに動作
```

**セキュリティ上の利点:**

- ✅ DB 接続情報を持つサービスは Backend-go のみ
- ✅ 攻撃対象領域の削減（Backend-python が侵害されても DB は安全）
- ✅ 最小権限の原則に準拠

### 3. 監査ログ

```sql
-- 監査ログテーブル（オプション）
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    user_id UUID,
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## バックアップ戦略

### 1. フルバックアップ

- 頻度: 毎日
- 保持期間: 30 日
- ツール: `pg_dump`

### 2. 増分バックアップ

- 頻度: 1 時間ごと
- 保持期間: 7 日
- ツール: WAL archiving

### 3. ポイントインタイムリカバリ（PITR）

- WAL アーカイブ保持: 7 日
- S3 へのアーカイブ推奨

---

## モニタリング指標

### 1. パフォーマンス

- スロークエリ（> 1 秒）
- インデックス使用率
- テーブルサイズ増加率

### 2. リソース

- CPU 使用率
- メモリ使用率
- ディスク使用率
- 接続数

### 3. ビジネス指標

- DAU/MAU
- メッセージ送信数
- AI 処理数
- ツール使用数

---

## 付録

### A. 共通関数

```sql
-- updated_at自動更新関数（既存）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### B. データクリーンアップ

```sql
-- 古いメッセージの削除（90日以上前）
DELETE FROM messages
WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
  AND is_deleted = true;

-- 古いAI処理履歴の削除（180日以上前）
DELETE FROM ai_chat_sessions
WHERE completed_at < CURRENT_TIMESTAMP - INTERVAL '180 days';
```

---

## Backend-go と Backend-python の統合パターン

### 基本的な通信フロー

#### 1. チャット送信（ストリーミング）

```go
// Backend-go: internal/handler/http/chat_handler.go
func (h *ChatHandler) SendMessage(c *gin.Context) {
    var req dto.SendMessageRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // 1. メッセージをDBに保存
    message, err := h.chatUsecase.SaveMessage(c.Request.Context(), req)
    if err != nil {
        c.JSON(500, gin.H{"error": "Failed to save message"})
        return
    }

    // 2. 会話履歴を取得
    history, err := h.chatUsecase.GetConversationHistory(c.Request.Context(), req.ConversationID, 20)
    if err != nil {
        c.JSON(500, gin.H{"error": "Failed to get history"})
        return
    }

    // 3. AIペルソナ設定を取得
    persona, err := h.aiUsecase.GetPersona(c.Request.Context(), req.AIAgentID)
    if err != nil {
        c.JSON(500, gin.H{"error": "Failed to get persona"})
        return
    }

    // 4. MCP設定を取得（復号化）
    mcpServers, err := h.mcpUsecase.GetEnabledServers(c.Request.Context(), req.UserID)
    if err != nil {
        c.JSON(500, gin.H{"error": "Failed to get MCP servers"})
        return
    }

    // 5. Backend-pythonにリクエスト
    aiRequest := external.AIRequest{
        Message:             req.Content,
        ConversationHistory: history,
        AgentConfig: external.AgentConfig{
            Provider:    persona.Provider,
            Model:       persona.Model,
            Persona:     persona.PersonaType,
            Temperature: persona.Temperature,
            MaxTokens:   persona.MaxTokens,
        },
        MCPServers: mcpServers,
    }

    // 6. ストリーミングレスポンスを処理
    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    c.Header("Connection", "keep-alive")

    sessionID := uuid.New()
    err = h.aiClient.StreamChat(c.Request.Context(), aiRequest, func(chunk external.AIStreamChunk) error {
        // SSEとしてクライアントに送信
        c.SSEvent("message", chunk)
        c.Writer.Flush()
        return nil
    })

    if err != nil {
        c.SSEvent("error", gin.H{"message": err.Error()})
        return
    }

    // 7. AI処理完了後、レスポンスを取得
    aiResponse, err := h.aiClient.GetFinalResponse(c.Request.Context(), sessionID)
    if err != nil {
        c.JSON(500, gin.H{"error": "Failed to get AI response"})
        return
    }

    // 8. AIレスポンスをDBに保存
    aiMessage, err := h.chatUsecase.SaveAIMessage(c.Request.Context(), dto.SaveAIMessageRequest{
        ConversationID: req.ConversationID,
        Content:        aiResponse.Response,
        Metadata:       aiResponse.Metadata,
    })
    if err != nil {
        c.JSON(500, gin.H{"error": "Failed to save AI message"})
        return
    }

    // 9. AI処理履歴を記録
    err = h.aiUsecase.SaveChatSession(c.Request.Context(), dto.SaveChatSessionRequest{
        UserID:          req.UserID,
        ConversationID:  req.ConversationID,
        MessageID:       aiMessage.ID,
        Provider:        aiResponse.Metadata.Provider,
        Model:           aiResponse.Metadata.Model,
        TokensUsed:      aiResponse.Metadata.TokensUsed,
        ProcessingTimeMS: aiResponse.Metadata.ProcessingTimeMS,
        ToolCalls:       aiResponse.ToolCalls,
    })
    if err != nil {
        // ログに記録するが、エラーは返さない
        logger.Error("Failed to save chat session", zap.Error(err))
    }
}
```

#### 2. Backend-python との通信クライアント

```go
// Backend-go: internal/infrastructure/external/ai_client.go
package external

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

type AIClient struct {
    baseURL    string
    httpClient *http.Client
}

type AIRequest struct {
    Message             string                 `json:"message"`
    ConversationHistory []ConversationMessage  `json:"conversation_history"`
    AgentConfig         AgentConfig            `json:"agent_config"`
    MCPServers          []MCPServerConfig      `json:"mcp_servers"`
}

type AIResponse struct {
    Response  string                 `json:"response"`
    ToolCalls []ToolCall             `json:"tool_calls"`
    Metadata  AIMetadata             `json:"metadata"`
}

func (c *AIClient) Chat(ctx context.Context, req AIRequest) (*AIResponse, error) {
    body, err := json.Marshal(req)
    if err != nil {
        return nil, err
    }

    httpReq, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/api/v1/chat", bytes.NewReader(body))
    if err != nil {
        return nil, err
    }
    httpReq.Header.Set("Content-Type", "application/json")

    resp, err := c.httpClient.Do(httpReq)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        bodyBytes, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("AI service error: %s", string(bodyBytes))
    }

    var aiResp AIResponse
    if err := json.NewDecoder(resp.Body).Decode(&aiResp); err != nil {
        return nil, err
    }

    return &aiResp, nil
}

func (c *AIClient) StreamChat(ctx context.Context, req AIRequest, onChunk func(AIStreamChunk) error) error {
    body, err := json.Marshal(req)
    if err != nil {
        return err
    }

    httpReq, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/api/v1/chat/stream", bytes.NewReader(body))
    if err != nil {
        return err
    }
    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.Header.Set("Accept", "text/event-stream")

    resp, err := c.httpClient.Do(httpReq)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        bodyBytes, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("AI service error: %s", string(bodyBytes))
    }

    // SSEを解析
    reader := NewSSEReader(resp.Body)
    for {
        event, err := reader.ReadEvent()
        if err == io.EOF {
            break
        }
        if err != nil {
            return err
        }

        var chunk AIStreamChunk
        if err := json.Unmarshal([]byte(event.Data), &chunk); err != nil {
            return err
        }

        if err := onChunk(chunk); err != nil {
            return err
        }
    }

    return nil
}
```

#### 3. Backend-python 側の実装（DB アクセスなし）

```python
# backend-python/app/api/v1/chat.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.request import ChatRequest
from app.models.response import ChatResponse
from app.services.agent_service import AgentService
import json

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    チャット処理（非ストリーミング）

    Backend-goから必要なデータを全て受け取る:
    - message: ユーザーメッセージ
    - conversation_history: 会話履歴（Backend-goがDBから取得）
    - agent_config: AIペルソナ設定（Backend-goがDBから取得）
    - mcp_servers: MCPサーバー設定（Backend-goがDBから取得・復号化）
    """
    try:
        agent_service = AgentService()

        # AI処理を実行（DBアクセスなし）
        result = await agent_service.execute_chat(
            message=request.message,
            conversation_history=request.conversation_history,
            agent_config=request.agent_config,
            mcp_servers=request.mcp_servers
        )

        return ChatResponse(
            response=result.response,
            tool_calls=result.tool_calls,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    チャット処理（ストリーミング）
    """
    async def generate():
        try:
            agent_service = AgentService()

            # ストリーミング処理
            async for chunk in agent_service.execute_chat_stream(
                message=request.message,
                conversation_history=request.conversation_history,
                agent_config=request.agent_config,
                mcp_servers=request.mcp_servers
            ):
                # SSE形式で返す
                yield f"data: {json.dumps(chunk.dict())}\n\n"

        except Exception as e:
            error_data = {"error": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

### データフロー図

```
┌──────────┐
│ Frontend │
└─────┬────┘
      │ 1. POST /api/v1/chat/send
      │    {"conversation_id": "...", "message": "..."}
      ↓
┌─────────────────────────────────────────────┐
│              Backend-go                     │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ 2. メッセージをDB保存                 │  │
│  │    INSERT INTO messages              │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ 3. 会話履歴を取得                     │  │
│  │    SELECT * FROM messages            │  │
│  │    WHERE conversation_id = ...       │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ 4. AI設定を取得                       │  │
│  │    SELECT * FROM ai_personas         │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ 5. MCP設定を取得・復号化              │  │
│  │    SELECT * FROM mcp_servers         │  │
│  │    復号化: encrypted_credentials     │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ 6. Backend-pythonに送信               │──┼─┐
│  │    POST /api/v1/chat                 │  │ │
│  │    {                                 │  │ │
│  │      message: "...",                 │  │ │
│  │      conversation_history: [...],    │  │ │
│  │      agent_config: {...},            │  │ │
│  │      mcp_servers: [...]              │  │ │
│  │    }                                 │  │ │
│  └─────────────────────────────────────┘  │ │
└─────────────────────────────────────────────┘ │
                                                │
                                                ↓
                              ┌─────────────────────────────┐
                              │    Backend-python           │
                              │    (DB アクセスなし)         │
                              │                             │
                              │  ┌───────────────────────┐ │
                              │  │ 7. LLM API 呼び出し    │ │
                              │  │    (OpenAI/Anthropic) │ │
                              │  └───────────────────────┘ │
                              │                             │
                              │  ┌───────────────────────┐ │
                              │  │ 8. ツール実行          │ │
                              │  │    (Basic/MCP)        │ │
                              │  └───────────────────────┘ │
                              │                             │
                              │  ┌───────────────────────┐ │
                              │  │ 9. レスポンス生成      │ │
                              │  │    {                  │ │
                              │  │      response: "...", │ │
                              │  │      tool_calls: [...],│ │
                              │  │      metadata: {...}  │ │
                              │  │    }                  │ │
                              │  └───────────────────────┘ │
                              └──────────────┬──────────────┘
                                             │
┌─────────────────────────────────────────────┘
│
│  ┌─────────────────────────────────────┐
│  │ 10. AIレスポンスをDB保存             │
│  │     INSERT INTO messages            │
│  │     (sender_type='ai', content=...) │
│  └─────────────────────────────────────┘
│
│  ┌─────────────────────────────────────┐
│  │ 11. AI処理履歴を記録                 │
│  │     INSERT INTO ai_chat_sessions    │
│  │     INSERT INTO ai_tool_usage       │
│  └─────────────────────────────────────┘
│
│  ┌─────────────────────────────────────┐
│  │ 12. Frontend にレスポンス             │
│  │     {"message_id": "...",           │
│  │      "content": "..."}              │
│  └─────────────────────────────────────┘
│
Backend-go
```

### 環境変数設定

#### Backend-go (`.env`)

```env
# PostgreSQL接続（唯一のDBアクセス）
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=bridgespeak
POSTGRES_USER=backend_go_user
POSTGRES_PASSWORD=secure_password

# Backend-python接続
AI_SERVICE_URL=http://backend-python:8001
AI_SERVICE_TIMEOUT=120s
```

#### Backend-python (`.env.local`)

```env
# LLM API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# PostgreSQL接続情報は不要（DBアクセスなし）
# POSTGRES_HOST=  ← 削除
# POSTGRES_USER=  ← 削除
# POSTGRES_PASSWORD=  ← 削除
```

---

## 次のステップ

1. フェーズ 2 のマイグレーションファイル作成
2. Backend-go の実装
   - AI Proxy Service の実装
   - AI Client の実装
   - Chat、MCP、AI Usecase の実装
3. Backend-python のクリーンアップ
   - DB 接続コードの削除
   - ステートレスな API として再構築
4. 統合テスト
5. パフォーマンステスト
