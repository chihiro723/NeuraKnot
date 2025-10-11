-- 会話テーブルを作成（シンプル版 - MVP）
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

-- インデックスを作成
CREATE INDEX idx_conversations_user ON conversations(user_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_agent ON conversations(ai_agent_id);

-- updated_at自動更新トリガーを設定
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE conversations IS 'ユーザーとAI Agent間の会話（MVP版：user ↔ ai のみ）';
COMMENT ON CONSTRAINT unique_user_agent_conversation ON conversations IS '1ユーザー・1AI Agentにつき1つの会話のみ許可';

