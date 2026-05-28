-- チャット一覧のピン留め機能
-- 1対1チャット（ai_agents）とグループチャット（group_chats）を
-- 単一ポリモーフィックテーブルで管理する
-- target_id の意味は chat_type によって変わり、FK は張らない
-- （エージェント・グループ削除時はアプリケーション側で DELETE を発行する）
CREATE TABLE user_chat_pins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_type VARCHAR(16) NOT NULL CHECK (chat_type IN ('direct', 'group')),
    target_id UUID NOT NULL,
    pinned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_chat_pin UNIQUE (user_id, chat_type, target_id)
);

-- 一覧取得用（pinned_at DESC で参照する）
CREATE INDEX idx_user_chat_pins_user ON user_chat_pins(user_id, pinned_at);

-- エージェント／グループ削除時の一括掃除用
CREATE INDEX idx_user_chat_pins_target ON user_chat_pins(chat_type, target_id);
