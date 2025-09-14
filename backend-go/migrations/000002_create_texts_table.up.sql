-- テキストテーブルを作成
CREATE TABLE texts (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックスを作成
CREATE INDEX idx_texts_created_at ON texts(created_at);
CREATE INDEX idx_texts_title ON texts(title);

-- サンプルテキストデータを挿入
INSERT INTO texts (content, title) VALUES 
    ('これはサンプルのテキストです。DDDアーキテクチャを使用して実装されています。', 'サンプルテキスト1'),
    ('テキスト保存APIのテスト用データです。', 'サンプルテキスト2')
ON CONFLICT DO NOTHING;
