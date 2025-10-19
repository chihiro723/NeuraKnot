# NeuraKnot データベース設計書（現在のスキーマ）

**最終更新**: 2025-10-19  
**バージョン**: v1.0 (MVP)  
**分析レポート**: [SCHEMA_ANALYSIS_REPORT.md](./backend/SCHEMA_ANALYSIS_REPORT.md)

---

## 📋 目次

1. [概要](#概要)
2. [設計原則](#設計原則)
3. [ER 図](#er図)
4. [テーブル一覧](#テーブル一覧)
5. [テーブル詳細](#テーブル詳細)
6. [インデックス戦略](#インデックス戦略)
7. [制約とバリデーション](#制約とバリデーション)
8. [パフォーマンス最適化](#パフォーマンス最適化)

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
│  │ Service Config  │   │
│  │ AI Proxy        │←──┼─┐
│  └─────────────────┘   │ │
└────────┬────────────────┘ │
         │                  │ HTTP (内部 API)
         ↓                  │
┌─────────────────┐        │
│   PostgreSQL    │        │
│  (8 テーブル)    │        │
└─────────────────┘        │
                           ↓
                 ┌──────────────────┐
                 │ Backend-python   │ ← AI 処理専用
                 │ (AI Engine)      │   (DB アクセスなし)
                 │                  │
                 │ • LLM 呼び出し    │
                 │ • ツール実行      │
                 │ • ストリーミング  │
                 └──────────────────┘
```

### データベースアクセス方針

**重要: Backend-go のみが PostgreSQL にアクセスします**

| 領域             | 管理サービス   | 説明                                 |
| ---------------- | -------------- | ------------------------------------ |
| ユーザー管理     | Backend-go     | 認証、プロフィール                   |
| AI エージェント  | Backend-go     | エージェント設定、ペルソナ           |
| 会話・メッセージ | Backend-go     | チャット履歴、会話管理               |
| AI 処理履歴      | Backend-go     | AI セッション、ツール使用履歴の記録  |
| サービス設定     | Backend-go     | 外部サービス連携設定、認証情報       |
| AI 処理実行      | Backend-python | LLM 統合、ツール実行（ステートレス） |

---

## 設計原則

### 1. 単一データアクセスポイント

- **Backend-go のみ**が PostgreSQL にアクセス
- データ整合性の保証とトランザクション管理の一元化
- Backend-python はステートレスな AI 処理エンジンとして機能

### 2. MVP に集中

- 現在は 1 対 1 チャット（User ↔ AI Agent）のみサポート
- グループチャット、ユーザー間チャットは将来実装予定
- シンプルで拡張可能な設計

### 3. パフォーマンス最適化

- 適切なインデックス設計
- トリガーによる自動更新
- 統計カウンターの管理

### 4. セキュリティ

- 機密情報の暗号化（API キー、認証情報）
- CHECK 制約による型安全性
- ソフトデリート非対応（MVP）

---

## ER 図

```
┌─────────────┐
│   users     │ 1:N
│  (ユーザー)  │─────┐
└─────────────┘     │
       │            │
       │ 1:N        ↓
       │     ┌──────────────────────┐
       │     │ user_service_configs │
       │     │ (サービス設定・暗号化) │
       │     └──────────────────────┘
       │
       ↓
┌─────────────────┐ 1:N ┌──────────────────┐
│   ai_agents     │─────│ ai_agent_services│
│  (AI エージェント)│     │ (エージェント    │
└─────────────────┘     │  サービス紐付け) │
       │                └──────────────────┘
       │ 1:N
       ↓
┌─────────────────┐ 1:N ┌──────────────────┐
│  conversations  │─────│    messages      │
│   (会話)         │     │   (メッセージ)     │
└─────────────────┘     └──────────────────┘
       │                        │ 1:1
       │ 1:N                    ↓
       ↓                 ┌──────────────────┐
┌─────────────────────┐ │  ai_chat_sessions│
│  ai_chat_sessions   │ │  (AI処理セッション)│
│  (AI処理セッション)   │ └──────────────────┘
└─────────────────────┘
       │ 1:N
       ↓
┌──────────────────┐
│  ai_tool_usage   │
│  (ツール使用履歴) │
└──────────────────┘
```

---

## テーブル一覧

| #   | テーブル名           | 用途                             | レコード数 | サイズ |
| --- | -------------------- | -------------------------------- | ---------- | ------ |
| 1   | users                | ユーザー情報（Cognito 連携）     | 1          | 128 KB |
| 2   | ai_agents            | AI エージェント設定              | 11         | 144 KB |
| 3   | conversations        | 会話（User ↔ AI Agent）          | 11         | 104 KB |
| 4   | messages             | チャットメッセージ               | 247        | 240 KB |
| 5   | ai_chat_sessions     | AI 処理セッション履歴            | 117        | 136 KB |
| 6   | ai_tool_usage        | AI ツール使用履歴                | 56         | 304 KB |
| 7   | user_service_configs | ユーザーサービス設定（暗号化）   | 6          | 96 KB  |
| 8   | ai_agent_services    | AI エージェント × サービス紐付け | 13         | 96 KB  |

**合計**: 約 1.2 MB（開発環境データ）

---

## テーブル詳細

### 1. users（ユーザー）

**目的**: ユーザーの基本情報を管理（AWS Cognito 連携）

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- AWS Cognito連携
    cognito_user_id VARCHAR(255) UNIQUE NOT NULL,

    -- 基本情報
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,

    -- ステータス
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    -- active, inactive, suspended, deleted

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_users_status CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'))
);
```

**インデックス**:

- `idx_users_cognito_user_id` - 認証時の高速検索
- `idx_users_email` - メールアドレス検索
- `idx_users_status` - アクティブユーザーのフィルタ

---

### 2. ai_agents（AI エージェント）

**目的**: AI エージェントの基本情報とペルソナ設定を管理

```sql
CREATE TABLE ai_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 所有者
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 基本情報
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,

    -- ペルソナ設定
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

    -- ストリーミング設定
    streaming_enabled BOOLEAN DEFAULT false,

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
    CONSTRAINT chk_model CHECK (model IN (
        -- OpenAI Models
        'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo',
        -- Anthropic Models (API format)
        'claude-3-5-sonnet-20241022', 'claude-3.5-sonnet', 'claude-3-opus-20240229',
        'claude-3-sonnet-20240229', 'claude-3-haiku-20240307',
        -- Google Models
        'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'
    )),
    CONSTRAINT chk_temperature CHECK (temperature >= 0 AND temperature <= 2),
    CONSTRAINT chk_max_tokens CHECK (max_tokens >= 100 AND max_tokens <= 8000)
);
```

**インデックス**:

- `idx_ai_agents_user` - ユーザーのエージェント一覧取得
- `idx_ai_agents_active` - アクティブなエージェントのみ
- `idx_ai_agents_last_chat` - 最終チャット日時順ソート
- `idx_ai_agents_streaming` - ストリーミング有効なエージェント

**重要な設計判断**:

- ✅ `chk_model` 制約を追加し、許可されたモデルのみ登録可能に
- ✅ `avatar_url` は将来の機能拡張用（現在未使用）

---

### 3. conversations（会話）

**目的**: ユーザーと AI Agent 間の 1 対 1 会話を管理

```sql
CREATE TABLE conversations (
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
```

**インデックス**:

- `idx_conversations_user` - ユーザーの会話一覧（最終メッセージ順）
- `idx_conversations_agent` - AI Agent が関わる会話

**トリガー**:

- メッセージ挿入時に `message_count` と `last_message_at` を自動更新

---

### 4. messages（メッセージ）

**目的**: チャットメッセージを保存

```sql
CREATE TABLE messages (
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
```

**インデックス**:

- `idx_messages_conversation` - 会話内のメッセージ一覧（作成日時降順）
- `idx_messages_sender` - 送信者によるフィルタ
- `idx_messages_ai_session` - AI セッションとの紐付け

**トリガー**:

- メッセージ挿入時に `conversations` テーブルと `ai_agents` テーブルを更新

---

### 5. ai_chat_sessions（AI 処理セッション）

**目的**: AI 処理の実行セッションを記録（分析・デバッグ用）

```sql
CREATE TABLE ai_chat_sessions (
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
```

**インデックス**:

- `idx_ai_sessions_user` - ユーザーごとのセッション履歴
- `idx_ai_sessions_conversation` - 会話ごとのセッション
- `idx_ai_sessions_agent` - エージェントごとのセッション
- `idx_ai_sessions_status` - 処理中のセッション検索

**統計データ**（現在）:

- 平均トークン使用量: 2,690 トークン
- 平均処理時間: 5.8 秒
- 成功率: 100%

---

### 6. ai_tool_usage（ツール使用履歴）

**目的**: AI が使用したツールの実行履歴を記録

```sql
CREATE TABLE ai_tool_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 関連
    session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    -- session_idまたはmessage_idのいずれかが必須

    -- ツール情報
    tool_name VARCHAR(255) NOT NULL,
    tool_category VARCHAR(100) DEFAULT 'basic',
    -- basic: 基本ツール（日時、計算など）
    -- service: サービスツール

    -- 実行情報
    input_data JSONB NOT NULL,
    output_data TEXT,

    -- ステータス
    status VARCHAR(50) NOT NULL,
    -- completed: 完了
    -- failed: 失敗

    error_message TEXT,
    execution_time_ms INTEGER,

    -- UI表示用：メッセージ内での挿入位置（文字数）
    insert_position INTEGER,

    -- タイムスタンプ
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT chk_tool_status CHECK (status IN ('completed', 'failed')),
    CONSTRAINT chk_tool_reference CHECK (session_id IS NOT NULL OR message_id IS NOT NULL)
);
```

**インデックス**:

- `idx_ai_tool_usage_session` - セッションごとのツール使用
- `idx_ai_tool_usage_message` - メッセージごとのツール使用
- `idx_ai_tool_usage_tool` - ツール名での検索
- `idx_ai_tool_usage_executed` - 実行日時順
- `idx_ai_tool_usage_input` (GIN) - JSONB 検索

**ツール使用統計**（現在）:

- web_search: 33 回 / 100%成功
- get_weather: 6 回 / 100%成功
- calculate: 4 回 / 100%成功
- 全てのツールで 100%成功率

---

### 7. user_service_configs（ユーザーサービス設定）

**目的**: ユーザーごとのサービス設定と認証情報を暗号化して保存

```sql
CREATE TABLE user_service_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ユーザー（必須）
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- サービスクラス名（例：NotionService、SlackService）
    service_class VARCHAR(255) NOT NULL,

    -- 暗号化された設定情報（AES-256-GCM）
    encrypted_config BYTEA,
    config_nonce BYTEA,

    -- 暗号化された認証情報（APIキー等、AES-256-GCM）
    encrypted_auth BYTEA,
    auth_nonce BYTEA,

    -- サービスが有効かどうか
    is_enabled BOOLEAN DEFAULT TRUE,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約：1ユーザーにつき1サービスクラス
    UNIQUE (user_id, service_class)
);
```

**インデックス**:

- `idx_user_service_configs_user` - ユーザーの設定一覧
- `idx_user_service_configs_service` - サービスクラスでの検索
- `idx_user_service_configs_enabled` - 有効な設定のみ

**セキュリティ**:

- ✅ AES-256-GCM で暗号化
- ✅ Nonce を使用して暗号化の一意性を保証
- ✅ Backend-go でのみ復号化

**現在の利用サービス**:

- DateTimeService
- CalculationService
- NotionService
- TextService
- BraveSearchService

---

### 8. ai_agent_services（AI エージェント × サービス紐付け）

**目的**: AI エージェントとサービスの紐付けを管理

```sql
CREATE TABLE ai_agent_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- AI Agent（必須）
    ai_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

    -- サービスクラス名（例：NotionService、SlackService）
    service_class VARCHAR(255) NOT NULL,

    -- ツール選択モード
    tool_selection_mode VARCHAR(50) DEFAULT 'all',
    -- all: 全ツール使用
    -- selected: selected_toolsで指定したツールのみ

    -- 選択されたツール名の配列（tool_selection_mode='selected'の場合）
    selected_tools TEXT[],

    -- このサービスをAI Agentで使用するかどうか
    enabled BOOLEAN DEFAULT TRUE,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    UNIQUE (ai_agent_id, service_class),
    CONSTRAINT chk_tool_selection_mode CHECK (tool_selection_mode IN ('all', 'selected'))
);
```

**インデックス**:

- `idx_ai_agent_services_agent` - エージェントのサービス一覧
- `idx_ai_agent_services_service` - サービスを使用しているエージェント
- `idx_ai_agent_services_enabled` - 有効なサービスのみ

**サービス利用状況**（現在）:

- BraveSearchService: 4 エージェント
- DateTimeService: 3 エージェント
- OpenWeatherService: 3 エージェント

---

## インデックス戦略

### 1. インデックスタイプ別の用途

| インデックスタイプ | 用途           | 使用例                                       |
| ------------------ | -------------- | -------------------------------------------- |
| B-Tree             | 等価・範囲検索 | PRIMARY KEY, UNIQUE, 日付範囲                |
| GIN                | JSONB 検索     | ai_tool_usage.input_data                     |
| Partial Index      | 条件付き       | WHERE enabled = true, WHERE is_active = true |

### 2. 最も使用されるインデックス

| インデックス名                     | スキャン回数 | 用途                     |
| ---------------------------------- | ------------ | ------------------------ |
| `idx_users_cognito_user_id`        | 12,810       | 認証時のユーザー検索     |
| `idx_ai_tool_usage_message`        | 9,192        | メッセージ内のツール使用 |
| `idx_user_service_configs_enabled` | 878          | 有効なサービス設定       |
| `idx_ai_agent_services_enabled`    | 376          | エージェントのサービス   |

### 3. 未使用のインデックス

一部のインデックスはまだ使用されていませんが、将来的な機能拡張を見据えて維持しています：

- `idx_ai_sessions_conversation` - 会話分析機能実装時に使用
- `idx_ai_tool_usage_session` - セッション分析機能実装時に使用

---

## 制約とバリデーション

### 1. CHECK 制約

すべての列挙型に CHECK 制約を設定し、不正なデータの挿入を防止：

```sql
-- ステータス値の制限
CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'))

-- ペルソナタイプの制限
CHECK (persona_type IN ('assistant', 'creative', 'analytical'))

-- プロバイダーの制限
CHECK (provider IN ('openai', 'anthropic', 'google'))

-- モデル名の制限
CHECK (model IN ('gpt-4o', 'claude-3.5-sonnet', ...))

-- 数値範囲の制限
CHECK (temperature >= 0 AND temperature <= 2)
CHECK (max_tokens >= 100 AND max_tokens <= 8000)
```

### 2. UNIQUE 制約

データの一意性を保証：

```sql
-- ユーザー
UNIQUE (cognito_user_id)
UNIQUE (email)

-- 会話（1ユーザー×1エージェント = 1会話）
UNIQUE (user_id, ai_agent_id)

-- サービス設定（1ユーザー×1サービス = 1設定）
UNIQUE (user_id, service_class)

-- エージェントサービス（1エージェント×1サービス = 1紐付け）
UNIQUE (ai_agent_id, service_class)
```

### 3. 外部キー制約

すべての外部キーに `ON DELETE CASCADE` または `ON DELETE SET NULL` を設定：

```sql
-- カスケード削除（親が削除されたら子も削除）
user_id REFERENCES users(id) ON DELETE CASCADE
ai_agent_id REFERENCES ai_agents(id) ON DELETE CASCADE

-- NULL設定（親が削除されても子は保持）
ai_session_id REFERENCES ai_chat_sessions(id) ON DELETE SET NULL
message_id REFERENCES messages(id) ON DELETE SET NULL
```

---

## パフォーマンス最適化

### 1. トリガーによる自動更新

`updated_at` の自動更新とカウンターの自動管理：

```sql
-- updated_at自動更新
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- メッセージ送信時の統計更新
CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();
```

### 2. 統計カウンターの整合性

定期的な整合性チェックと修正：

```sql
-- カウントの修正
UPDATE conversations c
SET message_count = (
    SELECT COUNT(*)
    FROM messages m
    WHERE m.conversation_id = c.id
),
updated_at = CURRENT_TIMESTAMP;
```

### 3. パーティショニング戦略（将来）

大量データが予想されるテーブルの月次パーティション：

- `messages` - 月次パーティション
- `ai_chat_sessions` - 月次パーティション
- `ai_tool_usage` - 月次パーティション

---

## データ量見積もり

### 現在（開発環境）

| テーブル             | レコード数 | サイズ     |
| -------------------- | ---------- | ---------- |
| users                | 1          | 128 KB     |
| ai_agents            | 11         | 144 KB     |
| conversations        | 11         | 104 KB     |
| messages             | 247        | 240 KB     |
| ai_chat_sessions     | 117        | 136 KB     |
| ai_tool_usage        | 56         | 304 KB     |
| user_service_configs | 6          | 96 KB      |
| ai_agent_services    | 13         | 96 KB      |
| **合計**             | **462**    | **1.2 MB** |

### 将来（10,000 ユーザー想定）

| テーブル             | レコード数/月 | ストレージ/月 |
| -------------------- | ------------- | ------------- |
| users                | 10,000        | ~2MB          |
| ai_agents            | 100           | ~50KB         |
| conversations        | 300,000       | ~60MB         |
| messages             | 10M           | ~5GB          |
| ai_chat_sessions     | 1M            | ~500MB        |
| ai_tool_usage        | 5M            | ~2GB          |
| user_service_configs | 30,000        | ~10MB         |
| ai_agent_services    | 50,000        | ~20MB         |
| **合計（1 年）**     | -             | **~90GB**     |

---

## セキュリティ考慮事項

### 1. 暗号化

- `user_service_configs`: AES-256-GCM で API キーなどを暗号化
- SSL/TLS 通信（PostgreSQL）
- バックアップの暗号化

### 2. アクセス制御

```sql
-- Backend-go用ロール（唯一のDBアクセス権限）
CREATE ROLE backend_go_user WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO backend_go_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO backend_go_user;

-- Backend-pythonはDBアクセス権限なし（接続情報も不要）
```

**セキュリティ上の利点**:

- ✅ DB 接続情報を持つサービスは Backend-go のみ
- ✅ 攻撃対象領域の削減（Backend-python が侵害されても DB は安全）
- ✅ 最小権限の原則に準拠

### 3. 監査とログ

- `ai_chat_sessions`: すべての AI 処理を記録
- `ai_tool_usage`: すべてのツール使用を記録
- エラー情報の保存

---

## バックアップ戦略

### 1. フルバックアップ

- 頻度: 毎日
- 保持期間: 30 日
- ツール: `pg_dump` または RDS 自動バックアップ

### 2. ポイントインタイムリカバリ

- WAL アーカイブ保持: 7 日
- S3 へのアーカイブ推奨

---

## モニタリング指標

### 1. パフォーマンス

- スロークエリ（> 1 秒）
- インデックス使用率
- テーブルサイズ増加率
- 接続数

### 2. ビジネス指標

- DAU/MAU
- メッセージ送信数
- AI 処理数（トークン使用量）
- ツール使用数
- エラー率

---

## 関連ドキュメント

- 📊 [スキーマ分析レポート](./backend/SCHEMA_ANALYSIS_REPORT.md) - 現在のスキーマ状態と問題点
- 📁 [スキーマファイル](../backend-go/schema/schema.sql) - 実際の SQL 定義
- 🏗️ [将来のデータベース設計](./DATABASE_DESIGN.md) - グループチャット等の将来機能
- 🏛️ [バックエンドアーキテクチャ](../backend-go/README.md)

---

**最終更新**: 2025-10-19  
**作成者**: Development Team
