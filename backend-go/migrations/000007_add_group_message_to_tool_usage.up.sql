-- グループメッセージへのツール使用関連付けをサポート

-- message_id の外部キー制約を削除
ALTER TABLE ai_tool_usage DROP CONSTRAINT IF EXISTS ai_tool_usage_message_id_fkey;

-- group_message_id カラムを追加
ALTER TABLE ai_tool_usage ADD COLUMN IF NOT EXISTS group_message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE;

-- message_id または group_message_id のいずれかが必須というチェック制約を追加
ALTER TABLE ai_tool_usage ADD CONSTRAINT ai_tool_usage_message_check 
    CHECK (
        (message_id IS NOT NULL AND group_message_id IS NULL) OR 
        (message_id IS NULL AND group_message_id IS NOT NULL)
    );

-- message_id の外部キー制約を再追加（NULL許可）
ALTER TABLE ai_tool_usage ADD CONSTRAINT ai_tool_usage_message_id_fkey 
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_ai_tool_usage_group_message ON ai_tool_usage(group_message_id) WHERE group_message_id IS NOT NULL;

