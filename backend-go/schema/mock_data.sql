-- ===========================================
-- Mock Data - 開発用テストデータ
-- ===========================================
-- 現在モックデータは使用していません
-- 将来の開発・テストで使用予定

-- ユーザーモックデータの例
-- INSERT INTO users (id, cognito_user_id, email, display_name, created_at, updated_at) VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', 'cognito-user-1', 'test@example.com', 'テストユーザー', NOW(), NOW());

-- AIエージェントモックデータの例
-- INSERT INTO ai_agents (id, user_id, name, description, persona_type, provider, model, temperature, max_tokens, tools_enabled, streaming_enabled, is_active, message_count, created_at, updated_at) VALUES
-- ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'テストエージェント', 'テスト用のAIエージェント', 'assistant', 'openai', 'gpt-4', 0.7, 2000, true, false, true, 0, NOW(), NOW());

-- 会話モックデータの例
-- INSERT INTO conversations (id, user_id, ai_agent_id, message_count, last_message_at, created_at, updated_at) VALUES
-- ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 0, NULL, NOW(), NOW());
