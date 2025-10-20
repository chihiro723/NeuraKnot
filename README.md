# NeuraKnot

人間と AI エージェントが自然にコミュニケーションできるメッセージングアプリケーション。

## 目次

- [概要](#概要)
- [システムアーキテクチャ](#システムアーキテクチャ)
  - [全体構成](#全体構成)
  - [技術スタック](#技術スタック)
  - [データベース設計](#データベース設計)
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
  - [開発用スクリプト（dev.sh）](#開発用スクリプトdevsh)
  - [Docker Compose コマンド](#docker-composeコマンド)
  - [個別開発](#個別開発)
  - [開発ルール](#開発ルール)
- [API 仕様](#api仕様)
- [認証](#認証)
- [インフラストラクチャ](#インフラストラクチャ)
- [ドキュメント](#ドキュメント)
- [CI/CD](#cicd)
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
[Vercel - Next.js Frontend]
    | HTTPS
    v
[Application Load Balancer]
    |
    v
[ECS Fargate - Backend Go] <--(内部通信)--> [ECS Fargate - Backend Python]
    |                                           |
    v                                           v
[RDS PostgreSQL]                          [External APIs]
[Redis]                                   (OpenWeather, Slack, Notion, etc.)
    |
    v
[AWS Cognito]
(認証)
```

### 技術スタック

**フロントエンド**

- Next.js 15 (App Router) - Vercel でホスティング
- TypeScript
- Tailwind CSS

**バックエンド**

- Go 1.25 - REST API (クリーンアーキテクチャ / DDD)
- Backend Python 3.11 - AI 処理 (FastAPI + LangChain)

**AI / LLM**

- OpenAI (GPT-4o)
- Anthropic (Claude 3.5)
- Google (Gemini)
- LangChain Agent

**データストア**

- PostgreSQL 15 - アプリケーションデータ（Backend-go のみアクセス）
  - 8 テーブル構成 - 詳細は [データベース設計](#データベース設計) セクション参照
  - 完全なドキュメント: [データベース設計書](./docs/DATABASE_DESIGN_CURRENT.md)
- Redis 7 - キャッシュ・セッション

**認証**

- AWS Cognito
- OAuth 2.0 (Google, Apple, LINE)

**インフラ**

- Docker / Docker Compose (開発環境)
- AWS ECS Fargate (バックエンド API)
- Vercel (フロントエンド)
- AWS RDS (PostgreSQL)
- Terraform (IaC) - [詳細はこちら](./terraform/README.md)

### データベース設計

#### テーブル構成（8 テーブル）

NeuraKnot は PostgreSQL 15 を使用し、**Backend-go のみ**がデータベースにアクセスします。

##### 1. ユーザー管理

**users** - ユーザー情報（AWS Cognito 連携）

| カラム名        | 型           | 説明                                              |
| --------------- | ------------ | ------------------------------------------------- |
| id              | UUID         | PRIMARY KEY                                       |
| cognito_user_id | VARCHAR(255) | AWS Cognito ユーザー ID (UNIQUE)                  |
| email           | VARCHAR(255) | メールアドレス (UNIQUE)                           |
| display_name    | VARCHAR(255) | 表示名                                            |
| status          | VARCHAR(50)  | ステータス (active, inactive, suspended, deleted) |
| created_at      | TIMESTAMP    | 作成日時                                          |
| updated_at      | TIMESTAMP    | 更新日時                                          |

##### 2. AI エージェント

**ai_agents** - AI エージェント設定とペルソナ

| カラム名          | 型            | 説明                                         |
| ----------------- | ------------- | -------------------------------------------- |
| id                | UUID          | PRIMARY KEY                                  |
| user_id           | UUID          | ユーザー ID (FK)                             |
| name              | VARCHAR(255)  | エージェント名                               |
| description       | TEXT          | 説明                                         |
| avatar_url        | TEXT          | アバター画像 URL                             |
| persona_type      | VARCHAR(50)   | ペルソナ (assistant, creative, analytical)   |
| provider          | VARCHAR(50)   | LLM プロバイダー (openai, anthropic, google) |
| model             | VARCHAR(100)  | LLM モデル名                                 |
| temperature       | DECIMAL(3, 2) | 温度パラメータ (0.0-2.0)                     |
| max_tokens        | INTEGER       | 最大トークン数 (100-8000)                    |
| system_prompt     | TEXT          | システムプロンプト（NULL なら自動生成）      |
| tools_enabled     | BOOLEAN       | ツール使用の有効化                           |
| streaming_enabled | BOOLEAN       | ストリーミングレスポンスの有効化             |
| is_active         | BOOLEAN       | アクティブ状態                               |
| message_count     | INTEGER       | メッセージ総数                               |
| last_chat_at      | TIMESTAMP     | 最終チャット日時                             |
| created_at        | TIMESTAMP     | 作成日時                                     |
| updated_at        | TIMESTAMP     | 更新日時                                     |

**サポートする LLM モデル**:

- **OpenAI**: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo
- **Anthropic**: claude-3-5-sonnet-20241022, claude-3.5-sonnet, claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307
- **Google**: gemini-pro, gemini-1.5-pro, gemini-1.5-flash

##### 3. 会話・メッセージ

**conversations** - ユーザーと AI Agent 間の 1 対 1 会話

| カラム名        | 型        | 説明                    |
| --------------- | --------- | ----------------------- |
| id              | UUID      | PRIMARY KEY             |
| user_id         | UUID      | ユーザー ID (FK)        |
| ai_agent_id     | UUID      | AI エージェント ID (FK) |
| message_count   | INTEGER   | メッセージ総数          |
| last_message_at | TIMESTAMP | 最終メッセージ日時      |
| created_at      | TIMESTAMP | 作成日時                |
| updated_at      | TIMESTAMP | 更新日時                |

**UNIQUE 制約**: (user_id, ai_agent_id) - 1 ユーザー × 1 エージェント = 1 会話

**messages** - チャットメッセージ

| カラム名        | 型          | 説明                                           |
| --------------- | ----------- | ---------------------------------------------- |
| id              | UUID        | PRIMARY KEY                                    |
| conversation_id | UUID        | 会話 ID (FK)                                   |
| sender_type     | VARCHAR(20) | 送信者タイプ (user: ユーザー, ai: AI Agent)    |
| sender_id       | UUID        | 送信者 ID (users.id または ai_agents.id)       |
| content         | TEXT        | メッセージ内容                                 |
| ai_session_id   | UUID        | AI セッション ID (FK, sender_type='ai' の場合) |
| created_at      | TIMESTAMP   | 作成日時                                       |

##### 4. AI 処理履歴

**ai_chat_sessions** - AI 処理セッション履歴（分析・デバッグ用）

| カラム名           | 型            | 説明                                       |
| ------------------ | ------------- | ------------------------------------------ |
| id                 | UUID          | PRIMARY KEY                                |
| user_id            | UUID          | ユーザー ID (FK)                           |
| conversation_id    | UUID          | 会話 ID (FK)                               |
| ai_agent_id        | UUID          | AI エージェント ID (FK)                    |
| message_id         | UUID          | メッセージ ID (FK)                         |
| provider           | VARCHAR(50)   | LLM プロバイダー                           |
| model              | VARCHAR(100)  | LLM モデル                                 |
| persona            | VARCHAR(50)   | ペルソナタイプ                             |
| temperature        | DECIMAL(3, 2) | 温度パラメータ                             |
| tokens_prompt      | INTEGER       | プロンプトトークン数                       |
| tokens_completion  | INTEGER       | 応答トークン数                             |
| tokens_total       | INTEGER       | 総トークン数                               |
| processing_time_ms | INTEGER       | 処理時間（ミリ秒）                         |
| tools_used         | INTEGER       | 使用したツール数                           |
| status             | VARCHAR(50)   | ステータス (processing, completed, failed) |
| error_message      | TEXT          | エラーメッセージ                           |
| started_at         | TIMESTAMP     | 処理開始日時                               |
| completed_at       | TIMESTAMP     | 処理完了日時                               |

**ai_tool_usage** - AI ツール使用履歴

| カラム名          | 型           | 説明                            |
| ----------------- | ------------ | ------------------------------- |
| id                | UUID         | PRIMARY KEY                     |
| session_id        | UUID         | セッション ID (FK)              |
| message_id        | UUID         | メッセージ ID (FK)              |
| tool_name         | VARCHAR(255) | ツール名                        |
| tool_category     | VARCHAR(100) | ツールカテゴリ (basic, service) |
| input_data        | JSONB        | 入力データ（JSON 形式）         |
| output_data       | TEXT         | 出力データ                      |
| status            | VARCHAR(50)  | ステータス (completed, failed)  |
| error_message     | TEXT         | エラーメッセージ                |
| execution_time_ms | INTEGER      | 実行時間（ミリ秒）              |
| insert_position   | INTEGER      | UI 表示用：メッセージ内挿入位置 |
| executed_at       | TIMESTAMP    | 実行日時                        |

**現在の統計（開発環境）**:

- 平均トークン使用量: 2,690 トークン
- 平均処理時間: 5.8 秒
- ツール成功率: 100%
- 総 AI セッション: 117 件
- 総ツール実行: 56 件

##### 5. サービス連携

**user_service_configs** - ユーザーのサービス設定（暗号化）

| カラム名         | 型           | 説明                                 |
| ---------------- | ------------ | ------------------------------------ |
| id               | UUID         | PRIMARY KEY                          |
| user_id          | UUID         | ユーザー ID (FK)                     |
| service_class    | VARCHAR(255) | サービスクラス名 (例: NotionService) |
| encrypted_config | BYTEA        | 暗号化された設定情報 (AES-256-GCM)   |
| config_nonce     | BYTEA        | 設定暗号化用 Nonce                   |
| encrypted_auth   | BYTEA        | 暗号化された認証情報 (AES-256-GCM)   |
| auth_nonce       | BYTEA        | 認証情報暗号化用 Nonce               |
| is_enabled       | BOOLEAN      | サービス有効化フラグ                 |
| created_at       | TIMESTAMP    | 作成日時                             |
| updated_at       | TIMESTAMP    | 更新日時                             |

**UNIQUE 制約**: (user_id, service_class) - 1 ユーザー × 1 サービス = 1 設定

**ai_agent_services** - AI Agent × サービス紐付け

| カラム名            | 型           | 説明                                         |
| ------------------- | ------------ | -------------------------------------------- |
| id                  | UUID         | PRIMARY KEY                                  |
| ai_agent_id         | UUID         | AI エージェント ID (FK)                      |
| service_class       | VARCHAR(255) | サービスクラス名                             |
| tool_selection_mode | VARCHAR(50)  | ツール選択モード (all: 全て, selected: 選択) |
| selected_tools      | TEXT[]       | 選択されたツール名の配列                     |
| enabled             | BOOLEAN      | このサービスを使用するかどうか               |
| created_at          | TIMESTAMP    | 作成日時                                     |

**UNIQUE 制約**: (ai_agent_id, service_class) - 1 エージェント × 1 サービス = 1 紐付け

**セキュリティ**:

- 認証情報は AES-256-GCM で暗号化
- Nonce を使用して暗号化の一意性を保証
- Backend-go でのみ復号化可能

#### 設計原則

1. **単一データアクセスポイント**: Backend-go のみが PostgreSQL にアクセス
2. **MVP に集中**: 現在は 1 対 1 チャット（User ↔ AI Agent）のみサポート
3. **パフォーマンス最適化**: 適切なインデックス配置、トリガーによる自動更新
4. **セキュリティ**: 機密情報の暗号化、CHECK 制約による型安全性

#### データ量見積もり

**現在（開発環境）**: 約 1.2 MB（462 レコード）

**将来（10,000 ユーザー想定）**:

- 1 ヶ月: 約 7.5 GB
- 1 年: 約 90 GB

#### 詳細ドキュメント

- [現在のデータベース設計（MVP 版）](./docs/DATABASE_DESIGN_CURRENT.md) - 全テーブル詳細、ER 図、インデックス戦略
- [将来のデータベース設計](./docs/DATABASE_DESIGN.md) - グループチャット、友達機能等の将来設計
- [スキーマ分析レポート](./docs/backend/SCHEMA_ANALYSIS_REPORT.md) - 現在のスキーマ状態と最適化情報

### プロジェクト構成

```
neuraKnot/
├── frontend/                    # Next.js フロントエンド
│   ├── app/                    # App Router
│   ├── components/             # UIコンポーネント
│   └── lib/                    # ユーティリティ・型定義
│
├── backend-go/                 # Backend Go サーバー
│   ├── cmd/api/                # エントリーポイント
│   ├── internal/
│   │   ├── domain/            # ドメイン層
│   │   ├── usecase/           # ユースケース層
│   │   ├── handler/           # ハンドラー層
│   │   └── infrastructure/    # インフラ層
│   ├── migrations/            # DBマイグレーション
│   └── docs/                  # Swagger ドキュメント
│
├── backend-python/             # Backend Python サーバー
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
├── terraform/                 # インフラストラクチャ as Code
│   ├── modules/              # 再利用可能なモジュール
│   │   ├── cognito/          # AWS Cognito
│   │   ├── vpc/              # VPC・ネットワーク
│   │   ├── ecr/              # ECR リポジトリ
│   │   ├── ecs/              # ECS クラスター（バックエンドのみ）
│   │   ├── rds/              # RDS PostgreSQL
│   │   ├── alb/              # Application Load Balancer
│   │   ├── service-discovery/ # Cloud Map
│   │   ├── secrets/          # Secrets Manager
│   │   └── iam/              # IAM ロール・ポリシー
│   └── environments/
│       ├── dev/              # 開発環境（Cognito のみ）
│       └── prod/             # 本番環境（バックエンドAPI）
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
├── Backend Go (localhost:8080)
├── Backend Python (localhost:8001)
├── PostgreSQL (Docker/localhost:5432)
└── Redis (Docker/localhost:6379)

AWS Cognito (DEV User Pool) - 認証専用
```

**特徴:**

- PostgreSQL: アプリケーションデータのみ保存
- ユーザー管理: AWS Cognito DEV User Pool
- 認証方式: メール + パスワード（基本のみ）
- OAuth: 未対応（開発用のため）

### 本番環境（AWS + Vercel）

本番環境では、フロントエンドを Vercel、バックエンド API を AWS で管理します。

```
[Vercel - Next.js Frontend]
        |
        v HTTPS
[Application Load Balancer]
        |
        v
[ECS Fargate - Backend Go] <--(内部通信)--> [ECS Fargate - Backend Python]
        |
        v
[RDS PostgreSQL]

[AWS Cognito PROD User Pool]
```

**特徴:**

- フロントエンド: Vercel（Next.js）
- バックエンド API: AWS ECS Fargate
- Backend Python サーバー: ECS Fargate（内部通信のみ、ALB から直接アクセス不可）
- データベース: RDS PostgreSQL（Multi-AZ）
- Service Discovery: Cloud Map（`backend-python.neuraKnot.local`）
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

| サービス       | URL                                      | 説明             |
| -------------- | ---------------------------------------- | ---------------- |
| フロントエンド | http://localhost:3000                    | Next.js Web UI   |
| Backend Go     | http://localhost:8080                    | REST API         |
| Swagger UI     | http://localhost:8080/swagger/index.html | API ドキュメント |
| Backend Python | http://localhost:8001                    | AI 処理サーバー  |
| PostgreSQL     | localhost:5432                           | データベース     |
| Redis          | localhost:6379                           | キャッシュ       |

```bash
# ヘルスチェック
curl http://localhost:8080/health
curl http://localhost:8001/api/health
```

## 開発

### 開発用スクリプト（dev.sh）

開発を効率化するための便利なスクリプトを用意しています：

```bash
# 基本的な使い方
./dev.sh [command] [service]

# よく使うコマンド
./dev.sh start           # 開発環境を起動（DB自動構築）
./dev.sh stop            # 開発環境を停止
./dev.sh restart         # 開発環境を再起動
./dev.sh logs            # ログをリアルタイム表示
./dev.sh logs backend-go # 特定サービスのログのみ表示
./dev.sh status          # サービス状態とリソース使用状況
./dev.sh urls            # アクセスURL一覧を表示

# ビルド関連
./dev.sh build           # 再ビルドして起動（レイヤーキャッシュ使用）
./dev.sh rebuild         # 完全再ビルド（キャッシュ無視）
./dev.sh build frontend  # 特定サービスのみ再ビルド

# データベース関連
./dev.sh schema          # スキーマを完全再構築（モックデータ含む）

# 環境変数確認
./dev.sh env backend-go  # Backend Goの環境変数を表示
./dev.sh env frontend    # フロントエンドの環境変数を表示

# クリーンアップ
./dev.sh clean           # 全コンテナとボリュームを削除
```

**主な機能:**

- カラフルなログ出力で視認性向上
- サービス個別の起動・停止・再起動に対応
- 自動データベーススキーマ構築
- アクセス URL 一覧表示
- リソース使用状況の確認
- 機密情報をマスクした環境変数表示

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

**Backend Go**

```bash
cd backend-go
go mod download
# データベースを起動
docker-compose -f ../docker-compose/dev.yml up -d postgres redis
# サーバー起動
go run cmd/api/main.go
# http://localhost:8080
```

**Backend Python**

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

### Backend Go (REST)

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

### Backend Python API

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

## インフラストラクチャ

NeuraKnot のインフラストラクチャは **Terraform** を使用して Infrastructure as Code (IaC) として管理されています。

### アーキテクチャ概要

**開発環境（Dev）**

- **Cognito User Pool**: 認証のみ
- **コスト**: $0（無料枠内）
- **用途**: ローカル開発・テスト

**本番環境（Prod）**

- **VPC**: 10.0.0.0/16（Multi-AZ）
- **ECS Fargate**: Backend Go + Backend Python（API サーバーのみ）
- **Vercel**: Next.js Frontend（フロントエンド）
- **RDS PostgreSQL**: Multi-AZ、暗号化有効
- **ALB**: Application Load Balancer（API 用）
- **Cognito**: OAuth 対応（Google, LINE, Apple）
- **Service Discovery**: Backend Python 用内部通信
- **Secrets Manager**: 機密情報管理

### モジュール構成

| モジュール            | 用途                         | 主要リソース                                                      |
| --------------------- | ---------------------------- | ----------------------------------------------------------------- |
| **Cognito**           | ユーザー認証・管理           | User Pool, User Pool Client, OAuth Providers                      |
| **VPC**               | ネットワーク基盤             | VPC, Subnets, Internet Gateway, NAT Gateway                       |
| **Route 53**          | DNS 管理                     | Hosted Zone, DNS Records (A, CNAME)                               |
| **ACM**               | SSL/TLS 証明書管理           | Certificate, DNS Validation                                       |
| **ECR**               | コンテナイメージ管理         | ECR Repositories (backend-go, backend-python), Lifecycle Policies |
| **ECS**               | コンテナオーケストレーション | ECS Cluster, Task Definition, Service (バックエンド API のみ)     |
| **RDS**               | データベース                 | PostgreSQL 15, Multi-AZ, Encryption                               |
| **ALB**               | ロードバランシング           | Application Load Balancer, Target Groups, HTTPS Listener          |
| **Service Discovery** | 内部サービス通信             | Cloud Map, Private DNS Namespace                                  |
| **Secrets Manager**   | 機密情報管理                 | Secrets, Secret Versions                                          |
| **IAM**               | アクセス制御                 | Roles, Policies, Policy Attachments                               |

### カスタムドメインと HTTPS

本番環境では、カスタムドメイン（`neuraknot.net`）と SSL/TLS 証明書を使用して安全な HTTPS 通信を提供しています。

**構成**:
- **ドメイン**: `neuraknot.net`（Route 53 で管理）
- **API エンドポイント**: `https://api.neuraknot.net`
- **SSL/TLS 証明書**: AWS Certificate Manager（ACM）で自動管理
- **証明書タイプ**: ワイルドカード証明書（`*.neuraknot.net`）

**セットアップ手順**:
詳細は [Route 53 & ACM セットアップガイド](./docs/ROUTE53_ACM_SETUP.md) を参照してください。

**主な機能**:
- ✅ 自動 DNS 管理（Route 53）
- ✅ 自動 SSL/TLS 証明書発行・更新（ACM）
- ✅ HTTP から HTTPS への自動リダイレクト
- ✅ ワイルドカード証明書によるサブドメイン対応

### クイックスタート

**Dev 環境のデプロイ（Cognito のみ）**

```bash
cd terraform/environments/dev
terraform init
terraform plan
terraform apply
```

**Prod 環境のデプロイ（フルスタック）**

```bash
cd terraform/environments/prod
terraform init
terraform plan
terraform apply
```

### コスト見積もり

- **Dev 環境**: $0/月（Cognito 無料枠内）
- **Prod 環境**: $100-130/月（AWS）+ Vercel
  - RDS (db.t3.medium): $30-40
  - ECS Fargate (2 タスク): $20-30
  - ALB: $20
  - NAT Gateway (2 つ): $45
  - その他: $5-15
  - Vercel: 無料枠または $20/月（Pro プラン）

### セキュリティ

- **ネットワークセキュリティ**: ALB → ECS → RDS の段階的アクセス制御
- **機密情報管理**: Secrets Manager による暗号化された機密情報管理
- **暗号化**: RDS、EBS、Secrets Manager で暗号化有効

### 詳細ドキュメント

**Terraform の詳細な使用方法、設定、トラブルシューティングについては、[terraform/README.md](./terraform/README.md) を参照してください。**

## ドキュメント

詳細なドキュメントは[docs/](./docs/)ディレクトリを参照してください。

### 主要ドキュメント

**開発ガイド**

- [開発ルール・貢献ガイド](./docs/CONTRIBUTING.md) - コミットメッセージ、プルリクエスト、コードレビューのルール
- [フロントエンド開発](./docs/frontend/GETTING_STARTED.md)
- [Backend Go 開発](./backend-go/README.md)
- [Backend Python 開発](./backend-python/README.md)

**アーキテクチャ**

- [現在のデータベース設計](./docs/DATABASE_DESIGN_CURRENT.md) - **現在の 8 テーブル詳細（MVP 版）**
- [将来のデータベース設計](./docs/DATABASE_DESIGN.md) - グループチャット、友達機能等の将来設計
- [スキーマ分析レポート](./docs/backend/SCHEMA_ANALYSIS_REPORT.md) - スキーマ状態と最適化情報
- [フロントエンドアーキテクチャ](./docs/frontend/ARCHITECTURE.md)
- [認証アーキテクチャ](./docs/frontend/AUTH_ARCHITECTURE.md)
- [エラーハンドリング](./docs/frontend/ERROR_HANDLING_ARCHITECTURE.md)

**AWS インフラ**

- [Terraform インフラ管理](./terraform/README.md) - **Infrastructure as Code**
- [AWS インフラ構築](./docs/aws/INFRASTRUCTURE.md)
- [AWS Cognito 設定](./docs/aws/COGNITO_SETUP.md)
- [AWS ドキュメント一覧](./docs/aws/)

**その他**

- [CI/CD セットアップガイド](./docs/CI_CD_SETUP.md) - **GitHub Actions 自動デプロイ**
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

## CI/CD

GitHub Actions を使用した自動化された CI/CD パイプラインを実装しています。

### ワークフロー

**1. CI (Continuous Integration)** - `.github/workflows/ci.yml`

Pull Request 作成時に自動実行：

- **変更検出**: 変更されたコンポーネントのみテスト
- **Frontend**: ESLint、TypeScript 型チェック、ビルドチェック
- **Backend Go**: golangci-lint、テスト実行、ビルドチェック
- **Backend Python**: ruff、black、型チェック

**2. Terraform Plan** - `.github/workflows/terraform-plan.yml`

Terraform 変更時に PR へ plan 結果をコメント：

- フォーマットチェック
- バリデーション
- Plan 実行と結果表示

**3. Deploy (Continuous Deployment)** - `.github/workflows/deploy.yml`

main ブランチへの push 時に自動デプロイ：

- Docker イメージビルド
- ECR へプッシュ
- ECS サービス更新
- デプロイ完了待機

### セットアップ

詳細な設定手順は [CI/CD セットアップガイド](./docs/CI_CD_SETUP.md) を参照してください。

**必要な GitHub Secrets**:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `ECR_REGISTRY`
- `ECS_CLUSTER_NAME`
- `ECS_SERVICE_NAME_GO`
- `ECS_SERVICE_NAME_PYTHON`

### ローカルでの Linter 実行

コミット前にローカルでチェック：

```bash
# Backend Go
cd backend-go && golangci-lint run

# Backend Python
cd backend-python && ruff check . && black --check .

# Frontend
cd frontend && npm run lint
```

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
   - Vercel（Next.js Frontend）
   - AWS ECS（Backend Go/Python API）

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
GO_BACKEND_PYTHON_URL=http://localhost:8001
```

**本番環境（Vercel/ECS）**

- Vercel: 環境変数設定画面で管理（フロントエンド）
- ECS: AWS Secrets Manager から取得（バックエンド API）

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

### Backend Python サーバーが起動しない

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
