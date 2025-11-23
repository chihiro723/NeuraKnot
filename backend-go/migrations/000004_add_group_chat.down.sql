-- グループチャット機能のロールバック

-- 既存テーブルへの変更を元に戻す
ALTER TABLE ai_chat_sessions DROP CONSTRAINT IF EXISTS chk_chat_type;
ALTER TABLE ai_chat_sessions DROP COLUMN IF EXISTS group_chat_id;

-- トリガーを削除
DROP TRIGGER IF EXISTS update_group_chats_updated_at ON group_chats;
DROP TRIGGER IF EXISTS trigger_update_group_chat_on_message ON group_messages;
DROP FUNCTION IF EXISTS update_group_chat_on_message();

-- テーブルを削除（外部キー制約の順序に注意）
DROP TABLE IF EXISTS message_mentions;
DROP TABLE IF EXISTS group_messages;
DROP TABLE IF EXISTS group_chat_members;
DROP TABLE IF EXISTS group_chats;
