-- グループチャットにシステムプロンプトカラムを追加
ALTER TABLE group_chats ADD COLUMN system_prompt TEXT;

-- コメント追加
COMMENT ON COLUMN group_chats.system_prompt IS 'グループチャット全体に適用されるシステムプロンプト';



