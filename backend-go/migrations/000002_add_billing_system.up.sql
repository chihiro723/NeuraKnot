-- ===========================================
-- Billing System Migration v1.0
-- サブスクリプション課金システムの追加
-- ===========================================

-- ===========================================
-- 1. LLM料金マスタテーブル
-- ===========================================
CREATE TABLE llm_pricing (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- LLM情報
    provider VARCHAR(50) NOT NULL,
    -- openai, anthropic, google

    model VARCHAR(100) NOT NULL,
    -- gpt-4o, claude-3-5-sonnet-20241022, gemini-1.5-pro など

    -- 料金（USD per 1M tokens）
    prompt_cost_per_1m DECIMAL(10, 4) NOT NULL,
    completion_cost_per_1m DECIMAL(10, 4) NOT NULL,

    -- 有効期間
    effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP,

    -- メタ情報
    is_active BOOLEAN DEFAULT true,
    notes TEXT,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約
    CONSTRAINT unique_provider_model_version UNIQUE(provider, model, effective_from),
    CONSTRAINT chk_pricing_provider CHECK (provider IN ('openai', 'anthropic', 'google')),
    CONSTRAINT chk_pricing_positive CHECK (prompt_cost_per_1m >= 0 AND completion_cost_per_1m >= 0)
);

-- ===========================================
-- 2. トークン使用量管理テーブル
-- ===========================================
CREATE TABLE token_usage (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ユーザー
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 期間（課金サイクル）
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,

    -- トークン使用量
    tokens_prompt BIGINT DEFAULT 0,
    tokens_completion BIGINT DEFAULT 0,
    tokens_total BIGINT DEFAULT 0,

    -- コスト（USD）
    cost_usd DECIMAL(10, 4) DEFAULT 0,

    -- AI処理回数
    request_count INTEGER DEFAULT 0,

    -- プロバイダー別の内訳（JSONB）
    -- 例: {"openai": {"tokens": 1000, "cost": 0.05}, "anthropic": {...}}
    provider_breakdown JSONB DEFAULT '{}',

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約：1ユーザー・1期間につき1レコード
    CONSTRAINT unique_user_period UNIQUE(user_id, period_start, period_end),
    CONSTRAINT chk_token_usage_period CHECK (period_end > period_start),
    CONSTRAINT chk_token_usage_positive CHECK (
        tokens_prompt >= 0 AND
        tokens_completion >= 0 AND
        tokens_total >= 0 AND
        cost_usd >= 0 AND
        request_count >= 0
    )
);

-- ===========================================
-- 3. usersテーブルの拡張
-- ===========================================

-- Stripe Customer ID
ALTER TABLE users
ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE;

-- サブスクリプションティア（free, basic, pro）
ALTER TABLE users
ADD COLUMN subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free';

-- サブスクリプションステータス（active, past_due, canceled, etc.）
ALTER TABLE users
ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'active';

-- Stripeサブスクリプション ID
ALTER TABLE users
ADD COLUMN stripe_subscription_id VARCHAR(255) UNIQUE;

-- 現在の課金期間
ALTER TABLE users
ADD COLUMN current_period_start TIMESTAMP;

ALTER TABLE users
ADD COLUMN current_period_end TIMESTAMP;

-- 制約の追加
ALTER TABLE users
ADD CONSTRAINT chk_subscription_tier
CHECK (subscription_tier IN ('free', 'basic', 'pro'));

ALTER TABLE users
ADD CONSTRAINT chk_subscription_status
CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'));

-- ===========================================
-- 4. ai_chat_sessionsテーブルの拡張
-- ===========================================

-- コスト（USD）
ALTER TABLE ai_chat_sessions
ADD COLUMN cost_usd DECIMAL(10, 6) DEFAULT 0;

-- コスト（JPY）※表示用
ALTER TABLE ai_chat_sessions
ADD COLUMN cost_jpy DECIMAL(10, 2) DEFAULT 0;

