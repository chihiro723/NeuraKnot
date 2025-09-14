-- データベース初期化スクリプト
-- 基本的なテーブル構造を作成

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- テキストテーブル
CREATE TABLE IF NOT EXISTS texts (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_texts_created_at ON texts(created_at);
CREATE INDEX IF NOT EXISTS idx_texts_title ON texts(title);

-- サンプルデータ挿入
INSERT INTO users (email, name) VALUES 
    ('admin@example.com', 'Admin User'),
    ('user@example.com', 'Test User')
ON CONFLICT (email) DO NOTHING;

-- サンプルテキストデータ挿入
INSERT INTO texts (content, title) VALUES 
    ('これはサンプルのテキストです。DDDアーキテクチャを使用して実装されています。', 'サンプルテキスト1'),
    ('テキスト保存APIのテスト用データです。', 'サンプルテキスト2')
ON CONFLICT DO NOTHING;

