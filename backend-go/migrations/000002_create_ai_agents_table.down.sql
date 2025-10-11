-- AI Agentテーブルとその関連要素を削除

-- トリガーを削除
DROP TRIGGER IF EXISTS update_ai_agents_updated_at ON ai_agents;

-- インデックスを削除
DROP INDEX IF EXISTS idx_ai_agents_last_chat;
DROP INDEX IF EXISTS idx_ai_agents_active;
DROP INDEX IF EXISTS idx_ai_agents_user;

-- テーブルを削除（制約も自動で削除される）
DROP TABLE IF EXISTS ai_agents;

