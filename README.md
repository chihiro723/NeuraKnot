# BridgeSpeak - AI 分身チャットアプリケーション

AI と人間の境界を消すハイブリッドメッセージングアプリケーション。

## 🎯 概要

人間と AI エージェントが自然にコミュニケーションできるメッセージングアプリです。複数の個性を持つ AI エージェントとリアルタイムで対話できます。

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   Next.js 15    │◄──►│   Go + Python   │◄──►│   PostgreSQL    │
│   TypeScript    │    │   REST + AI     │    │   Redis Cache   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### プロジェクト構造

```
bridgespeak/
├── frontend/              # Next.js (App Router)
├── backend-go/            # Go API (クリーンアーキテクチャ)
├── backend-python/        # Python AI Server (FastAPI + LangChain)
├── docker-compose/
│   ├── dev.yml           # 開発環境
│   └── prod.yml          # 本番環境
└── docs/                 # ドキュメント
```

## 🛠️ 技術スタック

### フロントエンド

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** でスタイリング
- **AWS Cognito** で認証

### バックエンド

- **Go 1.25** - REST API (DDD/クリーンアーキテクチャ)
- **Python 3.11** - AI 処理 (FastAPI + LangChain)
- **PostgreSQL 15** - メインデータベース
- **Redis 7** - キャッシュ

### インフラ

- **Docker** + **Docker Compose**
- **AWS** (ECS, RDS, Cognito)
- **Terraform** で IaC

## 🚀 クイックスタート

### 1. リポジトリのクローン

```bash
git clone [repository-url]
cd bridgespeak
```

### 2. 環境変数の設定

各サービスディレクトリに `.env.local` を作成：

```bash
# backend-go/.env.local
cp backend-go/.env backend-go/.env.local
# 必要な値（パスワード、APIキー等）を編集

# backend-python/ai_server/.env.local
cp backend-python/ai_server/.env backend-python/ai_server/.env.local
# 必要な値を編集

# frontend/.env.local
cp frontend/.env frontend/.env.local
# 必要な値を編集
```

**詳細な設定方法**: [環境変数管理ポリシー](./ENVIRONMENT_VARIABLES.md)

### 3. 全サービスを起動

```bash
# 開発環境
docker-compose -f docker-compose/dev.yml up -d

# ログ確認
docker-compose -f docker-compose/dev.yml logs -f
```

### 4. アクセス

- **フロントエンド**: http://localhost:3000
- **Go API**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger/index.html
- **AI Server**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📝 主要コマンド

```bash
# 全サービス起動
docker-compose -f docker-compose/dev.yml up -d

# 特定サービスのみ起動
docker-compose -f docker-compose/dev.yml up -d frontend backend-go

# ログ確認
docker-compose -f docker-compose/dev.yml logs -f [service-name]

# サービス停止
docker-compose -f docker-compose/dev.yml down

# 完全削除（ボリュームも）
docker-compose -f docker-compose/dev.yml down -v

# イメージ再ビルド
docker-compose -f docker-compose/dev.yml up -d --build

# 本番環境
docker-compose -f docker-compose/prod.yml up -d
```

## 🔧 個別開発

各サービスを個別に開発する場合：

### フロントエンド

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

### Go API

```bash
cd backend-go
go mod download
go run cmd/api/main.go
# http://localhost:8080
```

### Python AI Server

```bash
cd backend-python/ai_server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# http://localhost:8000
```

## 📚 API ドキュメント

### Swagger UI

Go API のドキュメントは Swagger UI で確認できます：

- http://localhost:8080/swagger/index.html

### 主要エンドポイント

**認証 (認証不要)**

- `POST /api/v1/auth/signup` - ユーザー登録
- `POST /api/v1/auth/signin` - ログイン
- `POST /api/v1/auth/confirm-signup` - 登録確認

**ユーザー (認証必要)**

- `GET /api/v1/users/profile` - プロフィール取得
- `PUT /api/v1/users/profile` - プロフィール更新
- `GET /api/v1/users` - ユーザー一覧

**システム**

- `GET /health` - ヘルスチェック

## 🎯 主要機能

- **リアルタイムチャット** - WebSocket 対応のリアルタイムメッセージング
- **AI 対話** - 複数の個性を持つ AI エージェント
- **認証システム** - AWS Cognito + JWT
- **レスポンシブデザイン** - PC/タブレット/モバイル対応
- **ダークモード** - システム設定に応じた自動切り替え

## 📖 ドキュメント

### サービス別

- [フロントエンド開発ガイド](./docs/frontend/GETTING_STARTED.md)
- [Go API 開発ガイド](./backend-go/README.md)
- [Python AI Server](./backend-python/ai_server/README.md)

### 環境・設定

- [環境変数管理ポリシー](./ENVIRONMENT_VARIABLES.md)
- [AWS Cognito 設定](./docs/aws/COGNITO_SETUP.md)
- [インフラ構築](./docs/aws/INFRASTRUCTURE.md)

### アーキテクチャ

- [フロントエンドアーキテクチャ](./docs/frontend/ARCHITECTURE.md)
- [データベース設計](./docs/frontend/DATABASE_DESIGN.md)
- [Swagger/OpenAPI 設定](./docs/backend/SWAGGER_GUIDE.md)

## 🔐 セキュリティ

- **認証**: AWS Cognito (JWT)
- **認可**: Row Level Security (RLS)
- **暗号化**: 機密データの暗号化保存
- **レート制限**: DDoS 対策
- **入力検証**: 多層防御

**重要**: `.env.local` ファイルは絶対にコミットしないでください。

## 🐛 トラブルシューティング

### ポートが既に使用されている

```bash
# 使用中のポートを確認
lsof -i :3000
lsof -i :8080

# Dockerコンテナを完全停止
docker-compose -f docker-compose/dev.yml down -v
```

### データベース接続エラー

```bash
# PostgreSQLの状態確認
docker-compose -f docker-compose/dev.yml ps postgres

# ログ確認
docker-compose -f docker-compose/dev.yml logs postgres

# コンテナ再起動
docker-compose -f docker-compose/dev.yml restart postgres
```

### Swagger UI が表示されない

```bash
# Go APIのログ確認
docker-compose -f docker-compose/dev.yml logs backend-go

# Swaggerドキュメント再生成
cd backend-go
go run github.com/swaggo/swag/cmd/swag@v1.8.12 init -g cmd/api/main.go -o docs

# コンテナ再起動
docker-compose -f docker-compose/dev.yml restart backend-go
```

## 📊 開発状況

### Phase 1: MVP ✅

- [x] 基本的なチャット機能
- [x] AI 対話システム
- [x] 認証・認可
- [x] レスポンシブ UI
- [x] API ドキュメント (Swagger)

### Phase 2: 機能拡張 🚧

- [ ] グループチャット
- [ ] ファイル共有
- [ ] 通知システム
- [ ] 音声メッセージ

### Phase 3: AI 強化 📋

- [ ] 感情分析
- [ ] 多言語対応
- [ ] カスタムエージェント
- [ ] 学習機能

## 🤝 貢献

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

詳細は [CONTRIBUTING.md](./docs/CONTRIBUTING.md) を参照。

## 📄 ライセンス

MIT License

## 📞 サポート

- **Issues**: バグ報告・機能要望
- **Discussions**: 技術的な質問
- **メール**: support@bridgespeak.com

---

**Happy Coding! 🚀**
