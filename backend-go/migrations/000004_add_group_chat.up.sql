-- グループチャット機能の追加

-- 1. group_chats テーブル
CREATE TABLE group_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_group_chats_user ON group_chats(user_id, last_message_at DESC);
CREATE INDEX idx_group_chats_active ON group_chats(user_id, is_active) WHERE is_active = true;

-- 2. group_chat_members テーブル
CREATE TABLE group_chat_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    ai_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_chat_id, ai_agent_id)
);

CREATE INDEX idx_group_members_group ON group_chat_members(group_chat_id, display_order);
CREATE INDEX idx_group_members_agent ON group_chat_members(ai_agent_id);

-- 3. group_messages テーブル
CREATE TABLE group_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'ai')),
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_message_id UUID REFERENCES group_messages(id) ON DELETE SET NULL,
    ai_session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE SET NULL,
    processing_status VARCHAR(50) DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_group_messages_group ON group_messages(group_chat_id, created_at DESC);
CREATE INDEX idx_group_messages_sender ON group_messages(sender_type, sender_id);
CREATE INDEX idx_group_messages_parent ON group_messages(parent_message_id) WHERE parent_message_id IS NOT NULL;

-- 4. message_mentions テーブル
CREATE TABLE message_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    ai_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    mention_order INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    response_message_id UUID REFERENCES group_messages(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE (message_id, ai_agent_id)
);

CREATE INDEX idx_mentions_message ON message_mentions(message_id, mention_order);
CREATE INDEX idx_mentions_agent ON message_mentions(ai_agent_id);
CREATE INDEX idx_mentions_status ON message_mentions(status) WHERE status IN ('pending', 'processing');

-- トリガー: group_messages INSERT 時の統計更新
CREATE OR REPLACE FUNCTION update_group_chat_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE group_chats
    SET last_message_at = NEW.created_at,
        message_count = message_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.group_chat_id;

    IF NEW.sender_type = 'ai' THEN
        UPDATE ai_agents
        SET message_count = message_count + 1,
            last_chat_at = NEW.created_at,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.sender_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_chat_on_message
AFTER INSERT ON group_messages
FOR EACH ROW EXECUTE FUNCTION update_group_chat_on_message();

-- トリガー: updated_at 自動更新
CREATE TRIGGER update_group_chats_updated_at
BEFORE UPDATE ON group_chats
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 既存テーブルへの変更: ai_chat_sessions にグループチャット対応を追加
ALTER TABLE ai_chat_sessions ADD COLUMN group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;
ALTER TABLE ai_chat_sessions ADD CONSTRAINT chk_chat_type CHECK (
    (conversation_id IS NOT NULL AND group_chat_id IS NULL) OR
    (conversation_id IS NULL AND group_chat_id IS NOT NULL)
);
