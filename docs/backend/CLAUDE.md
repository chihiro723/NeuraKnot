# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリでコードを扱う際のガイダンスを提供します。

## 開発コマンド

### 環境セットアップ

```bash
# Python仮想環境を作成
python -m venv venv
source venv/bin/activate  # Linux/Mac

# 依存関係をインストール
pip install -r ai_server/requirements.txt

# 環境変数を設定
cp ai_server/.env.example ai_server/.env
# .envを編集して必要な値を設定
```

### アプリケーションの実行

```bash
# 開発サーバー
cd ai_server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Docker開発（推奨）
cd ai_server
docker-compose up -d

# ログ表示
docker-compose logs -f backend-python

# 本番デプロイ
docker-compose --profile production up -d
```

### テストとコード品質

```bash
# テスト実行
cd ai_server
pytest

# カバレッジ付きテスト
pytest --cov=app

# コードフォーマット
black .
isort .

# リンター
flake8
```

### セキュリティキー生成

```python
# Fernet暗号化キー生成
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```

```bash
# JWT秘密鍵生成
openssl rand -hex 32
```

## アーキテクチャ概要

これは FastAPI で構築された**セキュア AI メッセージングバックエンド**で、MCP（Model Context Protocol）を通じた外部サービス連携と AI チャット機能を組み合わせたハイブリッドアーキテクチャを実装しています。

### コアアーキテクチャ原則

**セキュリティファースト設計**: 公開データと機密データの厳格な分離を伴う多層セキュリティ。すべての機密情報（API キー、OAuth トークン）は Fernet で暗号化して保存し、フロントエンドには絶対に送信しません。

**サービスレイヤーパターン**: API ルート（`/api/v1/`）、ビジネスロジック（`/services/`）、データアクセス（`/database/`）の明確な分離。各サービスは特定のドメインロジックを処理し、テスタビリティのための依存性注入を行います。

**外部サービス用プラグインアーキテクチャ**: MCP ベースの統合により、`/mcp/services/`のプラグインアーキテクチャを通じて新しい外部サービス（Google Calendar、Slack など）を追加できます。

### 主要コンポーネント

**エージェント管理システム**: カスタマイズ可能なパーソナリティ、プリセット、エージェント別の機密ストレージを持つ AI エージェント。エージェントは異なる LLM モデルや動作で設定できます。

**チャットサービス**: LangChain + OpenAI を使用した AI 応答生成、会話メモリーとコンテキスト管理。パフォーマンス向上のために非同期でリクエストを処理します。

**セキュリティレイヤー**: JWT + AWS Cognito 認証、機密情報の Fernet 暗号化、Redis バックエンドのレート制限、包括的な監査ログ。

**MCP 統合**: OAuth2 と API キー認証サポートを持つ外部サービス統合の拡張可能フレームワーク。

### データベーススキーマ

PostgreSQL を使用し、以下の主要パターンを採用：

- AWS Cognito を通じたユーザー認証
- 暗号化された機密情報を持つエージェント設定
- 会話スレッド機能付きチャット履歴
- エージェント別 MCP サービス設定

### 設定管理

Pydantic 設定を使用した環境ベースの設定：

- **開発環境**: デバッグ有効、API ドキュメント利用可能
- **本番環境**: セキュリティ強化、API ドキュメント無効
- **テスト環境**: モックサービス、テストデータベース

すべての機密設定は環境変数ベースで、`.env.example`にドキュメント化されています。

### 監視とログ

別々のログファイルを持つ構造化 JSON ログ：

- `logs/app.log` - アプリケーションイベント
- `logs/error.log` - エラー追跡
- `logs/security.log` - セキュリティイベント
- `logs/metrics.log` - パフォーマンスメトリクス

依存関係監視付きのビルトインヘルスチェックが`/api/v1/health`で利用可能。

## このコードベースでの作業

### 新しい API エンドポイントの追加

1. `/api/v1/`にルートを作成
2. `/services/`にビジネスロジックを追加
3. `/models/`にモデルを定義
4. 必要に応じて認証/許可を追加

### 新しい MCP サービスの追加

1. `/mcp/services/`にサービスクラスを作成
2. ベース MCP クライアントから継承
3. OAuth2 または API キー認証を実装
4. MCP エンドポイントにサービス設定を追加

### セキュリティへの配慮

- 機密データ（API キー、トークン）をログや公開しない
- すべての新しい機密情報は Fernet 暗号化を使用
- 新しいエンドポイントにレート制限を追加
- 適切な認証チェックを実装
- 監査記録のためにセキュリティイベントをログ記録

### テスト戦略

- サービスとユーティリティの単体テスト
- API エンドポイントの統合テスト
- テストでの外部サービスのモック化
- セキュリティと認証フローのテスト

このコードベースは、包括的なエラーハンドリング、セキュリティログ、本番対応デプロイメント設定を伴うエンタープライズレベルの実践に従っています。
