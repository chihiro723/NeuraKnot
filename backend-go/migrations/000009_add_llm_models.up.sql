-- ===========================================
-- LLM Models Registry Migration v1.0
-- モデル可用性・実行制約をDBで管理
-- ===========================================

CREATE TABLE llm_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(150) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    temperature_min DECIMAL(3, 2) NOT NULL DEFAULT 0.0,
    temperature_max DECIMAL(3, 2) NOT NULL DEFAULT 2.0,
    max_tokens_min INTEGER NOT NULL DEFAULT 100,
    max_tokens_max INTEGER NOT NULL DEFAULT 8000,
    supports_streaming BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_llm_models_provider_model UNIQUE (provider, model),
    CONSTRAINT chk_llm_models_provider CHECK (provider IN ('openai', 'anthropic', 'google')),
    CONSTRAINT chk_llm_models_temperature_range CHECK (
        temperature_min >= 0 AND
        temperature_max <= 2 AND
        temperature_min <= temperature_max
    ),
    CONSTRAINT chk_llm_models_max_tokens_range CHECK (
        max_tokens_min >= 1 AND
        max_tokens_min <= max_tokens_max
    )
);

CREATE INDEX idx_llm_models_provider_enabled ON llm_models(provider, is_enabled);
CREATE INDEX idx_llm_models_enabled_updated_at ON llm_models(is_enabled, updated_at DESC);

CREATE TRIGGER update_llm_models_updated_at BEFORE UPDATE ON llm_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE llm_models IS 'LLMモデルのレジストリ（可用性・実行制約）';
COMMENT ON COLUMN llm_models.provider IS 'LLMプロバイダー（openai/anthropic/google）';
COMMENT ON COLUMN llm_models.model IS 'モデルID（例: gpt-4.1-mini）';
COMMENT ON COLUMN llm_models.display_name IS 'UI表示名';
COMMENT ON COLUMN llm_models.is_enabled IS 'モデルの提供可否';
COMMENT ON COLUMN llm_models.temperature_min IS '許可する最小temperature';
COMMENT ON COLUMN llm_models.temperature_max IS '許可する最大temperature';
COMMENT ON COLUMN llm_models.max_tokens_min IS '許可する最小max_tokens';
COMMENT ON COLUMN llm_models.max_tokens_max IS '許可する最大max_tokens';
COMMENT ON COLUMN llm_models.supports_streaming IS 'ストリーミング対応可否';
COMMENT ON COLUMN llm_models.metadata IS '拡張メタデータ（将来拡張用）';

-- 初期seedは投入しない。モデルは管理ダッシュボード（/dashboard/admin/llm-models）
-- から登録・管理する運用とし、DBはスキーマのみを提供する。
