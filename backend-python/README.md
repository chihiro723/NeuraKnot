# BridgeSpeak AI Server (backend-python)

FastAPI + LangChain Agent + MCP ツール統合による AI 処理 API サーバー

## 概要

BridgeSpeak AI Server は、LLM エージェントと MCP（Model Context Protocol）ツールを統合した AI 処理 API です。OpenAI、Anthropic、Google Gemini の 3 つの LLM プロバイダーに対応し、20 個以上の基本ツールとリモート MCP サーバーからの動的ツール読み込みをサポートします。

## 主要機能

- ✅ **マルチ LLM 対応**: OpenAI (GPT-4o 等)、Anthropic (Claude-3.5 等)、Google (Gemini 等)
- ✅ **LangChain Agent**: AgentExecutor による自律的なツール選択と実行
- ✅ **リモート MCP 統合**: HTTP 経由で外部 MCP サーバーからツールを動的取得
- ✅ **ストリーミング**: SSE によるリアルタイムトークン配信
- ✅ **基本ツール 20 個**: 日時、計算、テキスト処理、データ変換、単位変換など
- ✅ **ペルソナシステム**: assistant、creative、analytical、concise の 4 種類
- ✅ **会話履歴管理**: コンテキストを保持した対話

## アーキテクチャ

```
app/
├── api/v1/          # エンドポイント（chat、tools、health）
├── models/          # Pydanticモデル（request、response）
├── services/        # ビジネスロジック（agent、mcp）
├── core/            # コア機能（config、exceptions、llm_factory、streaming）
├── tools/           # ツール（basic_tools 20個、remote_mcp_tool）
└── middleware/      # エラーハンドリング
```

## セットアップ

### 1. 依存関係のインストール

```bash
cd backend-python
pip install -r requirements.txt
```

### 2. 環境変数の設定

`.env.local.example`をコピーして`.env.local`を作成し、API キーを設定：

```bash
cp .env.local.example .env.local
```

`.env.local`を編集：

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

### 3. サーバー起動

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

または：

```bash
python -m app.main
```

### 4. Docker で起動

```bash
docker build -t bridgespeak-ai .
docker run -p 8001:8001 --env-file .env bridgespeak-ai
```

## API 仕様

### エンドポイント一覧

| メソッド | パス                   | 説明                   |
| -------- | ---------------------- | ---------------------- |
| GET      | `/`                    | ルート（サービス情報） |
| GET      | `/api/health`          | ヘルスチェック         |
| POST     | `/api/ai/chat`         | 通常チャット           |
| POST     | `/api/ai/chat/stream`  | ストリーミングチャット |
| POST     | `/api/tools/available` | 利用可能ツール一覧     |

### チャットリクエスト例

```bash
curl -X POST http://localhost:8001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "conversation_id": "conv456",
    "message": "東京の天気をSlackで共有して",
    "agent_config": {
      "provider": "openai",
      "model": "gpt-4o",
      "temperature": 0.7,
      "persona": "assistant"
    },
    "mcp_servers": [
      {
        "id": "weather-001",
        "name": "Weather API",
        "base_url": "https://weather-mcp.example.com",
        "enabled": true
      }
    ],
    "include_basic_tools": true
  }'
```

### ストリーミングチャット

```bash
curl -X POST http://localhost:8001/api/ai/chat/stream \
  -H "Content-Type: application/json" \
  -d '{ ... }' \
  --no-buffer
```

SSE イベント例：

```
data: {"type": "token", "content": "こんにちは"}
data: {"type": "tool_start", "tool_id": "get_current_time_tool", "input": {}}
data: {"type": "tool_end", "tool_id": "get_current_time_tool", "status": "completed", "output": "..."}
data: {"type": "done", "metadata": {}}
```

## 基本ツール一覧

### 日時関連（3 個）

- `get_current_time_tool`: 現在の日時取得
- `calculate_date_tool`: 日付計算
- `days_between_tool`: 日数計算

### 計算・数学（3 個）

- `calculate_tool`: 数式計算
- `statistics_tool`: 統計情報
- `percentage_tool`: パーセンテージ計算

### テキスト処理（4 個）

- `count_characters_tool`: 文字数カウント
- `text_case_tool`: 大文字小文字変換
- `search_text_tool`: テキスト検索
- `replace_text_tool`: テキスト置換

### データ変換（6 個）

- `format_json_tool`: JSON 整形
- `base64_encode_tool`: Base64 エンコード
- `base64_decode_tool`: Base64 デコード
- `url_encode_tool`: URL エンコード
- `url_decode_tool`: URL デコード

### セキュリティ（2 個）

- `generate_uuid_tool`: UUID 生成
- `hash_text_tool`: ハッシュ生成

### 単位変換（2 個）

- `convert_temperature_tool`: 温度変換
- `convert_length_tool`: 長さ変換

## ペルソナ

- **assistant**: 親切で丁寧なアシスタント
- **creative**: 創造的でクリエイティブなパートナー
- **analytical**: 論理的で分析的な専門家
- **concise**: 簡潔で要点を絞った専門家

## エラーハンドリング

カスタム例外 15 種類以上：

- `VALIDATION_ERROR` (400)
- `INVALID_MODEL` (400)
- `TOOLS_REQUIRED_BUT_NONE_AVAILABLE` (422)
- `MCP_CONNECTION_ERROR` (503)
- `LLM_API_ERROR` (503)
- など

## LangSmith 統合

`.env`で設定：

```env
LANGSMITH_TRACING_V2=true
LANGSMITH_API_KEY=ls__...
LANGSMITH_PROJECT=bridgespeak
```

## 開発

### ログ

ログはコンソールに出力されます。レベルは`INFO`です。

### テスト

```bash
pytest tests/
```

## ライセンス

MIT License

## サポート

問題が発生した場合は、GitHub の Issue を作成してください。
