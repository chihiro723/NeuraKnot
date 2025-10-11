# BridgeSpeak Backend (Go)

クリーンアーキテクチャと DDD に基づいた REST API サーバー

## 🎯 概要

BridgeSpeak の Go バックエンド API サーバーです。**クリーンアーキテクチャ**と**ドメイン駆動設計（DDD）**の原則に従って設計されています。

## 🏗️ アーキテクチャ

### 4 層構造

```
┌──────────────────────────────────────────┐
│  Handler Layer (HTTP/REST)               │
│  - ルーティング, ミドルウェア, DTO       │
└──────────────────┬───────────────────────┘
                   ↓ 依存
┌──────────────────────────────────────────┐
│  Usecase Layer (ビジネスロジック)       │
│  - ユースケース実装                      │
└──────────────────┬───────────────────────┘
                   ↓ 依存
┌──────────────────────────────────────────┐
│  Domain Layer (コアロジック)             │
│  - エンティティ, 値オブジェクト          │
└──────────────────┬───────────────────────┘
                   ↑ 実装
┌──────────────────────────────────────────┐
│  Infrastructure Layer (外部連携)         │
│  - DB, 外部API, 設定                     │
└──────────────────────────────────────────┘
```

### ディレクトリ構造

```
backend-go/
├── cmd/api/              # エントリーポイント
│   └── main.go
├── internal/
│   ├── domain/          # ドメイン層（外部依存禁止）
│   │   └── user/
│   │       ├── user.go             # User集約ルート
│   │       ├── user_id.go          # 値オブジェクト
│   │       ├── email.go
│   │       ├── repository.go       # インターフェース
│   │       └── auth_service.go
│   ├── usecase/         # ユースケース層
│   │   └── user/
│   │       └── service.go
│   ├── infrastructure/  # インフラ層
│   │   ├── config/
│   │   ├── database/
│   │   ├── persistence/
│   │   └── external/
│   └── handler/         # ハンドラー層
│       └── http/
│           ├── router.go
│           ├── middleware/
│           ├── request/
│           ├── response/
│           └── user_handler.go
├── migrations/          # DBマイグレーション
├── docs/               # Swaggerドキュメント
├── docker/             # Dockerfiles
└── .env               # 環境変数サンプル
```

## 🛠️ 技術スタック

- **言語**: Go 1.25.1
- **フレームワーク**: Gin (HTTP)
- **データベース**: PostgreSQL 15
- **認証**: AWS Cognito (JWT)
- **API ドキュメント**: Swagger/OpenAPI
- **ホットリロード**: Air
- **マイグレーション**: golang-migrate

## 🚀 クイックスタート

### 環境変数の設定

```bash
# .env.localファイルを作成
cp .env .env.local

# 必要な値を編集
vim .env.local
```

**必須の環境変数**:

- `DB_PASSWORD` - データベースパスワード
- `COGNITO_USER_POOL_ID` - Cognito ユーザープール ID
- `COGNITO_CLIENT_ID` - Cognito クライアント ID
- `COGNITO_CLIENT_SECRET` - Cognito クライアントシークレット

詳細: [プロジェクトルートの環境変数ガイド](../ENVIRONMENT_VARIABLES.md)

### Docker 環境で起動（推奨）

```bash
# プロジェクトルートから
cd ..
docker-compose -f docker-compose/dev.yml up -d backend-go

# ログ確認
docker-compose -f docker-compose/dev.yml logs -f backend-go
```

### ローカルで起動

```bash
# 依存関係のインストール
go mod download

# データベースを起動
docker-compose -f docker-compose/dev.yml up -d postgres

# サーバー起動
go run cmd/api/main.go

# または Air でホットリロード
air
```

### 動作確認

```bash
# ヘルスチェック
curl http://localhost:8080/health

# Swagger UI
open http://localhost:8080/swagger/index.html
```

## 📚 API ドキュメント

### Swagger UI

API ドキュメントは Swagger UI で確認できます：

- **URL**: http://localhost:8080/swagger/index.html
- **JSON**: http://localhost:8080/swagger/doc.json

### Swagger ドキュメントの更新

コードにアノテーションを追加後、ドキュメントを再生成：

```bash
# Swaggerドキュメント生成
go run github.com/swaggo/swag/cmd/swag@v1.8.12 init -g cmd/api/main.go -o docs

# Air使用時は自動で再生成されます
```

## 🔌 API エンドポイント

### 認証 (認証不要)

| Method | Endpoint                               | 説明                   |
| ------ | -------------------------------------- | ---------------------- |
| POST   | `/api/v1/auth/signup`                  | ユーザー登録           |
| POST   | `/api/v1/auth/signin`                  | ログイン               |
| POST   | `/api/v1/auth/confirm-signup`          | 登録確認               |
| POST   | `/api/v1/auth/forgot-password`         | パスワードリセット要求 |
| POST   | `/api/v1/auth/confirm-forgot-password` | パスワードリセット     |

### ユーザー (認証必要)

| Method | Endpoint                | 説明               |
| ------ | ----------------------- | ------------------ |
| GET    | `/api/v1/users/profile` | プロフィール取得   |
| PUT    | `/api/v1/users/profile` | プロフィール更新   |
| PUT    | `/api/v1/users/email`   | メールアドレス変更 |
| GET    | `/api/v1/users/:id`     | ユーザー取得       |
| GET    | `/api/v1/users`         | ユーザー一覧       |

