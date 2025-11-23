-- ===========================================
-- NeuraKnot Database Schema v1.0 - Rollback
-- 全テーブル・トリガー・関数を削除
-- ===========================================

-- トリガーの削除
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
DROP TRIGGER IF EXISTS update_user_service_configs_updated_at ON user_service_configs;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS update_ai_agents_updated_at ON ai_agents;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- 関数の削除
DROP FUNCTION IF EXISTS update_conversation_on_message();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- インデックスの削除（CASCADE でテーブル削除時に自動削除されるが明示的に記載）
DROP INDEX IF EXISTS idx_ai_agent_services_enabled;
DROP INDEX IF EXISTS idx_ai_agent_services_service;
DROP INDEX IF EXISTS idx_ai_agent_services_agent;
DROP INDEX IF EXISTS idx_user_service_configs_enabled;
DROP INDEX IF EXISTS idx_user_service_configs_service;
DROP INDEX IF EXISTS idx_user_service_configs_user;
DROP INDEX IF EXISTS idx_ai_tool_usage_input;
DROP INDEX IF EXISTS idx_ai_tool_usage_executed;
DROP INDEX IF EXISTS idx_ai_tool_usage_tool;
DROP INDEX IF EXISTS idx_ai_tool_usage_message;
DROP INDEX IF EXISTS idx_ai_tool_usage_session;
DROP INDEX IF EXISTS idx_ai_sessions_status;
DROP INDEX IF EXISTS idx_ai_sessions_agent;
DROP INDEX IF EXISTS idx_ai_sessions_conversation;
DROP INDEX IF EXISTS idx_ai_sessions_user;
DROP INDEX IF EXISTS idx_messages_ai_session;
DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_messages_conversation;
DROP INDEX IF EXISTS idx_conversations_agent;
DROP INDEX IF EXISTS idx_conversations_user;
DROP INDEX IF EXISTS idx_ai_agents_streaming;
DROP INDEX IF EXISTS idx_ai_agents_last_chat;
DROP INDEX IF EXISTS idx_ai_agents_active;
DROP INDEX IF EXISTS idx_ai_agents_user;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_users_status;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_cognito_user_id;

-- テーブルの削除（外部キー制約の依存関係を考慮した順序）
DROP TABLE IF EXISTS ai_agent_services CASCADE;
DROP TABLE IF EXISTS user_service_configs CASCADE;
DROP TABLE IF EXISTS ai_tool_usage CASCADE;
DROP TABLE IF EXISTS ai_chat_sessions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS ai_agents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 拡張機能の削除（他のスキーマで使用されている可能性があるため注意）
-- DROP EXTENSION IF EXISTS "uuid-ossp";














