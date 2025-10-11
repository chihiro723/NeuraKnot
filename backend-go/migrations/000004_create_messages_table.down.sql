-- メッセージテーブルとその関連要素を削除

-- トリガーを削除
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;

-- トリガー関数を削除
DROP FUNCTION IF EXISTS update_conversation_on_message();

-- インデックスを削除
DROP INDEX IF EXISTS idx_messages_ai_session;
DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_messages_conversation;

-- テーブルを削除（制約も自動で削除される）
DROP TABLE IF EXISTS messages;

