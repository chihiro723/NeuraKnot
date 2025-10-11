-- AI Agentテーブルを作成（ペルソナ統合版 - MVP）
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

-- インデックスを作成
CREATE INDEX idx_ai_agents_user ON ai_agents(user_id, is_active);
CREATE INDEX idx_ai_agents_active ON ai_agents(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_agents_last_chat ON ai_agents(user_id, last_chat_at DESC NULLS LAST);

-- updated_at自動更新トリガーを設定
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE ai_agents IS 'ユーザーが作成したAI Agentの情報とペルソナ設定（MVP版：ai_personasテーブルを統合）';
COMMENT ON COLUMN ai_agents.persona_type IS '振る舞いタイプ（assistant/creative/analytical）';
COMMENT ON COLUMN ai_agents.system_prompt IS 'カスタムシステムプロンプト（NULLの場合はpersona_typeから自動生成）';
COMMENT ON COLUMN ai_agents.tools_enabled IS '基本ツール（日時、計算など）の有効/無効';

