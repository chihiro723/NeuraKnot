-- ツール使用履歴テーブルとその関連要素を削除

-- インデックスを削除
DROP INDEX IF EXISTS idx_ai_tool_usage_input;
DROP INDEX IF EXISTS idx_ai_tool_usage_executed;
DROP INDEX IF EXISTS idx_ai_tool_usage_tool;
DROP INDEX IF EXISTS idx_ai_tool_usage_session;

-- テーブルを削除（制約も自動で削除される）
DROP TABLE IF EXISTS ai_tool_usage;

