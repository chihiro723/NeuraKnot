-- メッセージテーブルを作成
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

-- インデックスを作成
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX idx_messages_ai_session ON messages(ai_session_id) WHERE ai_session_id IS NOT NULL;

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

-- トリガーを設定
CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- コメント
COMMENT ON TABLE messages IS 'チャットメッセージ（ユーザーまたはAI Agentが送信）';
COMMENT ON COLUMN messages.sender_type IS '送信者タイプ（user: ユーザー, ai: AI Agent）';
COMMENT ON COLUMN messages.sender_id IS '送信者ID（sender_type=userならusers.id、aiならai_agents.id）';
COMMENT ON COLUMN messages.ai_session_id IS 'AI処理セッションID（sender_type=aiの場合に設定）';

