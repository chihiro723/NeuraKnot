-- ===========================================
-- LLM料金マスタの初期データ削除
-- ===========================================

-- すべてのLLM料金データを削除
DELETE FROM llm_pricing WHERE provider IN ('openai', 'anthropic', 'google');

