-- AI処理セッションテーブルを作成
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

-- インデックスを作成
CREATE INDEX idx_ai_sessions_user ON ai_chat_sessions(user_id, started_at DESC);
CREATE INDEX idx_ai_sessions_conversation ON ai_chat_sessions(conversation_id);
CREATE INDEX idx_ai_sessions_agent ON ai_chat_sessions(ai_agent_id);
CREATE INDEX idx_ai_sessions_status ON ai_chat_sessions(status) WHERE status = 'processing';

-- messagesテーブルのai_session_idに外部キー制約を追加
ALTER TABLE messages
ADD CONSTRAINT fk_messages_ai_session
FOREIGN KEY (ai_session_id) REFERENCES ai_chat_sessions(id) ON DELETE SET NULL;

-- コメント
COMMENT ON TABLE ai_chat_sessions IS 'AI処理の実行セッション履歴（分析・デバッグ用）';
COMMENT ON COLUMN ai_chat_sessions.tokens_total IS 'LLM APIで使用した総トークン数';
COMMENT ON COLUMN ai_chat_sessions.processing_time_ms IS 'AI処理の実行時間（ミリ秒）';
COMMENT ON COLUMN ai_chat_sessions.tools_used IS '使用したツールの数';

