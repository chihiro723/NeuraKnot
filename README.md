# NeuraKnot

人間と AI エージェントが自然にコミュニケーションできるメッセージングアプリケーション。

## 目次

- [概要](#概要)
- [システムアーキテクチャ](#システムアーキテクチャ)
  - [全体構成](#全体構成)
  - [技術スタック](#技術スタック)
  - [プロジェクト構成](#プロジェクト構成)
- [環境構成](#環境構成)
  - [開発環境（ローカル）](#開発環境ローカル)
  - [本番環境（AWS）](#本番環境aws)
- [クイックスタート](#クイックスタート)
  - [必要な環境](#必要な環境)
  - [環境変数の設定](#環境変数の設定)
  - [サービス起動](#サービス起動)
  - [動作確認](#動作確認)
- [開発](#開発)
  - [Docker Compose コマンド](#docker-composeコマンド)
  - [個別開発](#個別開発)
  - [開発ルール](#開発ルール)
- [API 仕様](#api仕様)
- [認証](#認証)
- [ドキュメント](#ドキュメント)
- [デプロイ](#デプロイ)
- [トラブルシューティング](#トラブルシューティング)
- [ライセンス](#ライセンス)

## 概要

NeuraKnot は、AI エージェントとの対話を通じて様々なタスクを実行できるメッセージングアプリケーションです。複数の個性を持つ AI エージェントと、外部サービス連携による拡張可能なツールシステムを提供します。

## システムアーキテクチャ

### 全体構成

```
Internet
    |
    v
[Next.js Frontend]
    | HTTPS
    v
[Go API Server] <--> [Python AI Server]
    |                      |
    v                      v
[PostgreSQL]          [External APIs]
[Redis]               (OpenWeather, Slack, Notion, etc.)
    |
    v
[AWS Cognito]
(認証)
```

### 技術スタック

**フロントエンド**

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS

**バックエンド**

- Go 1.25 - REST API (クリーンアーキテクチャ / DDD)
- Python 3.11 - AI 処理 (FastAPI + LangChain)

**AI / LLM**

- OpenAI (GPT-4o)
- Anthropic (Claude 3.5)
- Google (Gemini)
- LangChain Agent

**データストア**

- PostgreSQL 15 - アプリケーションデータ
- Redis 7 - キャッシュ・セッション

**認証**

- AWS Cognito
- OAuth 2.0 (Google, Apple, LINE)

**インフラ**

- Docker / Docker Compose (開発環境)
- AWS ECS Fargate (本番環境)
- AWS RDS (PostgreSQL)
- Terraform (IaC)

### プロジェクト構成

```
neuraKnot/
├── frontend/                    # Next.js フロントエンド
│   ├── app/                    # App Router
│   ├── components/             # UIコンポーネント
│   └── lib/                    # ユーティリティ・型定義
│
├── backend-go/                 # Go API サーバー
│   ├── cmd/api/                # エントリーポイント
│   ├── internal/
│   │   ├── domain/            # ドメイン層
│   │   ├── usecase/           # ユースケース層
│   │   ├── handler/           # ハンドラー層
│   │   └── infrastructure/    # インフラ層
│   ├── migrations/            # DBマイグレーション
│   └── docs/                  # Swagger ドキュメント
│
├── backend-python/             # Python AI サーバー
│   └── app/
│       ├── api/v1/            # エンドポイント
│       ├── services/          # サービス・ツール
│       │   ├── built_in/     # 組み込みツール
│       │   └── api_wrappers/ # 外部API連携
│       ├── core/              # LLM・設定
│       └── models/            # リクエスト・レスポンス
│
├── docker-compose/
│   └── dev.yml                # 開発環境
│
└── docs/                      # プロジェクトドキュメント
    ├── aws/                   # AWS関連
    ├── frontend/              # フロントエンド
    └── backend/               # バックエンド
```

## 環境構成

### 開発環境（ローカル）

ローカル開発環境では、全てのサービスを Docker コンテナで実行します。

```
開発者PC（ローカル）
├── Next.js (localhost:3000)
├── Go Backend (localhost:8080)
├── Python AI Server (localhost:8001)
├── PostgreSQL (Docker/localhost:5432)
└── Redis (Docker/localhost:6379)

AWS Cognito (DEV User Pool) - 認証専用
```

**特徴:**

- PostgreSQL: アプリケーションデータのみ保存
- ユーザー管理: AWS Cognito DEV User Pool
- 認証方式: メール + パスワード（基本のみ）
- OAuth: 未対応（開発用のため）

### 本番環境（AWS）

本番環境では、AWS フルマネージドサービスを使用します。

```
[Vercel - Next.js]
        |
        v HTTPS
[Application Load Balancer]
        |
        v
[ECS Fargate - Go Backend] <--(内部通信)--> [ECS Fargate - Python AI]
        |
        v
[RDS PostgreSQL]

[AWS Cognito PROD User Pool]
```

**特徴:**

- フロントエンド: Vercel（または ECS Fargate）
- バックエンド: ECS Fargate
- Python AI サーバー: ECS Fargate（内部通信のみ、ALB から直接アクセス不可）
- データベース: RDS PostgreSQL（Multi-AZ）
- Service Discovery: Cloud Map（`python-ai.neuraKnot.local`）
- ユーザー管理: AWS Cognito PROD User Pool
- OAuth 対応: Google, Apple, LINE

## クイックスタート

### 必要な環境

- Docker Desktop
- Docker Compose
- Git

### 環境変数の設定

各サービスの環境変数ファイルを作成します：

```bash
# backend-go/.env.local
cp backend-go/.env backend-go/.env.local

# backend-python/.env.local
cp backend-python/.env backend-python/.env.local

# frontend/.env.local
cp frontend/.env frontend/.env.local
```

**必須の環境変数:**

- **認証**: `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET`
- **データベース**: `DB_PASSWORD`
- **AI API**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`
- **外部サービス** (オプション): Slack, Notion, Weather API 等

### サービス起動

```bash
# 全サービスを起動
docker-compose -f docker-compose/dev.yml up -d

# ログを確認
docker-compose -f docker-compose/dev.yml logs -f
```

### 動作確認

| サービス         | URL                                      | 説明             |
| ---------------- | ---------------------------------------- | ---------------- |
| フロントエンド   | http://localhost:3000                    | Next.js Web UI   |
| Go API           | http://localhost:8080                    | REST API         |
| Swagger UI       | http://localhost:8080/swagger/index.html | API ドキュメント |
| Python AI Server | http://localhost:8001                    | AI 処理サーバー  |
| PostgreSQL       | localhost:5432                           | データベース     |
| Redis            | localhost:6379                           | キャッシュ       |

```bash
# ヘルスチェック
curl http://localhost:8080/health
curl http://localhost:8001/api/health
```

## 開発

### Docker Compose コマンド

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
```

### 個別開発

Docker Compose を使わず、各サービスを個別に開発する場合：

**フロントエンド**

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

**Go API**

```bash
cd backend-go
go mod download
# データベースを起動
docker-compose -f ../docker-compose/dev.yml up -d postgres redis
# サーバー起動
go run cmd/api/main.go
# http://localhost:8080
```

**Python AI Server**

```bash
cd backend-python
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
# http://localhost:8001
```

### 開発ルール

開発に参加する前に、必ず[開発ルール・貢献ガイド](./docs/CONTRIBUTING.md)を確認してください。

**重要なポイント:**

- コミットメッセージ: `feat(frontend): 機能名` の形式
- プルリクエスト: 詳細なテンプレートに従って作成
- コードレビュー: 必須チェックリストを確認
- ブランチ命名: `feature/123-機能名` の形式

## API 仕様

### Go API (REST)

**Swagger UI**: http://localhost:8080/swagger/index.html

**認証（認証不要）**

- `POST /api/v1/auth/signup` - ユーザー登録
- `POST /api/v1/auth/signin` - ログイン
- `POST /api/v1/auth/confirm-signup` - 登録確認
- `POST /api/v1/auth/forgot-password` - パスワードリセット要求
- `POST /api/v1/auth/confirm-forgot-password` - パスワードリセット

**ユーザー（認証必要）**

- `GET /api/v1/users/profile` - プロフィール取得
- `PUT /api/v1/users/profile` - プロフィール更新
- `PUT /api/v1/users/email` - メールアドレス変更
- `GET /api/v1/users/:id` - ユーザー取得
- `GET /api/v1/users` - ユーザー一覧

**AI エージェント（認証必要）**

- `POST /api/v1/ai-agents` - AI エージェント作成
- `GET /api/v1/ai-agents/:id` - AI エージェント取得
- `PUT /api/v1/ai-agents/:id` - AI エージェント更新
- `DELETE /api/v1/ai-agents/:id` - AI エージェント削除

**システム**

- `GET /health` - ヘルスチェック

### Python AI API

**エンドポイント**

- `GET /api/health` - ヘルスチェック
- `POST /api/ai/chat` - 通常チャット
- `POST /api/ai/chat/stream` - ストリーミングチャット (SSE)
- `POST /api/tools/available` - 利用可能ツール一覧

**対応 LLM プロバイダー**

- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet, Claude 3.5 Haiku)
- Google (Gemini 1.5 Pro, Gemini 1.5 Flash)

**利用可能なサービス**

組み込みサービス:

- DateTimeService - 日時操作
- CalculationService - 計算・統計
- TextService - テキスト処理
- DataService - データ変換
- UtilityService - ユーティリティ

外部 API 連携サービス:

- OpenWeatherService - 天気情報
- SlackService - Slack 連携
- NotionService - Notion 連携
- BraveSearchService - Web 検索
- ExchangeRateService - 為替レート
- GoogleCalendarService - カレンダー連携
- IPApiService - IP 位置情報

## 認証

### AWS Cognito User Pool

**開発環境（DEV User Pool）**

- User Pool Name: `neuraKnot-dev-user-pool`
- 認証方式: メール + パスワード
- OAuth: 未対応
- MFA: 無効
- 用途: ローカル開発・テスト専用

**本番環境（PROD User Pool）**

- User Pool Name: `neuraKnot-prod-user-pool`
- 認証方式: メール + OAuth
- OAuth プロバイダー: Google, Apple, LINE
- MFA: オプションで有効化可能
- 用途: 本番環境のみ

### トークン設定

- アクセストークン: 1 時間
- リフレッシュトークン: 30 日

### User Pool 分離のメリット

- DEV 環境での実験が PROD に影響しない
- テストユーザーと本番ユーザーの完全分離
- DEV 環境で Cognito 統合テストが可能
- 本番データの保護

## ドキュメント

詳細なドキュメントは[docs/](./docs/)ディレクトリを参照してください。

### 主要ドキュメント

**開発ガイド**

- 📋 [開発ルール・貢献ガイド](./docs/CONTRIBUTING.md) - コミットメッセージ、プルリクエスト、コードレビューのルール
- [フロントエンド開発](./docs/frontend/GETTING_STARTED.md)
- [Go Backend 開発](./backend-go/README.md)
- [Python AI Server 開発](./backend-python/README.md)

**アーキテクチャ**

- [データベース設計](./docs/DATABASE_DESIGN.md)
- [フロントエンドアーキテクチャ](./docs/frontend/ARCHITECTURE.md)
- [認証アーキテクチャ](./docs/frontend/AUTH_ARCHITECTURE.md)
- [エラーハンドリング](./docs/frontend/ERROR_HANDLING_ARCHITECTURE.md)

**AWS インフラ**

- [AWS インフラ構築](./docs/aws/INFRASTRUCTURE.md)
- [AWS Cognito 設定](./docs/aws/COGNITO_SETUP.md)
- [AWS ドキュメント一覧](./docs/aws/)

**その他**

- [Swagger/OpenAPI 設定](./docs/backend/SWAGGER_GUIDE.md)
- [ルーティングベストプラクティス](./docs/frontend/ROUTING_BEST_PRACTICES.md)
- [サーバーサイドフェッチ](./docs/frontend/SERVER_SIDE_FETCH.md)

### セキュリティ

- **認証**: AWS Cognito + JWT
- **認可**: ロールベースアクセス制御
- **暗号化**: 通信（TLS）+ データ保存（RDS 暗号化）
- **入力検証**: リクエスト DTO バリデーション
- **機密情報管理**: AWS Secrets Manager

**重要**: `.env.local`ファイルは絶対にコミットしないでください。

## デプロイ

### CI/CD パイプライン

GitHub Actions を使用した自動デプロイ：

```
feature/xxx → dev → main
                     |
                     v
             GitHub Actions
                     |
        +------------+------------+
        v                         v
    Vercel                    AWS ECS
  (Next.js)              (Go/Python)
```

### ブランチ戦略

- `feature/xxx` - 機能開発ブランチ
- `dev` - ローカル開発・テスト（Cognito DEV User Pool）
- `main` - 本番環境（Cognito PROD User Pool）

### 本番デプロイフロー

1. `feature/xxx`で開発（ローカル環境）
2. `dev`ブランチにマージ
3. ローカルで統合テスト（DEV User Pool）
4. `main`ブランチへ PR 作成
5. GitHub Actions で自動テスト実行
6. レビュー & 承認
7. `main`にマージ
8. 自動デプロイ
   - Vercel（Next.js）
   - AWS ECS（Go/Python）

### 環境変数管理

**ローカル開発（.env.local）**

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/neuraKnot_dev

# Auth (Cognito DEV User Pool)
COGNITO_USER_POOL_ID=ap-northeast-1_DEV_xxxxx
COGNITO_CLIENT_ID=xxxxx_dev

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:8080
GO_PYTHON_AI_URL=http://localhost:8001
```

**本番環境（Vercel/ECS）**

- Vercel: 環境変数設定画面で管理
- ECS: AWS Secrets Manager から取得

## トラブルシューティング

### ポート競合

```bash
# 使用中のポートを確認
lsof -i :3000
lsof -i :8080
lsof -i :8001

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

# 接続テスト
docker-compose -f docker-compose/dev.yml exec postgres psql -U postgres -d go_backend
```

### Swagger UI が表示されない

```bash
# Swaggerドキュメント再生成
cd backend-go
go run github.com/swaggo/swag/cmd/swag@v1.8.12 init -g cmd/api/main.go -o docs

# コンテナ再起動
docker-compose -f docker-compose/dev.yml restart backend-go

# ログ確認
docker-compose -f docker-compose/dev.yml logs backend-go
```

### Python AI サーバーが起動しない

```bash
# ログ確認
docker-compose -f docker-compose/dev.yml logs backend-python

# 環境変数確認
docker-compose -f docker-compose/dev.yml exec backend-python env | grep API_KEY

# コンテナ再起動
docker-compose -f docker-compose/dev.yml restart backend-python
```

## ライセンス

MIT License
