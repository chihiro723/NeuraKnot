# Go Backend MVP プロジェクト

## 📋 プロジェクト概要

このプロジェクトは、Go 言語を使用したバックエンド API の MVP（最小実行可能プロダクト）です。DDD（ドメイン駆動設計）のアプローチを採用し、Docker と Terraform を使用して AWS にデプロイすることを想定しています。

## 🏗️ アーキテクチャ

### DDD（ドメイン駆動設計）準拠のレイヤードアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Interface Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   HTTP Handler  │  │   gRPC Handler  │  │   CLI       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                 Application Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Use Case      │  │   Application   │  │   Service   │ │
│  │   Service       │  │   Service       │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Entity        │  │   Value Object  │  │   Domain    │ │
│  │                 │  │                 │  │   Service   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                 Infrastructure Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Repository    │  │   Database      │  │   External  │ │
│  │   Implementation│  │   Connection    │  │   Service   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### プロジェクト構造

```
go-backend/
├── cmd/                    # メインアプリケーション
│   └── main.go
├── internal/               # 内部パッケージ（外部からアクセス不可）
│   ├── domain/            # ドメイン層
│   │   └── user.go       # ユーザーエンティティ・インターフェース
│   ├── usecase/           # アプリケーション層
│   │   └── user_usecase.go # ユーザーユースケース実装
│   ├── interface/         # インターフェース層
│   │   └── handler/       # HTTPハンドラー
│   │       └── user_handler.go
│   └── infra/            # インフラ層
│       ├── database/      # データベース接続
│       │   └── connection.go
│       └── repository/    # リポジトリ実装
│           └── user_repository.go
├── pkg/                   # 外部に公開可能なパッケージ
├── api/                   # API定義（OpenAPI/Swagger）
├── docker/               # Docker関連ファイル
│   ├── Dockerfile
│   └── init.sql
├── terraform/            # Terraform設定ファイル
├── docker-compose.yml    # ローカル開発環境
├── go.mod               # Go Modules
├── go.sum               # 依存関係のチェックサム
└── README.md            # このファイル
```

## 🛠️ 技術スタック

### バックエンド

- **Go 1.25+**: プログラミング言語
- **Gin**: Web フレームワーク
- **PostgreSQL**: リレーショナルデータベース
- **Redis**: キャッシュサーバー

### インフラ・DevOps

- **Docker**: コンテナ化
- **Docker Compose**: ローカル開発環境
- **Terraform**: Infrastructure as Code
- **AWS**: クラウドプラットフォーム

### 開発ツール

- **go mod**: 依存関係管理
- **lib/pq**: PostgreSQL ドライバー

## 🚀 クイックスタート

### 前提条件

- Go 1.25 以上
- Docker & Docker Compose
- Git

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd go-backend
```

### 2. 依存関係のインストール

```bash
go mod download
```

### 3. ローカル開発環境の起動

```bash
# 全サービスを起動
docker-compose up -d

# ログを確認
docker-compose logs -f api
```

### 4. 動作確認

```bash
# ヘルスチェック
curl http://localhost:8080/health

# ユーザー一覧取得
curl http://localhost:8080/api/v1/users
```

## 📚 API 仕様

### ベース URL

```
http://localhost:8080
```

### エンドポイント一覧

#### ヘルスチェック

```http
GET /health
```

**レスポンス:**

```json
{
  "status": "ok",
  "message": "Server is running"
}
```

#### ユーザー管理

##### ユーザー一覧取得

```http
GET /api/v1/users
```

**レスポンス:**

```json
{
  "data": [
    {
      "id": 1,
      "email": "admin@example.com",
      "name": "Admin User",
      "created_at": "2025-09-08T16:04:50.077623Z",
      "updated_at": "2025-09-08T16:04:50.077623Z"
    }
  ]
}
```

##### ユーザー詳細取得

```http
GET /api/v1/users/{id}
```

**パラメータ:**

- `id` (int): ユーザー ID

**レスポンス:**

```json
{
  "data": {
    "id": 1,
    "email": "admin@example.com",
    "name": "Admin User",
    "created_at": "2025-09-08T16:04:50.077623Z",
    "updated_at": "2025-09-08T16:04:50.077623Z"
  }
}
```

##### ユーザー作成

```http
POST /api/v1/users
```

**リクエストボディ:**

```json
{
  "email": "newuser@example.com",
  "name": "New User"
}
```

**レスポンス:**

```json
{
  "data": {
    "id": 3,
    "email": "newuser@example.com",
    "name": "New User",
    "created_at": "2025-09-08T16:04:50.077623Z",
    "updated_at": "2025-09-08T16:04:50.077623Z"
  }
}
```

##### ユーザー更新

```http
PUT /api/v1/users/{id}
```

**パラメータ:**

- `id` (int): ユーザー ID

**リクエストボディ:**

```json
{
  "email": "updated@example.com",
  "name": "Updated User"
}
```

##### ユーザー削除

```http
DELETE /api/v1/users/{id}
```

**パラメータ:**

- `id` (int): ユーザー ID

**レスポンス:**

```json
{
  "message": "User deleted successfully"
}
```

### エラーレスポンス

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

**HTTP ステータスコード:**

- `200`: 成功
- `201`: 作成成功
- `400`: リクエストエラー
- `404`: リソースが見つからない
- `500`: サーバーエラー

## 🐳 Docker 環境

### サービス構成

| サービス | ポート | 説明                     |
| -------- | ------ | ------------------------ |
| api      | 8080   | Go API サーバー          |
| postgres | 5432   | PostgreSQL データベース  |
| redis    | 6379   | Redis キャッシュサーバー |

### Docker Compose コマンド

```bash
# サービス起動
docker-compose up -d

