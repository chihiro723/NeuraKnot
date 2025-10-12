# BridgeSpeak - AI 分身チャットアプリケーション

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?logo=go)](https://golang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

AI と人間の境界を消すハイブリッドメッセージングアプリケーション。

## 目次

- [概要](#概要)
- [システム全体像](#システム全体像)
  - [アーキテクチャ](#アーキテクチャ)
  - [技術スタック](#技術スタック)
  - [プロジェクト構成](#プロジェクト構成)
- [主要機能](#主要機能)
- [クイックスタート](#クイックスタート)
  - [前提条件](#前提条件)
  - [1. リポジトリのクローン](#1-リポジトリのクローン)
  - [2. 環境変数の設定](#2-環境変数の設定)
  - [3. データベースのセットアップ](#3-データベースのセットアップ)
  - [4. サービス起動](#4-サービス起動)
  - [5. アクセス](#5-アクセス)
- [開発](#開発)
  - [主要コマンド](#主要コマンド)
  - [個別開発](#個別開発)
  - [テスト実行](#テスト実行)
- [API 仕様](#api仕様)
- [ドキュメント](#ドキュメント)
- [トラブルシューティング](#トラブルシューティング)
- [開発ロードマップ](#開発ロードマップ)
- [貢献](#貢献)
- [FAQ](#faq)
- [ライセンス](#ライセンス)

## 概要

人間と AI エージェントが自然にコミュニケーションできるメッセージングアプリケーションです。複数の個性を持つ AI エージェントとリアルタイムで対話し、チームコミュニケーションを強化します。

### 設計思想

BridgeSpeak は**マイクロサービスアーキテクチャ**と**クリーンアーキテクチャ**の原則に基づいて設計されています：

- **関心の分離**: フロントエンド（UI/UX）、ビジネスロジック（Go）、AI処理（Python）を独立して管理
- **技術の最適化**: 各サービスに最適な技術スタックを採用
- **スケーラビリティ**: サービス単位での水平スケーリングが可能
- **保守性**: 独立したサービスにより、変更の影響範囲を最小化
- **テスタビリティ**: 依存関係の注入とインターフェース駆動設計により高いテスト容易性を実現

## システム全体像

### アーキテクチャ

マイクロサービスアーキテクチャを採用し、各サービスが独立して動作します。

```
┌─────────────────────┐
│   Frontend Layer    │
│   Next.js 15        │  - React Server Components
│   TypeScript        │  - App Router
└──────────┬──────────┘
           │
           │ HTTPS
           ▼
┌─────────────────────┐
│   Backend Layer     │
├─────────────────────┤
│  Go API Server      │  - REST API
│  (Port: 8080)       │  - クリーンアーキテクチャ
│                     │  - DDD
├─────────────────────┤
│  Python AI Server   │  - LangChain
│  (Port: 8000)       │  - FastAPI
└──────────┬──────────┘
           │
           │ TCP/IP
           ▼
┌─────────────────────┐
│   Data Layer        │
├─────────────────────┤
│  PostgreSQL 15      │  - メインDB
│  (Port: 5432)       │  - トランザクション管理
├─────────────────────┤
│  Redis 7            │  - キャッシュ
│  (Port: 6379)       │  - セッション管理
└─────────────────────┘
```

### 技術スタック

**フロントエンド**

- Next.js 15 (App Router)
- TypeScript 5+
- Tailwind CSS
- AWS Cognito (認証)

**バックエンド**

- Go 1.25 - REST API (クリーンアーキテクチャ / DDD)
- Python 3.11 - AI 処理 (FastAPI + LangChain)

**データストア**

- PostgreSQL 15 - メインデータベース
- Redis 7 - キャッシュ・セッション

**インフラ**

- Docker / Docker Compose
- AWS (ECS, RDS, Cognito)
- Terraform (IaC)

### プロジェクト構成

```
bridgespeak/
├── frontend/              # Next.js フロントエンド
│   ├── app/              # App Router
│   ├── components/       # UIコンポーネント
│   └── lib/              # ユーティリティ・型定義
│
├── backend-go/           # Go API サーバー
│   ├── cmd/api/          # エントリーポイント
│   ├── internal/
│   │   ├── domain/      # ドメイン層
│   │   ├── usecase/     # ユースケース層
│   │   ├── handler/     # ハンドラー層
│   │   └── infrastructure/ # インフラ層
│   └── docs/            # Swagger ドキュメント
│
├── backend-python/       # Python AI サーバー
│   └── app/
│       ├── api/         # エンドポイント
│       ├── services/    # AIサービス
│       └── core/        # 設定・LLM
│
├── docker-compose/
│   ├── dev.yml          # 開発環境
│   └── prod.yml         # 本番環境
│
└── docs/                # プロジェクトドキュメント
```

## 主要機能

- **リアルタイムチャット** - WebSocket 対応のリアルタイムメッセージング
- **AI 対話システム** - 複数の個性を持つ AI エージェント
- **認証・認可** - AWS Cognito + JWT 認証
- **レスポンシブ UI** - PC/タブレット/モバイル対応
- **ダークモード** - システム設定に応じた自動切り替え

## クイックスタート

### 1. 環境準備

```bash
git clone [repository-url]
cd bridgespeak
```

**必要な環境**

- Docker Desktop
- Docker Compose
- Git

### 2. 環境変数の設定

各サービスの環境変数ファイルを作成します：

```bash
# backend-go/.env.local
cp backend-go/.env backend-go/.env.local

# backend-python/.env.local
cp backend-python/.env backend-python/.env.local

# frontend/.env.local
cp frontend/.env frontend/.env.local
```

各ファイルを編集し、必要な値（データベース接続情報、API キー等）を設定してください。

### 3. サービス起動

```bash
# 全サービスを起動
docker-compose -f docker-compose/dev.yml up -d

# ログを確認
docker-compose -f docker-compose/dev.yml logs -f
```

### 4. アクセス

| サービス         | URL                                      | 説明             |
| ---------------- | ---------------------------------------- | ---------------- |
| フロントエンド   | http://localhost:3000                    | Next.js Web UI   |
| Go API           | http://localhost:8080                    | REST API         |
| Swagger UI       | http://localhost:8080/swagger/index.html | API ドキュメント |
| Python AI Server | http://localhost:8000                    | AI 処理サーバー  |
| PostgreSQL       | localhost:5432                           | データベース     |
| Redis            | localhost:6379                           | キャッシュ       |

## 開発

### 主要コマンド

**Docker Compose コマンド**

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

**本番環境**

```bash
docker-compose -f docker-compose/prod.yml up -d
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
go run cmd/api/main.go
# http://localhost:8080
```

**Python AI Server**

```bash
cd backend-python
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# http://localhost:8000
```

## API 仕様

### Swagger UI

Go API のドキュメントは Swagger UI で確認できます：

**URL**: http://localhost:8080/swagger/index.html

### 主要エンドポイント

**認証（認証不要）**

- `POST /api/v1/auth/signup` - ユーザー登録
- `POST /api/v1/auth/signin` - ログイン
- `POST /api/v1/auth/confirm-signup` - 登録確認

**ユーザー（認証必要）**

- `GET /api/v1/users/profile` - プロフィール取得
- `PUT /api/v1/users/profile` - プロフィール更新
- `GET /api/v1/users` - ユーザー一覧

**システム**

- `GET /health` - ヘルスチェック

## ドキュメント

### サービス別ドキュメント

- [フロントエンド開発ガイド](./docs/frontend/GETTING_STARTED.md)
- [Go API 開発ガイド](./backend-go/README.md)
- [Python AI サーバー](./backend-python/README.md)

### インフラ・設定

- [AWS Cognito 設定](./docs/aws/COGNITO_SETUP.md)
- [AWS インフラ構築](./docs/aws/INFRASTRUCTURE.md)

### アーキテクチャ設計

- [フロントエンドアーキテクチャ](./docs/frontend/ARCHITECTURE.md)
- [データベース設計](./docs/DATABASE_DESIGN.md)
- [Swagger/OpenAPI 設定](./docs/backend/SWAGGER_GUIDE.md)

### セキュリティ

プロジェクトのセキュリティ対策：

- **認証**: AWS Cognito + JWT
- **認可**: Row Level Security (RLS)
- **暗号化**: 機密データの暗号化保存
- **レート制限**: DDoS 対策
- **入力検証**: 多層防御アプローチ

**重要**: `.env.local`ファイルは絶対にコミットしないでください。

## トラブルシューティング

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

## 開発ロードマップ

### Phase 1: MVP（完了）

- [x] 基本的なチャット機能
- [x] AI 対話システム
- [x] 認証・認可
- [x] レスポンシブ UI
- [x] API ドキュメント（Swagger）

### Phase 2: 機能拡張（進行中）

- [ ] グループチャット
- [ ] ファイル共有
- [ ] 通知システム
- [ ] 音声メッセージ

### Phase 3: AI 強化（計画中）

- [ ] 感情分析
- [ ] 多言語対応
- [ ] カスタムエージェント
- [ ] 学習機能

## 貢献

プロジェクトへの貢献を歓迎します：

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

詳細は [CONTRIBUTING.md](./docs/CONTRIBUTING.md) を参照してください。

## ライセンス

MIT License