-- LLM料金情報へのスナップショット
ALTER TABLE ai_chat_sessions
ADD COLUMN prompt_cost_per_1m DECIMAL(10, 4);

ALTER TABLE ai_chat_sessions
ADD COLUMN completion_cost_per_1m DECIMAL(10, 4);

-- ===========================================
-- インデックス定義
-- ===========================================

-- LLM料金マスタテーブルのインデックス
CREATE INDEX idx_llm_pricing_provider ON llm_pricing(provider);
CREATE INDEX idx_llm_pricing_model ON llm_pricing(model);
CREATE INDEX idx_llm_pricing_active ON llm_pricing(is_active) WHERE is_active = true;
CREATE INDEX idx_llm_pricing_effective ON llm_pricing(effective_from, effective_to);

-- トークン使用量テーブルのインデックス
CREATE INDEX idx_token_usage_user ON token_usage(user_id);
CREATE INDEX idx_token_usage_period ON token_usage(period_start, period_end);
CREATE INDEX idx_token_usage_user_period ON token_usage(user_id, period_start DESC);
CREATE INDEX idx_token_usage_provider_breakdown ON token_usage USING GIN(provider_breakdown);

-- usersテーブルの新規インデックス
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);

-- ai_chat_sessionsテーブルの新規インデックス
CREATE INDEX idx_ai_sessions_cost ON ai_chat_sessions(cost_usd DESC) WHERE cost_usd > 0;

-- ===========================================
-- トリガー関数
-- ===========================================

-- token_usageのupdated_at自動更新トリガー
CREATE TRIGGER update_token_usage_updated_at BEFORE UPDATE ON token_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- llm_pricingのupdated_at自動更新トリガー
CREATE TRIGGER update_llm_pricing_updated_at BEFORE UPDATE ON llm_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- コメント定義
-- ===========================================

COMMENT ON TABLE llm_pricing IS 'LLMモデルの料金マスタ（履歴管理あり）';
COMMENT ON COLUMN llm_pricing.provider IS 'LLMプロバイダー（openai/anthropic/google）';
COMMENT ON COLUMN llm_pricing.model IS 'LLMモデル名';
COMMENT ON COLUMN llm_pricing.prompt_cost_per_1m IS 'プロンプトトークンの料金（USD/1M tokens）';
COMMENT ON COLUMN llm_pricing.completion_cost_per_1m IS '補完トークンの料金（USD/1M tokens）';
COMMENT ON COLUMN llm_pricing.effective_from IS '料金適用開始日時';
COMMENT ON COLUMN llm_pricing.effective_to IS '料金適用終了日時（NULL=現在も有効）';

COMMENT ON TABLE token_usage IS 'ユーザーごとの月次トークン使用量とコスト';
COMMENT ON COLUMN token_usage.period_start IS '課金期間開始日時';
COMMENT ON COLUMN token_usage.period_end IS '課金期間終了日時';
COMMENT ON COLUMN token_usage.provider_breakdown IS 'プロバイダー別の使用量内訳（JSON）';

COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe Customer ID';
COMMENT ON COLUMN users.subscription_tier IS 'サブスクリプションティア（free/basic/pro）';
COMMENT ON COLUMN users.subscription_status IS 'Stripeサブスクリプションステータス';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Stripeサブスクリプション ID';
COMMENT ON COLUMN users.current_period_start IS '現在の課金期間開始日時';
COMMENT ON COLUMN users.current_period_end IS '現在の課金期間終了日時';

COMMENT ON COLUMN ai_chat_sessions.cost_usd IS 'この処理のコスト（USD）';
COMMENT ON COLUMN ai_chat_sessions.cost_jpy IS 'この処理のコスト（JPY、表示用）';
COMMENT ON COLUMN ai_chat_sessions.prompt_cost_per_1m IS '実行時のプロンプトトークン料金（スナップショット）';
COMMENT ON COLUMN ai_chat_sessions.completion_cost_per_1m IS '実行時の補完トークン料金（スナップショット）';