# サービス停止
docker-compose down

# ログ確認
docker-compose logs -f [service-name]

# サービス再構築
docker-compose up --build -d

# ボリュームも含めて完全削除
docker-compose down -v
```

### データベース操作

```bash
# PostgreSQLに接続
docker-compose exec postgres psql -U postgres -d go_backend

# データベースの状態確認
docker-compose exec postgres pg_isready -U postgres
```

## 🏗️ 開発ガイド

### 開発環境のセットアップ

1. **Go のインストール**

   ```bash
   # macOS (Homebrew)
   brew install go

   # バージョン確認
   go version
   ```

2. **プロジェクトのクローン**

   ```bash
   git clone <repository-url>
   cd go-backend
   ```

3. **依存関係のインストール**

   ```bash
   go mod download
   ```

4. **ローカル開発環境の起動**
   ```bash
   docker-compose up -d
   ```

### コードの実行

```bash
# ローカルでGoアプリケーションを実行
go run cmd/main.go

# ビルド
go build -o bin/main cmd/main.go

# テスト実行
go test ./...

# テストカバレッジ
go test -cover ./...
```

### 新しい機能の追加

1. **ドメイン層**: エンティティとビジネスルールを定義
2. **ユースケース層**: アプリケーションの処理フローを実装
3. **インターフェース層**: HTTP ハンドラーを実装
4. **インフラ層**: データアクセスと外部サービス連携を実装

### コーディング規約

- **命名規則**: Go の標準的な命名規則に従う
- **エラーハンドリング**: 適切なエラーハンドリングを実装
- **テスト**: 基本的なテストコードを記述
- **コメント**: ドキュメントコメントを適切に記述
- **構造化ログ**: ログは構造化して出力

## 🧪 テスト

### テストの実行

```bash
# 全テスト実行
go test ./...

# 特定パッケージのテスト
go test ./internal/usecase

# テストカバレッジ
go test -cover ./...

# 詳細なカバレッジレポート
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### テストの種類

- **ユニットテスト**: 個別の関数・メソッドのテスト
- **インテグレーションテスト**: 複数コンポーネントの連携テスト
- **API テスト**: HTTP エンドポイントのテスト

## 📊 データベース設計

### ユーザーテーブル

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### マイグレーション

```bash
# データベース初期化
docker-compose exec postgres psql -U postgres -d go_backend -f /docker-entrypoint-initdb.d/init.sql
```

## 🚀 デプロイ

### 本番環境へのデプロイ

1. **Terraform でインフラ構築**

   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

2. **Docker イメージのビルド・プッシュ**

   ```bash
   docker build -t your-registry/go-backend:latest .
   docker push your-registry/go-backend:latest
   ```

3. **ECS/Fargate でのデプロイ**
   - ECS クラスターの作成
   - タスク定義の作成
   - サービスの作成

### 環境変数

| 変数名        | 説明                   | デフォルト値 |
| ------------- | ---------------------- | ------------ |
| `PORT`        | サーバーポート         | `8080`       |
| `GIN_MODE`    | Gin のモード           | `debug`      |
| `DB_HOST`     | データベースホスト     | `localhost`  |
| `DB_PORT`     | データベースポート     | `5432`       |
| `DB_USER`     | データベースユーザー   | `postgres`   |
| `DB_PASSWORD` | データベースパスワード | `password`   |
| `DB_NAME`     | データベース名         | `go_backend` |

