-- conversation_idをNULL許可に変更
ALTER TABLE ai_chat_sessions ALTER COLUMN conversation_id DROP NOT NULL;

-- group_chat_idカラムを追加
ALTER TABLE ai_chat_sessions ADD COLUMN group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;

-- チェック制約: conversation_idまたはgroup_chat_idのいずれかが必須
ALTER TABLE ai_chat_sessions ADD CONSTRAINT chk_chat_reference 
  CHECK ((conversation_id IS NOT NULL AND group_chat_id IS NULL) OR (conversation_id IS NULL AND group_chat_id IS NOT NULL));

-- group_chat_id用のインデックス追加
CREATE INDEX idx_ai_chat_sessions_group_chat_id ON ai_chat_sessions(group_chat_id);



