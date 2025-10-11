-- ツール使用履歴テーブルを作成
CREATE TABLE ai_tool_usage (
    -- プライマリキー
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 関連
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    
    -- ツール情報
    tool_name VARCHAR(255) NOT NULL,
    tool_category VARCHAR(100) DEFAULT 'basic',
    -- basic: 基本ツール（日時、計算など）
    -- mcp: MCPツール
    
    -- 実行情報
    input_data JSONB NOT NULL,
    output_data TEXT,
    
    -- ステータス
    status VARCHAR(50) NOT NULL,
    -- completed: 完了
    -- failed: 失敗
    
    error_message TEXT,
    execution_time_ms INTEGER,
    
    -- タイムスタンプ
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT chk_tool_status CHECK (status IN ('completed', 'failed'))
);

-- インデックスを作成
CREATE INDEX idx_ai_tool_usage_session ON ai_tool_usage(session_id);
CREATE INDEX idx_ai_tool_usage_tool ON ai_tool_usage(tool_name);
CREATE INDEX idx_ai_tool_usage_executed ON ai_tool_usage(executed_at DESC);
CREATE INDEX idx_ai_tool_usage_input ON ai_tool_usage USING GIN(input_data);

-- コメント
COMMENT ON TABLE ai_tool_usage IS 'AIが使用したツールの実行履歴';
COMMENT ON COLUMN ai_tool_usage.tool_category IS 'ツールカテゴリ（basic: 基本ツール, mcp: MCPツール）';
COMMENT ON COLUMN ai_tool_usage.input_data IS 'ツールへの入力データ（JSON形式）';
COMMENT ON COLUMN ai_tool_usage.execution_time_ms IS 'ツール実行時間（ミリ秒）';

