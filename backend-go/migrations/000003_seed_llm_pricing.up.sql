-- ===========================================
-- LLM料金マスタの初期データ投入
-- 2024年11月時点の料金情報
-- analytics/pricing.goのハードコードされたデータを基にした信頼性の高いデータ
-- ===========================================

-- 既存データをクリア（再実行時のため）
TRUNCATE TABLE llm_pricing RESTART IDENTITY CASCADE;

-- ===========================================
-- OpenAI料金
-- ===========================================
INSERT INTO llm_pricing (provider, model, prompt_cost_per_1m, completion_cost_per_1m, is_active, notes) VALUES
-- GPT-4oシリーズ（実在モデル）
('openai', 'gpt-4o', 2.50, 10.00, true, 'GPT-4o standard model - High performance'),
('openai', 'gpt-4o-mini', 0.15, 0.60, true, 'GPT-4o mini model - Cost effective'),

-- GPT-4.1シリーズ（将来モデル - GPT-4oベース）
('openai', 'gpt-4.1', 2.50, 10.00, true, 'GPT-4.1 standard model (future release)'),
('openai', 'gpt-4.1-mini', 0.15, 0.60, true, 'GPT-4.1 mini model (future release)'),
('openai', 'gpt-4.1-nano', 0.05, 0.20, true, 'GPT-4.1 nano model (future release) - Ultra low cost'),

-- o1シリーズ（推論特化型）
('openai', 'o1-preview', 15.00, 60.00, true, 'o1 preview reasoning model - Advanced reasoning'),
('openai', 'o1-mini', 3.00, 12.00, true, 'o1 mini reasoning model - Efficient reasoning');

-- ===========================================
-- Anthropic料金
-- ===========================================
INSERT INTO llm_pricing (provider, model, prompt_cost_per_1m, completion_cost_per_1m, is_active, notes) VALUES
-- Claude 3.5シリーズ（実在モデル）
('anthropic', 'claude-3-5-sonnet-20241022', 3.00, 15.00, true, 'Claude 3.5 Sonnet (2024-10-22) - Latest flagship'),

-- Claude 3シリーズ（実在モデル）
('anthropic', 'claude-3-opus-20240229', 15.00, 75.00, true, 'Claude 3 Opus (2024-02-29) - Most capable'),
('anthropic', 'claude-3-haiku-20240307', 0.25, 1.25, true, 'Claude 3 Haiku (2024-03-07) - Fastest and most compact'),

-- Claude 4.xシリーズ（将来モデル - Claude 3.xベース）
('anthropic', 'claude-sonnet-4-5-20250929', 3.00, 15.00, true, 'Claude Sonnet 4.5 (future, 2025-09-29)'),
('anthropic', 'claude-haiku-4-5-20251001', 0.25, 1.25, true, 'Claude Haiku 4.5 (future, 2025-10-01)'),
('anthropic', 'claude-opus-4-1-20250805', 15.00, 75.00, true, 'Claude Opus 4.1 (future, 2025-08-05)');

-- ===========================================
-- Google料金
-- ===========================================
INSERT INTO llm_pricing (provider, model, prompt_cost_per_1m, completion_cost_per_1m, is_active, notes) VALUES
-- Gemini 1.5シリーズ（実在モデル）
('google', 'gemini-1.5-pro', 3.50, 10.50, true, 'Gemini 1.5 Pro - Advanced multimodal'),
('google', 'gemini-1.5-flash', 0.075, 0.30, true, 'Gemini 1.5 Flash - Fast and versatile'),
('google', 'gemini-1.0-pro', 0.50, 1.50, true, 'Gemini 1.0 Pro - Previous generation'),

-- Gemini 2.xシリーズ（将来モデル - Gemini 1.5ベース）
('google', 'gemini-2.5-pro', 3.50, 10.50, true, 'Gemini 2.5 Pro (future)'),
('google', 'gemini-2.5-flash', 0.075, 0.30, true, 'Gemini 2.5 Flash (future)'),
('google', 'gemini-2.5-flash-lite', 0.04, 0.16, true, 'Gemini 2.5 Flash Lite (future) - Ultra efficient'),

-- Gemini 2.0シリーズ
('google', 'gemini-2.0-flash', 0.10, 0.40, true, 'Gemini 2.0 Flash - Next generation fast model');

-- ===========================================
-- データ確認
-- ===========================================
SELECT
    provider,
    COUNT(*) as model_count,
    MIN(prompt_cost_per_1m) as min_prompt_cost,
    MAX(prompt_cost_per_1m) as max_prompt_cost
FROM llm_pricing
WHERE is_active = true
GROUP BY provider
ORDER BY provider;

