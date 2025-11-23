-- グループメッセージへのツール使用関連付けを削除

-- インデックスを削除
DROP INDEX IF EXISTS idx_ai_tool_usage_group_message;

-- チェック制約を削除
ALTER TABLE ai_tool_usage DROP CONSTRAINT IF EXISTS ai_tool_usage_message_check;

-- group_message_id カラムを削除
ALTER TABLE ai_tool_usage DROP COLUMN IF EXISTS group_message_id;

