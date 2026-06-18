-- ===========================================
-- seed 由来の不要な LLM 単価をクリーンアップ
-- ===========================================
--
-- 単価は「管理ダッシュボードに登録されたモデル（llm_models）」のみが持つべき、
-- という方針に統一する。過去の seed では llm_models に存在しないモデル
-- （例: gpt-4o, o1-mini, claude-3-*, gemini-1.x 等）の単価まで投入されていたため、
-- ここで孤立した単価行を削除する。
--
-- 安全策: ai_chat_sessions.pricing_id から参照されている行（過去コストの
-- スナップショット根拠）は削除しない。実運用では孤立単価が参照されることは
-- ないが、外部キー違反と履歴破壊を防ぐための保険。

DELETE FROM llm_pricing p
WHERE NOT EXISTS (
        SELECT 1
        FROM llm_models m
        WHERE m.provider = p.provider
          AND m.model = p.model
    )
  AND NOT EXISTS (
        SELECT 1
        FROM ai_chat_sessions s
        WHERE s.pricing_id = p.id
    );