### システム

| Method | Endpoint  | 説明           |
| ------ | --------- | -------------- |
| GET    | `/health` | ヘルスチェック |

## 🔧 開発

### コマンド

```bash
# 開発サーバー起動
go run cmd/api/main.go

# ホットリロード
air

# テスト実行
go test ./...

# テストカバレッジ
go test -cover ./...

# ビルド
go build -o bin/api cmd/api/main.go

# リント
golangci-lint run
```

### 新機能の追加手順

1. **Domain Layer** - エンティティと値オブジェクトを定義

   ```go
   // internal/domain/xxx/entity.go
   ```

2. **Usecase Layer** - ビジネスロジックを実装

   ```go
   // internal/usecase/xxx/service.go
   ```

3. **Infrastructure Layer** - 外部システム連携を実装

   ```go
   // internal/infrastructure/persistence/xxx/repository.go
   ```

4. **Handler Layer** - HTTP API を実装（Swagger アノテーション付き）

   ```go
   // internal/handler/http/xxx_handler.go
   // @Summary ...
   // @Description ...
   ```

5. **Swagger ドキュメント更新**
   ```bash
   go run github.com/swaggo/swag/cmd/swag@v1.8.12 init -g cmd/api/main.go -o docs
   ```

## 🗄️ データベース

### マイグレーション

```bash
# マイグレーション作成
migrate create -ext sql -dir migrations -seq create_new_table

# マイグレーション実行
migrate -path migrations -database "postgres://postgres:password@localhost:5432/go_backend?sslmode=disable" up

# ロールバック
migrate -path migrations -database "postgres://postgres:password@localhost:5432/go_backend?sslmode=disable" down 1
```

### Docker 環境でのマイグレーション

```bash
# コンテナ内で実行
docker-compose -f docker-compose/dev.yml exec backend-go migrate -path migrations -database "postgres://postgres:password@postgres:5432/go_backend?sslmode=disable" up
```

## 🧪 テスト

```bash
# 全テスト実行
go test ./...

# 詳細表示
go test -v ./...

# カバレッジ
go test -cover ./...

# カバレッジHTML出力
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## 📦 ビルド

### ローカルビルド

```bash
# 開発用
go build -o bin/api cmd/api/main.go

# 本番用（最適化）
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/api cmd/api/main.go
```

### Docker ビルド

```bash
# 開発用イメージ
docker build -f docker/Dockerfile.dev -t bridgespeak-backend-go:dev .

# 本番用イメージ
docker build -f docker/Dockerfile.prod -t bridgespeak-backend-go:prod .

# 実行
docker run -p 8080:8080 --env-file .env.local bridgespeak-backend-go:dev
```

## 🎯 アーキテクチャのルール

### 層の責任

- **Domain**: ビジネスルール、外部依存禁止
- **Usecase**: アプリケーションロジック、Domain のみ依存
- **Infrastructure**: 外部システム連携、Domain インターフェース実装
- **Handler**: HTTP 処理、Usecase と Infrastructure 依存

### 禁止事項

❌ **Domain 層で禁止**

- 外部ライブラリへの依存
- データベースへの直接アクセス
- JSON タグの使用

❌ **全体で禁止**

- 循環依存
- グローバル変数の乱用
- ハードコーディング

## 🔐 セキュリティ

- **認証**: AWS Cognito JWT 検証
- **認可**: ミドルウェアによる権限チェック
- **入力検証**: リクエスト DTO でバリデーション
- **SQL インジェクション対策**: プリペアドステートメント
- **機密情報**: 環境変数で管理

## 📊 パフォーマンス

- **接続プール**: データベース接続の効率化
- **ミドルウェア**: 軽量な処理チェーン
- **クエリ最適化**: インデックス活用
- **メモリ管理**: 適切なリソース解放

## 🐛 トラブルシューティング

### サーバーが起動しない

```bash
# ログ確認
docker-compose -f docker-compose/dev.yml logs backend-go

# 環境変数確認
docker-compose -f docker-compose/dev.yml exec backend-go env | grep DB

# ポート確認
lsof -i :8080
```

### Swagger UI が表示されない

```bash
# Swaggerドキュメント再生成
go run github.com/swaggo/swag/cmd/swag@v1.8.12 init -g cmd/api/main.go -o docs

# コンテナ再起動
docker-compose -f docker-compose/dev.yml restart backend-go
```

### データベース接続エラー

```bash
# PostgreSQL確認
docker-compose -f docker-compose/dev.yml ps postgres

# 接続テスト
docker-compose -f docker-compose/dev.yml exec postgres psql -U postgres -d go_backend
```

## 📚 参考資料

### プロジェクト内

- [Swagger 設定ガイド](../docs/backend/SWAGGER_GUIDE.md)
- [セットアップチェックリスト](../docs/backend/SETUP_CHECKLIST.md)
- [環境変数管理](../ENVIRONMENT_VARIABLES.md)

### 外部リンク

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Gin Framework](https://gin-gonic.com/)
- [Swagger/OpenAPI](https://swagger.io/)
- [AWS Cognito](https://aws.amazon.com/cognito/)

## 📄 ライセンス

MIT License

---

**Happy Coding! 🚀**
