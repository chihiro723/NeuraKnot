DROP INDEX IF EXISTS idx_ai_chat_sessions_group_chat_id;
ALTER TABLE ai_chat_sessions DROP CONSTRAINT IF EXISTS chk_chat_reference;
ALTER TABLE ai_chat_sessions DROP COLUMN IF EXISTS group_chat_id;
ALTER TABLE ai_chat_sessions ALTER COLUMN conversation_id SET NOT NULL;



