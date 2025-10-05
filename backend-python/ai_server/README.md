# AI Hybrid Messaging API Server

セキュアな AI 応答生成と外部サービス統合を提供するハイブリッドメッセージングアプリ用の Python FastAPI バックエンドサーバーです。

## 🚀 主要機能

- **セキュアな AI 応答生成**: 機密情報をフロントエンドに送信せず、サーバーサイドで安全に処理
- **多層セキュリティアーキテクチャ**: 公開情報と機密情報の厳格な分離
- **AI エージェント管理**: カスタムパーソナリティと設定管理
- **MCP（Model Context Protocol）統合基盤**: 外部サービス連携の拡張可能な基盤
- **機密情報暗号化管理**: API キーや認証情報の安全な保存・管理

## 🏗️ アーキテクチャ

### 技術スタック

- **Framework**: FastAPI
- **AI Framework**: LangChain
- **LLM Provider**: OpenAI API (GPT-3.5/4)
- **Database**: PostgreSQL
- **Authentication**: AWS Cognito (JWT)
- **Encryption**: cryptography (Fernet)
- **Cache/Rate Limiting**: Redis
- **Deployment**: Docker

### セキュリティ原則

1. **機密情報の絶対分離**: API キー、パスワード、OAuth トークンは絶対にフロントエンドに送信しない
2. **暗号化保存**: 全ての機密情報は Fernet 暗号化して保存
3. **認証・認可**: 全てのエンドポイントで適切な権限チェック
4. **レート制限**: DoS 攻撃対策
5. **監査ログ**: セキュリティイベントの記録

## 📁 プロジェクト構造

```
ai_server/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPIアプリケーション
│   ├── config.py                  # 設定管理
│   ├── models/                    # Pydanticモデル
│   │   ├── chat.py               # チャット関連モデル
│   │   ├── agent.py              # エージェント関連モデル
│   │   └── auth.py               # 認証関連モデル
│   ├── services/                  # ビジネスロジック
│   │   ├── chat_service.py       # チャット処理
│   │   ├── agent_service.py      # エージェント管理
│   │   ├── memory_service.py     # 記憶・学習管理
│   │   └── secret_manager.py     # 機密情報管理
│   ├── security/                  # セキュリティ関連
│   │   ├── auth.py               # 認証・認可
│   │   ├── encryption.py         # 暗号化処理
│   │   └── rate_limit.py         # レート制限
│   ├── mcp/                      # MCP統合
│   │   ├── mcp_client.py         # MCPクライアント基盤
│   │   └── services/             # 個別MCPサービス
│   ├── database/                 # データベース関連
│   │   └── postgres_client.py    # PostgreSQL接続
│   ├── api/                      # APIルーター
│   │   └── v1/
│   │       ├── chat.py           # チャットエンドポイント
│   │       ├── agents.py         # エージェント管理
│   │       ├── mcp.py            # MCP設定
│   │       └── health.py         # ヘルスチェック
│   └── utils/                    # ユーティリティ
│       ├── logger.py             # ログ設定
│       └── exceptions.py         # カスタム例外
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚦 クイックスタート

### 1. 環境設定

```bash
# リポジトリのクローン
git clone <repository-url>
cd ai_server

# 環境変数ファイルのコピー
cp .env.example .env
```

### 2. 環境変数の設定

`.env` ファイルを編集して必要な設定を入力：

```bash
# FastAPI設定
ENVIRONMENT=development
API_HOST=0.0.0.0
API_PORT=8000

# PostgreSQL設定
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=go_backend

# AWS Cognito設定
AWS_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=your_cognito_user_pool_id
COGNITO_CLIENT_ID=your_cognito_client_id
COGNITO_CLIENT_SECRET=your_cognito_client_secret

# AI設定
OPENAI_API_KEY=your_openai_api_key

# セキュリティ
ENCRYPTION_KEY=your_fernet_encryption_key
JWT_SECRET_KEY=your_jwt_secret

# その他
REDIS_URL=redis://localhost:6379
LOG_LEVEL=INFO
```

### 3. 依存関係のインストール

```bash
# Python仮想環境の作成
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate    # Windows

# 依存関係のインストール
pip install -r requirements.txt
```

### 4. アプリケーションの起動

```bash
# 開発サーバーの起動
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Docker での起動（推奨）

```bash
# Docker Composeで起動
docker-compose up -d

# ログの確認
docker-compose logs -f ai-server
```

## 📡 API エンドポイント

### チャット関連

- `POST /api/v1/chat/message` - AI 応答生成
- `GET /api/v1/chat/history/{agent_id}` - 会話履歴取得

### エージェント管理

- `POST /api/v1/agents` - 新規エージェント作成
- `GET /api/v1/agents/{agent_id}` - エージェント情報取得
- `PUT /api/v1/agents/{agent_id}` - エージェント更新
- `GET /api/v1/agents/presets` - プリセット一覧

### 機密設定管理

- `POST /api/v1/agents/{agent_id}/secrets` - 機密設定保存
- `PUT /api/v1/agents/{agent_id}/secrets` - 機密設定更新
- `DELETE /api/v1/agents/{agent_id}/secrets` - 機密設定削除

### MCP 統合

- `POST /api/v1/mcp/{agent_id}/configure` - MCP 設定
- `GET /api/v1/mcp/services` - 利用可能 MCP サービス一覧
- `POST /api/v1/mcp/{agent_id}/test` - MCP 接続テスト

### システム

- `GET /api/v1/health` - ヘルスチェック

## 🔒 セキュリティ設定

### 暗号化キーの生成

```python
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```

### JWT 秘密鍵の生成

```bash
openssl rand -hex 32
```

## 🧪 テスト

```bash
# テストの実行
pytest

# カバレッジ付きテスト
pytest --cov=app
```

## 📊 監視とログ

### ログファイル

- `logs/app.log` - アプリケーションログ
- `logs/error.log` - エラーログ
- `logs/security.log` - セキュリティイベントログ
- `logs/metrics.log` - API 利用量ログ

### メトリクス

- API 応答時間
- エラー率
- レート制限違反
- セキュリティイベント

## 🚀 デプロイメント

### Docker での本番デプロイ

```bash
# 本番環境での起動
docker-compose --profile production up -d

# スケーリング
docker-compose up -d --scale ai-server=3
```

### 環境別設定

- **Development**: デバッグ情報と API 文書が有効
- **Production**: セキュリティ強化、API 文書無効
- **Testing**: テスト用データベースとモック

## 🔧 トラブルシューティング

### よくある問題

1. **PostgreSQL 接続エラー**

   - 環境変数の設定を確認
   - ネットワーク接続を確認

2. **OpenAI API エラー**

   - API キーの有効性を確認
   - レート制限の確認

3. **暗号化エラー**
   - 暗号化キーの形式を確認
   - キーの長さを確認

### ログの確認

```bash
# アプリケーションログ
tail -f logs/app.log

# エラーログ
tail -f logs/error.log

# Dockerログ
docker-compose logs -f ai-server
```

## 🤝 コントリビューション

1. フォークする
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルをご覧ください。

## 📞 サポート

- 🐛 バグ報告: [Issues](https://github.com/your-org/ai-server/issues)
- 💬 質問: [Discussions](https://github.com/your-org/ai-server/discussions)
- 📧 メール: support@yourcompany.com
