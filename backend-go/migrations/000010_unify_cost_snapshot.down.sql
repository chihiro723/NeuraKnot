-- ===========================================
-- 000010 のロールバック
--   pricing_id カラムと関連インデックスを削除する。
--   バックフィルしたコスト値（cost_usd 等）は実データのため復元しない。
-- ===========================================

DROP INDEX IF EXISTS idx_ai_sessions_pricing_id;

ALTER TABLE ai_chat_sessions
DROP COLUMN IF EXISTS pricing_id;
