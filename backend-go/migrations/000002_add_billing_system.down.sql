-- ===========================================
-- Billing System Migration Rollback
-- サブスクリプション課金システムの削除
-- ===========================================

-- トリガーの削除
DROP TRIGGER IF EXISTS update_token_usage_updated_at ON token_usage;
DROP TRIGGER IF EXISTS update_llm_pricing_updated_at ON llm_pricing;

-- インデックスの削除
DROP INDEX IF EXISTS idx_ai_sessions_cost;
DROP INDEX IF EXISTS idx_users_subscription_status;
DROP INDEX IF EXISTS idx_users_subscription_tier;
DROP INDEX IF EXISTS idx_users_stripe_customer;
DROP INDEX IF EXISTS idx_token_usage_provider_breakdown;
DROP INDEX IF EXISTS idx_token_usage_user_period;
DROP INDEX IF EXISTS idx_token_usage_period;
DROP INDEX IF EXISTS idx_token_usage_user;
DROP INDEX IF EXISTS idx_llm_pricing_effective;
DROP INDEX IF EXISTS idx_llm_pricing_active;
DROP INDEX IF EXISTS idx_llm_pricing_model;
DROP INDEX IF EXISTS idx_llm_pricing_provider;

-- ai_chat_sessionsテーブルのカラム削除
ALTER TABLE ai_chat_sessions
DROP COLUMN IF EXISTS completion_cost_per_1m,
DROP COLUMN IF EXISTS prompt_cost_per_1m,
DROP COLUMN IF EXISTS cost_jpy,
DROP COLUMN IF EXISTS cost_usd;

-- usersテーブルのカラム削除
ALTER TABLE users
DROP CONSTRAINT IF EXISTS chk_subscription_status,
DROP CONSTRAINT IF EXISTS chk_subscription_tier,
DROP COLUMN IF EXISTS current_period_end,
DROP COLUMN IF EXISTS current_period_start,
DROP COLUMN IF EXISTS stripe_subscription_id,
DROP COLUMN IF EXISTS subscription_status,
DROP COLUMN IF EXISTS subscription_tier,
DROP COLUMN IF EXISTS stripe_customer_id;

-- テーブルの削除
DROP TABLE IF EXISTS token_usage;
DROP TABLE IF EXISTS llm_pricing;

