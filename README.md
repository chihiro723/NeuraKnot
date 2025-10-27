# NeuraKnot

**あなた専用の AI アシスタントを作成・カスタマイズできるメッセージングプラットフォーム**

人間と AI エージェントが自然にコミュニケーションできる次世代メッセージングアプリケーション。複数の LLM（OpenAI、Anthropic、Google）を搭載し、Slack、Notion、カレンダーなど様々な外部サービスと連携可能な AI エージェントを構築できます。

---

## サービス URL

- **本番環境**: [https://neuraknot.net](https://neuraknot.net)

---

## 主な機能

- **カスタマイズ可能な AI エージェント**: 性格（ペルソナ）、LLM モデル、連携サービスを自由に設定
- **複数 LLM サポート**: OpenAI、Anthropic、Google の各種モデルに対応
- **外部サービス連携**: Slack、Notion、GitHub、Google Calendar、天気情報など
- **リアルタイムストリーミング**: レスポンスを即座に表示
- **セキュアな認証**: AWS Cognito によるユーザー管理
- **詳細な履歴管理**: チャット履歴、AI ツール使用履歴を完全記録

---

## 目次

- [概要](#概要)
- [アプリケーション画面](#アプリケーション画面)
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

NeuraKnot は、AI エージェントとの対話を通じて様々なタスクを実行できる次世代メッセージングアプリケーションです。

### なぜ NeuraKnot なのか？

従来の AI チャットボットは単一の機能に限定されていますが、NeuraKnot では：

- **複数のペルソナを持つ AI エージェント**を作成（アシスタント、クリエイティブ、分析的など）
- **必要なツールだけを選択**して、あなた専用の AI を構築
- **特定のタスクに特化したエージェント**を複数運用（例：Slackbot、Notion アシスタント、リサーチャー）
- **プライベートで安全**な自分だけの AI エコシステム

---

## アプリケーション画面

### ランディングページ

https://neuraknot.net

![ランディングページのヒーローセクション](docs/images/landing-hero.png)

**モバイル表示**

<table>
<tr>
<td width="50%" align="center">
<img src="docs/images/landing-mobile.png" alt="ランディングページ - モバイル表示" width="100%"><br>
<sub>通常表示</sub>
</td>
<td width="50%" align="center">
<img src="docs/images/landing-mobile-sidemenu.png" alt="ランディングページ - モバイルサイドメニュー" width="100%"><br>
<sub>サイドメニュー</sub>
</td>
</tr>
</table>

---

### チャット画面

https://neuraknot.net/dashboard/chats/[id]

AI エージェントとのリアルタイム対話

> **注**: ライトモード・ダークモードの切り替えに対応しています（全ページで利用可能）

![チャット画面 - ダークモード](docs/images/chat-dark.png)

**モバイル表示**

<table>
<tr>
<td width="50%" align="center">
<img src="docs/images/chat-mobile.png" alt="チャット画面 - モバイル" width="100%"><br>
<sub>通常表示</sub>
</td>
<td width="50%" align="center">
<img src="docs/images/chat-mobile-talk.png" alt="チャット画面 - モバイル会話中" width="100%"><br>
<sub>会話中</sub>
</td>
</tr>
</table>

---

### AI エージェント作成

エージェント名、性格、AI モデル、システムプロンプト、連携サービスを設定して、あなた専用の AI アシスタントを作成できます。

| ライトモード                                  | ダークモード                                  |
| --------------------------------------------- | --------------------------------------------- |
| 【画像: エージェント作成画面 - ライトモード】 | 【画像: エージェント作成画面 - ダークモード】 |

**主な設定項目**

- エージェント名とアイコン
- 性格タイプ（アシスタント / クリエイティブ / 分析的 / 簡潔）
- AI モデル（OpenAI / Anthropic / Google から選択）
- システムプロンプト（AI の動作を細かく調整）
- 連携サービス（必要なツールだけを選択）

【画像: サービス連携モーダル - 複数サービス選択画面】

---

### 設定画面

ユーザー情報の管理や外部サービスとの連携設定を行います。

| ライトモード                      | ダークモード                      |
| --------------------------------- | --------------------------------- |
| 【画像: 設定画面 - ライトモード】 | 【画像: 設定画面 - ダークモード】 |

**主な設定項目**

- プロフィール情報の編集
- メールアドレスの変更
- パスワードの変更
- 外部サービスの API キー登録（Slack、Notion、GitHub など）

【画像: サービス連携一覧 - Slack, Notion, GitHub, Google Calendar など】

---

### 認証画面

メールアドレスとパスワードでログインできます。

| ログイン               | サインアップ               |
| ---------------------- | -------------------------- |
| 【画像: ログイン画面】 | 【画像: サインアップ画面】 |

---

### 使用例

#### Notion タスク管理

「今日のタスクを Notion に追加して」

AI が Notion に接続してタスクを自動で追加します。

【画像: Notion ツールを使っている様子】

#### データ分析と可視化

「このデータを分析して可視化して」

計算ツールを使って統計分析を実行し、結果をわかりやすく表示します。

【画像: 計算・分析ツールを使っている様子】

#### スケジュール管理と天気確認

「明日の天気を教えて、予定も確認して」

複数のツール（天気 API、Google カレンダー）を組み合わせて、まとめて情報を提供します。

【画像: 天気情報とカレンダーツールを組み合わせている様子】

#### チーム連携

「チームに進捗報告を送って」

Slack に自動でメッセージを投稿します。

【画像: Slack ツールを使っている様子】

---

### 連携可能なサービス

NeuraKnot は、様々な外部サービスやツールと連携できます。エージェント作成時に必要なサービスだけを選択できます。

#### 組み込みツール（常に利用可能）

- **日時操作** - 現在時刻の取得、タイムゾーン変換、日付計算
- **計算・統計** - 四則演算、統計処理、データ集計
- **テキスト処理** - 文字列操作、テキスト整形
- **データ変換** - JSON・CSV 形式の変換、データ構造の変更

#### 外部サービス連携（API キー設定が必要）

- **Slack** - メッセージ送信、チャンネル一覧取得、チーム連携
- **Notion** - ページ作成、データベース検索・更新、ドキュメント管理
- **Google Calendar** - 予定の確認、新規イベント作成、スケジュール管理
- **GitHub** - リポジトリ情報、Issue・PR 管理、コード検索
- **天気情報** - リアルタイム天気予報、地域別気象データ（OpenWeather API 使用）
- **Web 検索** - インターネット検索、最新情報の取得（Brave Search API 使用）
- **為替レート** - リアルタイム為替レート、通貨換算

【画像: サービス一覧画面】

---

### 対応 AI モデル

複数の AI プロバイダーのモデルから選択できます。タスクの種類や目的に応じて最適なモデルを使い分けることができます。

#### OpenAI

汎用性が高く、コーディングや論理的な推論が得意です。

#### Anthropic

自然で流暢な会話が特徴。長文の理解と生成に優れています。

#### Google

大量の情報処理と高速レスポンスが強みです。

---

### システム構成

NeuraKnot は、Vercel（フロントエンド）と AWS（バックエンド）を組み合わせたクラウドネイティブなアーキテクチャで動作しています。

【画像: インフラ全体構成図 - Vercel から AWS までの完全な構成】

**主なコンポーネント**

```
ユーザー
  ↓
┌─────────────────────────────────────┐
│ Vercel (Frontend)                    │
│ - Next.js 15                         │
│ - neuraknot.net / www.neuraknot.net │
└─────────────────────────────────────┘
  ↓ HTTPS
┌─────────────────────────────────────┐
│ AWS Route 53                         │
│ - DNS管理                            │
│ - ドメインルーティング               │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ AWS ALB (Application Load Balancer) │
│ - api.neuraknot.net                 │
│ - SSL/TLS終端 (ACM)                  │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────────┐
│ AWS ECS Fargate (Private Subnet)                        │
│ ┌──────────────────┐    ┌──────────────────────────┐  │
│ │ Backend Go       │───→│ Backend Python           │  │
│ │ - REST API       │    │ - AI処理 (LangChain)      │  │
│ │ - 認証・認可     │    │ - LLM統合                │  │
│ │ - ビジネスロジック│    │ - ツール実行             │  │
│ └──────────────────┘    └──────────────────────────┘  │
│          ↓                                              │
│ ┌──────────────────────────────────────────────────┐  │
│ │ AWS Cloud Map (Service Discovery)                │  │
│ │ - backend-python.neuraKnot.local                 │  │
│ └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ AWS RDS PostgreSQL 15 (Multi-AZ)    │
│ - アプリケーションデータ            │
│ - 暗号化有効                        │
│ - 自動バックアップ                  │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ AWS Secrets Manager                  │
│ - API Keys                           │
│ - DB認証情報                         │
│ - 暗号化キー                        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ AWS Cognito (User Pool)              │
│ - ユーザー認証                       │
│ - JWT発行                           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 外部サービス                         │
│ - OpenAI API                        │
│ - Anthropic API                     │
│ - Google AI API                     │
│ - Slack API                         │
│ - Notion API                        │
│ - その他連携サービス                 │
└─────────────────────────────────────┘
```

**セキュリティとネットワーク**

- **VPC 構成** - Multi-AZ 構成（10.0.0.0/16）で高可用性を確保
- **ネットワーク分離** - Public サブネットには ALB のみ、Private サブネットに ECS・RDS を配置
- **NAT Gateway** - プライベートサブネットから安全に外部通信
- **Security Groups** - 各層で必要最小限のアクセスのみ許可
- **VPC Endpoints** - SSM 経由で安全に RDS へ接続

**自動デプロイとインフラ管理**

- **GitHub Actions** - コードのプッシュで自動的にビルド・テスト・デプロイ
- **AWS ECR** - Docker イメージを安全に保管
- **Terraform** - インフラの構成をコードで管理（Infrastructure as Code）
- **Vercel** - フロントエンドを自動的にデプロイ

---

### レスポンシブデザイン

デスクトップ、タブレット、モバイルすべてのデバイスで最適な表示を実現しています。

【画像: 複数デバイスでの表示 - デスクトップ、タブレット、モバイルを並べて】

---

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
[RDS PostgreSQL] <--(管理用)-- [EC2 Bastion Host (SSM経由)]
                                          [External APIs]
                                          (OpenWeather, Slack, Notion, etc.)
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

- OpenAI
- Anthropic
- Google
- LangChain Agent

**データストア**

- PostgreSQL 15 - アプリケーションデータ（Backend-go のみアクセス）
  - 8 テーブル構成 - 詳細は [データベース設計](#データベース設計) セクション参照
  - 完全なドキュメント: [データベース設計書](./docs/DATABASE_DESIGN_CURRENT.md)

**認証**

- AWS Cognito - ユーザー認証と JWT 発行

**インフラ**

- Docker / Docker Compose (開発環境)
- AWS ECS Fargate (バックエンド API)
- Vercel (フロントエンド)
- AWS RDS (PostgreSQL)
- Terraform (IaC) - [詳細はこちら](./terraform/README.md)

### データベース設計

NeuraKnot は **PostgreSQL 15** を使用し、**Backend-go のみ**がデータベースにアクセスします。

#### テーブル構成（8 テーブル）

| カテゴリ        | テーブル名             | 説明                                      |
| --------------- | ---------------------- | ----------------------------------------- |
| ユーザー管理    | `users`                | ユーザー情報（AWS Cognito 連携）          |
| AI エージェント | `ai_agents`            | AI エージェント設定とペルソナ             |
| 会話            | `conversations`        | ユーザーと AI Agent 間の 1 対 1 会話      |
|                 | `messages`             | チャットメッセージ                        |
| AI 処理履歴     | `ai_chat_sessions`     | AI 処理セッション履歴（分析・デバッグ用） |
|                 | `ai_tool_usage`        | AI ツール使用履歴                         |
| サービス連携    | `user_service_configs` | ユーザーのサービス設定（暗号化）          |
|                 | `ai_agent_services`    | AI Agent × サービス紐付け                 |

#### 主な機能

- **LLM サポート**: OpenAI、Anthropic、Google の各種モデル
- **ペルソナ**: assistant, creative, analytical, concise
- **ツール連携**: Notion, Slack, GitHub, Weather など
- **セキュリティ**: 認証情報は AES-256-GCM で暗号化

#### 設計原則

1. **単一データアクセスポイント**: Backend-go のみが PostgreSQL にアクセス
2. **MVP に集中**: 現在は 1 対 1 チャット（User ↔ AI Agent）のみサポート
3. **パフォーマンス最適化**: 適切なインデックス配置、トリガーによる自動更新
4. **セキュリティ**: 機密情報の暗号化、CHECK 制約による型安全性

#### 詳細ドキュメント

- 📘 [現在のデータベース設計（MVP 版）](./docs/DATABASE_DESIGN_CURRENT.md) - 全テーブル詳細、ER 図、インデックス戦略
- 📗 [将来のデータベース設計](./docs/DATABASE_DESIGN.md) - グループチャット、友達機能等の将来設計
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
│   │   ├── bastion/          # EC2 Bastion Host (SSM経由RDS接続用)
│   │   ├── vpc-endpoints/    # VPC Endpoints (SSM用)
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
└── PostgreSQL (Docker/localhost:5432)

AWS Cognito (DEV User Pool) - 認証専用
```

**特徴:**

- PostgreSQL: アプリケーションデータのみ保存
- ユーザー管理: AWS Cognito DEV User Pool
- 認証方式: メール + パスワード

### 本番環境（AWS + Vercel）

本番環境では、フロントエンドを Vercel、バックエンド API を AWS で管理します。

```
[Vercel - Next.js Frontend]
 (neuraknot.net / www.neuraknot.net)
        |
        v HTTPS
[Application Load Balancer]
 (api.neuraknot.net)
        |
        v
[ECS Fargate - Backend Go] <--(内部通信)--> [ECS Fargate - Backend Python]
        |
        v
[RDS PostgreSQL]

[AWS Cognito PROD User Pool]
```

**特徴:**

- **フロントエンド**: Vercel（Next.js）- `https://neuraknot.net`
- **バックエンド API**: AWS ECS Fargate - `https://api.neuraknot.net`
- **Backend Python サーバー**: ECS Fargate（内部通信のみ、ALB から直接アクセス不可）
- **データベース**: RDS PostgreSQL（Multi-AZ）
- **Service Discovery**: Cloud Map（`backend-python.neuraKnot.local`）
- **ユーザー管理**: AWS Cognito PROD User Pool
- **DNS 管理**: Route 53（`neuraknot.net`）
- **SSL/TLS 証明書**: ACM（自動更新）

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

- OpenAI
- Anthropic
- Google

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
- MFA: 無効
- 用途: ローカル開発・テスト専用

**本番環境（PROD User Pool）**

- User Pool Name: `neuraKnot-prod-user-pool`
- 認証方式: メール + パスワード
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
- **Cognito**: ユーザー認証・管理
- **Service Discovery**: Backend Python 用内部通信
- **Secrets Manager**: 機密情報管理

### モジュール構成

| モジュール            | 用途                         | 主要リソース                                                      |
| --------------------- | ---------------------------- | ----------------------------------------------------------------- |
| **Cognito**           | ユーザー認証・管理           | User Pool, User Pool Client                                       |
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

**ドメイン構成**:

| ドメイン                                       | 用途                           | 提供元  | SSL 証明書    |
| ---------------------------------------------- | ------------------------------ | ------- | ------------- |
| [neuraknot.net](https://neuraknot.net)         | フロントエンド（リダイレクト） | Vercel  | Let's Encrypt |
| [www.neuraknot.net](https://www.neuraknot.net) | フロントエンド（メイン）       | Vercel  | Let's Encrypt |
| [api.neuraknot.net](https://api.neuraknot.net) | バックエンド API               | AWS ALB | ACM           |

**Route 53 DNS レコード**:

- `neuraknot.net` → A レコード → Vercel IP (216.198.79.1)
- `www.neuraknot.net` → CNAME レコード → Vercel (ea4433abb975d17c.vercel-dns-017.com)
- `api.neuraknot.net` → Alias レコード → AWS ALB

**セットアップ手順**:

- **API 用**: [Route 53 & ACM セットアップガイド](./docs/ROUTE53_ACM_SETUP.md)
- **フロントエンド用**: [Vercel デプロイメントガイド - カスタムドメイン設定](./docs/VERCEL_DEPLOYMENT.md#3-カスタムドメインの設定)

**主な機能**:

- ✅ 自動 DNS 管理（Route 53）
- ✅ 自動 SSL/TLS 証明書発行・更新（ACM + Let's Encrypt）
- ✅ HTTP から HTTPS への自動リダイレクト
- ✅ ワイルドカード証明書によるサブドメイン対応
- ✅ DNS 伝播の自動管理

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

**データベース管理**

- [SSM 経由 RDS 接続ガイド](./docs/backend/SSM_RDS_CONNECTION_GUIDE.md) - プライベート RDS への安全な接続方法
- [pgAdmin セットアップ](./docs/backend/PGADMIN_SETUP.md)

**デプロイ・インフラ**

- [CI/CD セットアップガイド](./docs/CI_CD_SETUP.md) - **GitHub Actions 自動デプロイ**
- [Vercel デプロイメントガイド](./docs/VERCEL_DEPLOYMENT.md) - **フロントエンドデプロイ + カスタムドメイン設定**
- [Route 53 & ACM セットアップガイド](./docs/ROUTE53_ACM_SETUP.md) - **API 用カスタムドメイン設定**
- [Swagger/OpenAPI 設定](./docs/backend/SWAGGER_GUIDE.md)
- [ルーティングベストプラクティス](./docs/frontend/ROUTING_BEST_PRACTICES.md)
- [サーバーサイドフェッチ](./docs/frontend/SERVER_SIDE_FETCH.md)

**セキュリティ**

- [セキュリティガイド](./docs/SECURITY.md) - **認証・CORS・機密情報管理・セキュリティベストプラクティス**

### セキュリティ

**認証・認可**

- **認証**: AWS Cognito + JWT
- **認可**: ロールベースアクセス制御
- **トークン有効期限**: アクセストークン 1 時間、リフレッシュトークン 30 日

**通信・データ保護**

- **暗号化**: TLS 1.2+ (通信)、AES-256-GCM (機密データ保存)
- **データベース**: RDS 暗号化有効
- **機密情報管理**: AWS Secrets Manager

**アプリケーションセキュリティ**

- **入力検証**: リクエスト DTO バリデーション
- **CORS 制限**: 本番環境では許可されたオリジンのみアクセス可能
  - `https://neuraknot.net`
  - `https://www.neuraknot.net`
  - バックアップ用: `https://neuraknot.vercel.app`
- **API 仕様の保護**: 本番環境の Swagger UI は非公開

**開発時の注意事項**

- **環境変数**: `.env.local`ファイルは絶対にコミットしない
- **機密情報**: API キー、パスワード、シークレットは環境変数または Secrets Manager で管理
- **本番環境**: デバッグモード無効、詳細エラーメッセージ非表示

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

詳細な設定手順は以下のドキュメントを参照してください：

- [CI/CD セットアップガイド](./docs/CI_CD_SETUP.md) - GitHub Actions 基本設定
- [GitHub Actions OIDC 設定ガイド](./docs/GITHUB_ACTIONS_OIDC_SETUP.md) - **AWS OIDC 認証設定（推奨）**

**必要な GitHub Secrets（OIDC 認証使用時）**:

- `AWS_ROLE_ARN` - GitHub Actions 用 IAM ロール ARN（Terraform で作成）
- `AWS_REGION` - AWS リージョン（例：ap-northeast-1）
- `ECR_REGISTRY` - ECR レジストリ URL
- `ECS_CLUSTER_NAME` - ECS クラスター名
- `ECS_SERVICE_NAME_GO` - Backend Go サービス URL
- `ECS_SERVICE_NAME_PYTHON` - Backend Python サービス名

**セキュリティ向上**: 従来のアクセスキー（`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`）の代わりに OIDC 認証を使用することで、一時的な認証情報による安全なデプロイが可能です。

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
