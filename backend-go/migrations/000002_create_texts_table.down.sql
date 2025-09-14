-- テキストテーブルを削除
DROP INDEX IF EXISTS idx_texts_title;
DROP INDEX IF EXISTS idx_texts_created_at;
DROP TABLE IF EXISTS texts;
