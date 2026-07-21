-- ===========================================
-- WebLLM (ブラウザローカル) provider 追加 v1.0
-- ローカル LLM を「実行場所=クライアント」の provider として第一級市民化する
-- ===========================================

-- -------------------------------------------
-- 1. llm_models に実行場所カラムを追加
--    server: サーバー(Python)で推論 / client: ブラウザ(WebLLM)で推論
-- -------------------------------------------
ALTER TABLE llm_models
    ADD COLUMN execution_location VARCHAR(20) NOT NULL DEFAULT 'server';

ALTER TABLE llm_models
    ADD CONSTRAINT chk_llm_models_execution_location
    CHECK (execution_location IN ('server', 'client'));

COMMENT ON COLUMN llm_models.execution_location IS '推論の実行場所（server=Python / client=ブラウザWebLLM）';

-- -------------------------------------------
-- 2. provider CHECK 制約を張り替えて 'webllm' を許可（3テーブル）
-- -------------------------------------------

-- 2-1. llm_models
ALTER TABLE llm_models DROP CONSTRAINT chk_llm_models_provider;
ALTER TABLE llm_models
    ADD CONSTRAINT chk_llm_models_provider
    CHECK (provider IN ('openai', 'anthropic', 'google', 'webllm'));

-- 2-2. ai_agents
ALTER TABLE ai_agents DROP CONSTRAINT chk_provider;
ALTER TABLE ai_agents
    ADD CONSTRAINT chk_provider
    CHECK (provider IN ('openai', 'anthropic', 'google', 'webllm'));

-- 2-3. llm_pricing（webllm は単価$0を登録する運用のため provider を許可）
ALTER TABLE llm_pricing DROP CONSTRAINT chk_pricing_provider;
ALTER TABLE llm_pricing
    ADD CONSTRAINT chk_pricing_provider
    CHECK (provider IN ('openai', 'anthropic', 'google', 'webllm'));

COMMENT ON COLUMN llm_models.provider IS 'LLMプロバイダー（openai/anthropic/google/webllm）';
