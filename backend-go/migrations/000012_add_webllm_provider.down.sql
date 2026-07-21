-- ===========================================
-- Rollback: WebLLM (ブラウザローカル) provider 追加
-- ===========================================
-- 注意: ロールバック前に webllm provider の行が残っていると
-- CHECK 制約の再作成に失敗する。必要に応じて事前に該当行を削除すること。

-- provider CHECK 制約を元の3プロバイダーに戻す
ALTER TABLE llm_pricing DROP CONSTRAINT chk_pricing_provider;
ALTER TABLE llm_pricing
    ADD CONSTRAINT chk_pricing_provider
    CHECK (provider IN ('openai', 'anthropic', 'google'));

ALTER TABLE ai_agents DROP CONSTRAINT chk_provider;
ALTER TABLE ai_agents
    ADD CONSTRAINT chk_provider
    CHECK (provider IN ('openai', 'anthropic', 'google'));

ALTER TABLE llm_models DROP CONSTRAINT chk_llm_models_provider;
ALTER TABLE llm_models
    ADD CONSTRAINT chk_llm_models_provider
    CHECK (provider IN ('openai', 'anthropic', 'google'));

-- 実行場所カラムを削除
ALTER TABLE llm_models DROP CONSTRAINT IF EXISTS chk_llm_models_execution_location;
ALTER TABLE llm_models DROP COLUMN IF EXISTS execution_location;
