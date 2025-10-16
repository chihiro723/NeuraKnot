-- ===========================================
-- NeuraKnot Database Schema v1.0
-- 統合スキーマファイル - 現在の最新状態を再現
-- ===========================================

-- UUID拡張を有効化（PostgreSQL 13以降は標準で利用可能）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 1. ユーザー管理テーブル
-- ===========================================
CREATE TABLE users (
    -- プライマリキー（UUID）
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- AWS Cognito連携用のユーザーID（一意制約）
    -- CognitoのUsernameはメールアドレスと同じになる
    cognito_user_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- メールアドレス（一意制約）
    -- Cognitoではこれがusernameとしても機能する
    email VARCHAR(255) UNIQUE NOT NULL,
    
    -- 表示名（画面に表示される名前）
    -- ユーザーが自由に変更できる表示用の名前
    display_name VARCHAR(255) NOT NULL,
    
    -- ユーザーステータス（active, inactive, suspended, deleted）
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    
    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 2. エージェント管理テーブル
-- ===========================================
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
    
    -- ストリーミング設定
    streaming_enabled BOOLEAN DEFAULT false,
    -- ストリーミングチャットを有効にするかどうか
    
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

-- ===========================================
-- 3. 会話管理テーブル
-- ===========================================
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

-- ===========================================
-- 4. メッセージ管理テーブル
-- ===========================================
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
    ai_session_id UUID,
    -- ai_chat_sessionsテーブルへの参照（後で追加される可能性があるためNULL許可）
    
    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT chk_sender_type CHECK (sender_type IN ('user', 'ai'))
);

-- ===========================================
-- 5. AI処理セッション管理テーブル
-- ===========================================
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

