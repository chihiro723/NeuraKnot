-- UUID拡張を有効化（PostgreSQL 13以降は標準で利用可能）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ユーザーテーブルを作成
CREATE TABLE users (
    -- プライマリキー（UUID）
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- AWS Cognito連携用のユーザーID（一意制約）
    -- CognitoのUsernameはメールアドレスと同じになる
    cognito_user_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- メールアドレス（一意制約）
    -- Cognitoではこれがusernameとしても機能する
    email VARCHAR(255) UNIQUE NOT NULL,
    
    -- 表示名（画面に表示される名前）
    -- ユーザーが自由に変更できる表示用の名前
    display_name VARCHAR(255) NOT NULL,
    
    -- ユーザーステータス（active, inactive, suspended, deleted）
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    
    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックスを作成（パフォーマンス最適化）
CREATE INDEX idx_users_cognito_user_id ON users(cognito_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ステータスのチェック制約
ALTER TABLE users ADD CONSTRAINT chk_users_status 
    CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'));

-- updated_at自動更新用のトリガー関数を作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at自動更新トリガーを設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
