-- 会話テーブルとその関連要素を削除

-- トリガーを削除
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;

-- インデックスを削除
DROP INDEX IF EXISTS idx_conversations_agent;
DROP INDEX IF EXISTS idx_conversations_user;

-- テーブルを削除（制約も自動で削除される）
DROP TABLE IF EXISTS conversations;