## 🔧 トラブルシューティング

### よくある問題

#### 1. ポートが既に使用されている

```bash
# ポートの使用状況確認
lsof -i :8080

# プロセスを終了
kill -9 <PID>
```

#### 2. データベース接続エラー

```bash
# PostgreSQLの状態確認
docker-compose exec postgres pg_isready -U postgres

# ログ確認
docker-compose logs postgres
```

#### 3. Docker イメージのビルドエラー

```bash
# キャッシュをクリアして再ビルド
docker-compose build --no-cache

# 不要なイメージを削除
docker system prune -a
```

### ログの確認

```bash
# 全サービスのログ
docker-compose logs

# 特定サービスのログ
docker-compose logs api

# リアルタイムログ
docker-compose logs -f api
```

## 📈 パフォーマンス

### ベンチマーク

```bash
# APIのベンチマークテスト
go test -bench=. ./internal/...

# 負荷テスト（例：heyツール使用）
hey -n 1000 -c 10 http://localhost:8080/api/v1/users
```

### 最適化のポイント

- **データベースクエリ**: インデックスの活用、N+1 問題の回避
- **キャッシュ**: Redis を活用したキャッシュ戦略
- **並行処理**: Goroutine を活用した並行処理
- **メモリ使用量**: プロファイリングによるメモリリークの検出

## 🔒 セキュリティ

### 実装済みのセキュリティ対策

- **入力値検証**: Gin のバリデーション機能を使用
- **SQL インジェクション対策**: プリペアドステートメントの使用
- **非 root ユーザー実行**: Docker コンテナ内で非 root ユーザーで実行
- **ヘルスチェック**: アプリケーションの健全性監視

### 今後のセキュリティ強化

- **認証・認可**: JWT トークンによる認証
- **HTTPS**: TLS 証明書による通信暗号化
- **レート制限**: API 呼び出し頻度の制限
- **ログ監視**: セキュリティイベントの監視

## 📚 学習リソース

### Go 言語関連

- [Go 公式ドキュメント](https://golang.org/doc/)
- [Effective Go](https://golang.org/doc/effective_go.html)
- [Go by Example](https://gobyexample.com/)

### DDD 関連

- [ドメイン駆動設計](https://www.amazon.co.jp/dp/4798121967) - Eric Evans
- [実践ドメイン駆動設計](https://www.amazon.co.jp/dp/479813161X) - Vaughn Vernon

### Docker 関連

- [Docker 公式ドキュメント](https://docs.docker.com/)
- [Docker Compose 公式ドキュメント](https://docs.docker.com/compose/)

### AWS 関連

- [AWS 公式ドキュメント](https://docs.aws.amazon.com/)
- [Terraform 公式ドキュメント](https://www.terraform.io/docs/)

## 🤝 コントリビューション

### 開発フロー

1. **Issue 作成**: バグ報告や機能要求
2. **ブランチ作成**: `feature/issue-number` 形式
3. **開発**: コーディングとテスト
4. **プルリクエスト**: コードレビューとマージ

### コーディング規約

- **フォーマット**: `gofmt` でコードをフォーマット
- **リント**: `golint` でコードをチェック
- **テスト**: 新機能にはテストを追加
- **ドキュメント**: 公開関数にはコメントを追加

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 📞 サポート

質問や問題がある場合は、以下の方法でサポートを受けられます：

- **Issue**: GitHub の Issue で質問
- **Discussions**: GitHub の Discussions で議論
- **メール**: [your-email@example.com]

---

## 🎯 次のステップ

### 短期目標

- [ ] 認証・認可機能の実装
- [ ] API ドキュメントの自動生成
- [ ] ユニットテストの充実
- [ ] CI/CD パイプラインの構築

### 中期目標

- [ ] マイクロサービス化
- [ ] メッセージキュー（RabbitMQ/Apache Kafka）の導入
- [ ] モニタリング（Prometheus/Grafana）の導入
- [ ] ログ集約（ELK Stack）の導入

### 長期目標

- [ ] マルチリージョン対応
- [ ] 自動スケーリング
- [ ] 災害復旧（DR）の実装
- [ ] セキュリティ監査の実施

---

**Happy Coding! 🚀**

