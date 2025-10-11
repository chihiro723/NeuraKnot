-- AI処理セッションテーブルとその関連要素を削除

-- messagesテーブルの外部キー制約を削除
ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_ai_session;

-- インデックスを削除
DROP INDEX IF EXISTS idx_ai_sessions_status;
DROP INDEX IF EXISTS idx_ai_sessions_agent;
DROP INDEX IF EXISTS idx_ai_sessions_conversation;
DROP INDEX IF EXISTS idx_ai_sessions_user;

-- テーブルを削除（制約も自動で削除される）
DROP TABLE IF EXISTS ai_chat_sessions;

