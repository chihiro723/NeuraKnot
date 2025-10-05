-- ユーザーテーブルとその関連要素を削除

-- トリガーを削除
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- トリガー関数を削除
DROP FUNCTION IF EXISTS update_updated_at_column();

-- インデックスを削除
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_users_status;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_cognito_user_id;

-- テーブルを削除（制約も自動で削除される）
DROP TABLE IF EXISTS users;

-- UUID拡張を削除（他のテーブルで使用していない場合のみ）
-- DROP EXTENSION IF EXISTS "uuid-ossp";