-- ===========================================
-- 6. ツール使用履歴テーブル
-- ===========================================
CREATE TABLE ai_tool_usage (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 関連
    session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    -- session_idまたはmessage_idのいずれかが必須
    -- リアルタイムストリーミング時はmessage_idで直接関連付け
    
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

-- ===========================================
-- 7. ユーザーのサービス設定テーブル
-- ===========================================
CREATE TABLE user_service_configs (
    -- プライマリキー
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

-- ===========================================
-- 8. AI Agentとサービスの紐付けテーブル
-- ===========================================
CREATE TABLE ai_agent_services (
    -- プライマリキー
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

-- ===========================================
-- インデックス定義
-- ===========================================

-- ユーザーテーブルのインデックス
CREATE INDEX idx_users_cognito_user_id ON users(cognito_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- エージェントテーブルのインデックス
CREATE INDEX idx_ai_agents_user ON ai_agents(user_id, is_active);
CREATE INDEX idx_ai_agents_active ON ai_agents(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_agents_last_chat ON ai_agents(user_id, last_chat_at DESC NULLS LAST);
CREATE INDEX idx_ai_agents_streaming ON ai_agents(streaming_enabled) WHERE streaming_enabled = true;

-- 会話テーブルのインデックス
CREATE INDEX idx_conversations_user ON conversations(user_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_agent ON conversations(ai_agent_id);

-- メッセージテーブルのインデックス
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX idx_messages_ai_session ON messages(ai_session_id) WHERE ai_session_id IS NOT NULL;

-- AIセッションテーブルのインデックス
CREATE INDEX idx_ai_sessions_user ON ai_chat_sessions(user_id, started_at DESC);
CREATE INDEX idx_ai_sessions_conversation ON ai_chat_sessions(conversation_id);
CREATE INDEX idx_ai_sessions_agent ON ai_chat_sessions(ai_agent_id);
CREATE INDEX idx_ai_sessions_status ON ai_chat_sessions(status) WHERE status = 'processing';

-- ツール使用履歴テーブルのインデックス
CREATE INDEX idx_ai_tool_usage_session ON ai_tool_usage(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_ai_tool_usage_message ON ai_tool_usage(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_ai_tool_usage_tool ON ai_tool_usage(tool_name);
CREATE INDEX idx_ai_tool_usage_executed ON ai_tool_usage(executed_at DESC);
CREATE INDEX idx_ai_tool_usage_input ON ai_tool_usage USING GIN(input_data);

-- ユーザーサービス設定テーブルのインデックス
CREATE INDEX idx_user_service_configs_user ON user_service_configs(user_id);
CREATE INDEX idx_user_service_configs_service ON user_service_configs(service_class);
CREATE INDEX idx_user_service_configs_enabled ON user_service_configs(user_id, is_enabled);

-- AI Agentサービステーブルのインデックス
CREATE INDEX idx_ai_agent_services_agent ON ai_agent_services(ai_agent_id);
CREATE INDEX idx_ai_agent_services_service ON ai_agent_services(service_class);
CREATE INDEX idx_ai_agent_services_enabled ON ai_agent_services(ai_agent_id, enabled);

-- ===========================================
-- 制約定義
-- ===========================================

-- ユーザーテーブルの制約
ALTER TABLE users ADD CONSTRAINT chk_users_status 
    CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'));

-- メッセージテーブルの外部キー制約（ai_session_id）
ALTER TABLE messages
ADD CONSTRAINT fk_messages_ai_session
FOREIGN KEY (ai_session_id) REFERENCES ai_chat_sessions(id) ON DELETE SET NULL;

-- ===========================================
-- 関数定義
-- ===========================================

-- updated_at自動更新用のトリガー関数を作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- メッセージ送信時にconversationsとai_agentsを更新するトリガー関数
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- conversationsテーブルを更新
    UPDATE conversations
    SET
        last_message_at = NEW.created_at,
        message_count = message_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
    
    -- AI Agentのメッセージの場合、統計情報も更新
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

-- ===========================================
-- トリガー定義
-- ===========================================

-- updated_at自動更新トリガー
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- user_service_configs自動更新トリガー
CREATE TRIGGER update_user_service_configs_updated_at BEFORE UPDATE ON user_service_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- メッセージ送信時の統計更新トリガー
CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ===========================================
-- コメント定義
-- ===========================================

-- テーブルコメント
COMMENT ON TABLE users IS 'ユーザー情報（AWS Cognito連携）';
COMMENT ON TABLE ai_agents IS 'ユーザーが作成したAI Agentの情報とペルソナ設定（MVP版：ai_personasテーブルを統合）';
COMMENT ON TABLE conversations IS 'ユーザーとAI Agent間の会話（MVP版：user ↔ ai のみ）';
COMMENT ON TABLE messages IS 'チャットメッセージ（ユーザーまたはAI Agentが送信）';
COMMENT ON TABLE ai_chat_sessions IS 'AI処理の実行セッション履歴（分析・デバッグ用）';
COMMENT ON TABLE ai_tool_usage IS 'AIが使用したツールの実行履歴';
COMMENT ON TABLE user_service_configs IS 'ユーザーごとのサービス設定と認証情報を保存';
COMMENT ON TABLE ai_agent_services IS 'AI Agentとサービスの紐付けを管理';

-- カラムコメント
COMMENT ON COLUMN users.cognito_user_id IS 'AWS CognitoのユーザーID（一意）';
COMMENT ON COLUMN users.email IS 'メールアドレス（Cognitoのusername）';
COMMENT ON COLUMN users.display_name IS '表示名（ユーザーが自由に変更可能）';
COMMENT ON COLUMN users.status IS 'ユーザーステータス（active/inactive/suspended/deleted）';

COMMENT ON COLUMN ai_agents.persona_type IS '振る舞いタイプ（assistant/creative/analytical）';
COMMENT ON COLUMN ai_agents.system_prompt IS 'カスタムシステムプロンプト（NULLの場合はpersona_typeから自動生成）';
COMMENT ON COLUMN ai_agents.tools_enabled IS '基本ツール（日時、計算など）の有効/無効';
COMMENT ON COLUMN ai_agents.streaming_enabled IS 'ストリーミングチャットを有効にするかどうか';

COMMENT ON CONSTRAINT unique_user_agent_conversation ON conversations IS '1ユーザー・1AI Agentにつき1つの会話のみ許可';

COMMENT ON COLUMN messages.sender_type IS '送信者タイプ（user: ユーザー, ai: AI Agent）';
COMMENT ON COLUMN messages.sender_id IS '送信者ID（sender_type=userならusers.id、aiならai_agents.id）';
COMMENT ON COLUMN messages.ai_session_id IS 'AI処理セッションID（sender_type=aiの場合に設定）';

COMMENT ON COLUMN ai_chat_sessions.tokens_total IS 'LLM APIで使用した総トークン数';
COMMENT ON COLUMN ai_chat_sessions.processing_time_ms IS 'AI処理の実行時間（ミリ秒）';
COMMENT ON COLUMN ai_chat_sessions.tools_used IS '使用したツールの数';

COMMENT ON COLUMN ai_tool_usage.session_id IS 'AI処理セッションID（バッチ処理時に使用）';
COMMENT ON COLUMN ai_tool_usage.message_id IS 'メッセージID（ストリーミング時に使用、リアルタイム表示用）';
COMMENT ON COLUMN ai_tool_usage.tool_category IS 'ツールカテゴリ（basic: 基本ツール, service: サービスツール）';
COMMENT ON COLUMN ai_tool_usage.input_data IS 'ツールへの入力データ（JSON形式）';
COMMENT ON COLUMN ai_tool_usage.execution_time_ms IS 'ツール実行時間（ミリ秒）';

COMMENT ON COLUMN user_service_configs.service_class IS 'Pythonクラス名（例：NotionService、SlackService）';
COMMENT ON COLUMN user_service_configs.encrypted_config IS 'AES-256-GCMで暗号化された設定情報（JSON）';
COMMENT ON COLUMN user_service_configs.config_nonce IS 'AES-256-GCM暗号化用のNonce';
COMMENT ON COLUMN user_service_configs.encrypted_auth IS 'AES-256-GCMで暗号化された認証情報（APIキー等）';
COMMENT ON COLUMN user_service_configs.auth_nonce IS 'AES-256-GCM暗号化用のNonce';
COMMENT ON COLUMN user_service_configs.is_enabled IS 'サービスが有効かどうか';

COMMENT ON COLUMN ai_agent_services.service_class IS 'Pythonクラス名（例：NotionService、SlackService）';
COMMENT ON COLUMN ai_agent_services.tool_selection_mode IS 'all: 全ツール使用、selected: selected_toolsで指定したツールのみ';
COMMENT ON COLUMN ai_agent_services.selected_tools IS 'ツール名の配列（tool_selection_mode=selectedの場合）';
COMMENT ON COLUMN ai_agent_services.enabled IS 'このサービスをAI Agentで使用するかどうか';

