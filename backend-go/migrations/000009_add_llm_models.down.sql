-- ===========================================
-- Rollback: LLM Models Registry
-- ===========================================

DROP TRIGGER IF EXISTS update_llm_models_updated_at ON llm_models;
DROP INDEX IF EXISTS idx_llm_models_enabled_updated_at;
DROP INDEX IF EXISTS idx_llm_models_provider_enabled;
DROP TABLE IF EXISTS llm_models;
