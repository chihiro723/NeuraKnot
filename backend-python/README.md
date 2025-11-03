# NeuraKnot Backend Python

FastAPI + LangChain Agent + MCP ツール統合による AI 処理 API サーバー

## 概要

NeuraKnot Backend Python は、LLM エージェントと MCP（Model Context Protocol）ツールを統合した AI 処理 API です。OpenAI、Anthropic、Google Gemini の 3 つの LLM プロバイダーに対応し、20 個の基本ツールと 51 個の API Wrapper ツール（Notion、Brave Search、Slack、Google Calendar）、リモート MCP サーバーからの動的ツール読み込みをサポートします。

## 主要機能

- ✅ **マルチ LLM 対応**: OpenAI (GPT-4o 等)、Anthropic (Claude-3.5 等)、Google (Gemini 等)
- ✅ **LangChain Agent**: AgentExecutor による自律的なツール選択と実行
- ✅ **リモート MCP 統合**: HTTP 経由で外部 MCP サーバーからツールを動的取得
- ✅ **ストリーミング**: SSE によるリアルタイムトークン配信
- ✅ **基本ツール 20 個**: 日時、計算、テキスト処理、データ変換、単位変換など
- ✅ **API Wrapper 51 個**: Notion (20)、Brave Search (5)、Slack (10)、Google Calendar (16)
- ✅ **ペルソナシステム**: assistant、creative、analytical、concise の 4 種類
- ✅ **会話履歴管理**: コンテキストを保持した対話

## アーキテクチャ

```
app/
├── api/v1/                    # エンドポイント（chat、tools、health）
├── models/                    # Pydanticモデル（request、response）
├── services/                  # ビジネスロジック
│   ├── agent_service.py       # LangChain Agent管理
│   ├── mcp_service.py         # MCP統合
│   └── api_wrappers/          # API Wrapperサービス（51ツール）
│       ├── notion_service.py          # Notion (20ツール)
│       ├── brave_search_service.py    # Brave Search (5ツール)
│       ├── slack_service.py           # Slack (10ツール)
│       └── google_calendar_service.py # Google Calendar (16ツール)
├── core/                      # コア機能（config、exceptions、llm_factory、streaming）
├── tools/                     # 基本ツール（20個）
└── middleware/                # エラーハンドリング
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
docker build -t neuraKnot-ai .
docker run -p 8001:8001 --env-file .env neuraKnot-ai
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
      "model": "gpt-4.1-mini",
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

## API Wrapper サービス（51 ツール）

### 📝 Notion（20 ツール）

**説明**: Notion の全機能を操作：ページ、データベース、ブロック、コメント、ユーザー管理  
**認証**: Notion Integration Token  
**API Version**: 2022-06-28（最新安定版）

#### ページ管理

- `search_pages`: ページ検索
- `get_page_content`: ページ内容取得（全ブロックタイプ対応）
- `create_page`: ページ作成
- `update_page_title`: ページタイトル更新
- `update_page_properties`: ページプロパティ更新
- `delete_page`: ページアーカイブ

#### データベース管理

- `search_databases`: データベース検索
- `query_database`: データベースクエリ（フィルタ・ソート対応）
- `create_database`: データベース作成
- `update_database`: データベース更新
- `create_database_page`: データベースページ作成

#### ブロック管理

- `append_blocks`: ブロック追加（10 種類以上のブロックタイプ対応）
- `get_blocks_with_ids`: ブロック ID 付き取得
- `get_block`: ブロック詳細取得
- `update_block`: ブロック更新
- `delete_block`: ブロックアーカイブ

#### コメント・ユーザー

- `get_comments`: コメント取得
- `add_comment`: コメント追加
- `list_users`: ユーザー一覧
- `get_user`: ユーザー詳細

---

### 🔍 Brave Search（5 ツール）

**説明**: Brave Search API による検索: Web/ニュース/動画（無料）、画像/AI 要約（有料プランのみ）  
**認証**: Brave Search API Key  
**プラン制限**: 画像検索と AI 要約は有料プランのみ

#### 検索機能

- `web_search`: Web 検索（国・言語・期間・セーフサーチフィルタ対応）
- `news_search`: ニュース検索（最新情報取得）
- `video_search`: 動画検索（無料プラン対応）
- `image_search`: 画像検索（有料プランのみ）
- `summarizer_search`: AI 要約検索（有料プランのみ）

---

### 💬 Slack（10 ツール）

**説明**: Slack 連携: メッセージ送信/更新/削除、チャンネル管理、ユーザー情報、ファイル共有、検索  
**認証**: Bot User OAuth Token（xoxb-で始まる）  
**エラーハンドリング**: 27 種類のエラーコード対応 + HTTP ステータスエラー + レート制限対応

#### メッセージ管理

- `send_message`: メッセージ送信（スレッド対応）
- `update_message`: メッセージ更新
- `delete_message`: メッセージ削除

#### チャンネル・スレッド管理

- `list_channels`: チャンネル一覧
- `get_channel_history`: チャンネル履歴
- `get_thread_replies`: スレッド返信取得
- `add_reaction`: リアクション追加

#### ユーザー・検索

- `list_users`: ユーザー一覧
- `get_user_info`: ユーザー詳細
- `search_messages`: メッセージ検索

---

### 📅 Google Calendar（16 ツール）

**説明**: Google カレンダー連携: イベント/カレンダー/参加者管理、空き時間検索  
**認証**: OAuth 2.0 Access Token  
**エラーハンドリング**: 15 種類のエラー理由対応 + HTTP ステータスエラー + レート制限対応

#### イベント管理

- `get_today_events`: 今日の予定取得
- `get_upcoming_events`: 今後 N 日間の予定取得
- `create_event`: イベント作成
- `create_quick_event`: 自然言語でイベント作成
- `get_event_details`: イベント詳細
- `update_event`: イベント更新
- `delete_event`: イベント削除
- `search_events`: イベント検索
- `move_event`: イベント移動

#### カレンダー管理

- `list_calendars`: カレンダー一覧
- `get_calendar`: カレンダー詳細
- `create_calendar`: カレンダー作成
- `update_calendar`: カレンダー更新
- `delete_calendar`: カレンダー削除

#### その他

- `check_freebusy`: 空き時間検索（複数カレンダー対応）
- `get_colors`: カラーパレット取得

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
LANGSMITH_PROJECT=neuraKnot
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
