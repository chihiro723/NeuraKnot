-- ===========================================
-- コスト記録の統合・スナップショット化
--   1. ai_chat_sessions に pricing_id（監査用の参照）を追加
--   2. 既存セッションのコストを started_at 時点の単価でバックフィル
--   3. llm_models と llm_pricing の整合性を検証（不足を警告）
-- 目的: コストは利用時点で確定・保存し、以降の単価改定でも過去コストを不変にする。
-- ===========================================

-- 1. pricing_id カラム追加（どの単価行でコストを確定したかの監査用）
ALTER TABLE ai_chat_sessions
ADD COLUMN IF NOT EXISTS pricing_id UUID REFERENCES llm_pricing(id);

COMMENT ON COLUMN ai_chat_sessions.pricing_id IS 'コスト確定に用いた llm_pricing 行のID（監査用・任意）';

CREATE INDEX IF NOT EXISTS idx_ai_sessions_pricing_id ON ai_chat_sessions(pricing_id);

-- 2. 既存セッションのコストバックフィル（1回限り）
--    cost_usd 未設定（0 または NULL）かつトークン消費のある行のみを対象に、
--    started_at 時点で有効な単価（無ければ最も近い有効単価）でコストを確定する。
-- PostgreSQL では UPDATE 対象テーブルを FROM の LATERAL から参照できないため、
-- 適用すべき単価行は WHERE 句内の相関サブクエリ（started_at 基準で1件選定）で特定する。
UPDATE ai_chat_sessions s
SET
    prompt_cost_per_1m = p.prompt_cost_per_1m,
    completion_cost_per_1m = p.completion_cost_per_1m,
    cost_usd = (s.tokens_prompt::numeric / 1000000.0 * p.prompt_cost_per_1m)
             + (s.tokens_completion::numeric / 1000000.0 * p.completion_cost_per_1m),
    pricing_id = p.id
FROM llm_pricing p
WHERE p.id = (
    SELECT lp.id
    FROM llm_pricing lp
    WHERE lp.provider = s.provider
      AND lp.model = s.model
      AND lp.is_active = true
    -- started_at 時点で有効な版を最優先し、無ければ最新の有効版にフォールバック
    ORDER BY (lp.effective_from <= s.started_at) DESC, lp.effective_from DESC
    LIMIT 1
  )
  AND s.tokens_total > 0 AND COALESCE(s.cost_usd, 0) = 0;

-- 3. llm_models に存在し、有効な llm_pricing が無いモデルを検出して警告
--    （移行を失敗させず、運用者が単価登録すべき対象を可視化する）
DO $$
DECLARE
    missing_count INTEGER;
    missing_rec RECORD;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM llm_models m
    WHERE NOT EXISTS (
        SELECT 1 FROM llm_pricing p
        WHERE p.provider = m.provider AND p.model = m.model AND p.is_active = true
    );

    IF missing_count > 0 THEN
        RAISE WARNING 'llm_pricing が未登録のモデルが % 件あります。管理画面から単価を登録してください。', missing_count;
        FOR missing_rec IN
            SELECT m.provider, m.model
            FROM llm_models m
            WHERE NOT EXISTS (
                SELECT 1 FROM llm_pricing p
                WHERE p.provider = m.provider AND p.model = m.model AND p.is_active = true
            )
        LOOP
            RAISE WARNING '  単価未登録: provider=% model=%', missing_rec.provider, missing_rec.model;
        END LOOP;
    END IF;
END $$;
