# NeuraKnot ドキュメント

プロジェクトの技術ドキュメント集です。

[← メイン README に戻る](../)

## 目次

- [プロジェクト全体](#プロジェクト全体)
- [AWS インフラ](#aws-インフラ)
- [バックエンド](#バックエンド)
- [フロントエンド](#フロントエンド)
- [将来の機能](#将来の機能)

## プロジェクト全体

### [CONTRIBUTING.md](./CONTRIBUTING.md)

開発ルール、ブランチ戦略、コミットメッセージ規約

### [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)

データベース設計書

- ER 図
- テーブル定義
- インデックス戦略
- Backend-go と Backend-python の統合パターン
- セキュリティ・パフォーマンス考慮事項

## AWS インフラ

### [aws/README.md](./aws/README.md)

AWS ドキュメントのインデックス

### [aws/INFRASTRUCTURE.md](./aws/INFRASTRUCTURE.md)

AWS インフラストラクチャ構成

- ネットワーク設計（VPC、サブネット）
- ECS Fargate
- RDS PostgreSQL
- Application Load Balancer
- セキュリティグループ
- コスト見積もり

### [aws/COGNITO_SETUP.md](./aws/COGNITO_SETUP.md)

AWS Cognito 認証システム

- User Pool 設定（DEV/PROD 分離）
- OAuth 認証（Google, Apple, LINE）
- トークン設定

## バックエンド

### [backend/SWAGGER_GUIDE.md](./backend/SWAGGER_GUIDE.md)

Swagger/OpenAPI 設定ガイド

- Swagger アノテーションの書き方
- ドキュメント生成方法
- エンドポイント定義

## フロントエンド

### [frontend/GETTING_STARTED.md](./frontend/GETTING_STARTED.md)

フロントエンド開発ガイド

- セットアップ手順
- 開発環境
- ディレクトリ構成

### [frontend/ARCHITECTURE.md](./frontend/ARCHITECTURE.md)

フロントエンドアーキテクチャ

- コンポーネント設計
- 状態管理
- ディレクトリ構造

### [frontend/AUTH_ARCHITECTURE.md](./frontend/AUTH_ARCHITECTURE.md)

認証アーキテクチャ

- AWS Cognito 連携
- JWT トークン管理
- 認証フロー

### [frontend/ERROR_HANDLING_ARCHITECTURE.md](./frontend/ERROR_HANDLING_ARCHITECTURE.md)

エラーハンドリング

- エラー処理パターン
- エラー境界
- ユーザーフィードバック

### [frontend/ROUTING_BEST_PRACTICES.md](./frontend/ROUTING_BEST_PRACTICES.md)

ルーティングベストプラクティス

- App Router
- 動的ルーティング
- ミドルウェア

### [frontend/SERVER_SIDE_FETCH.md](./frontend/SERVER_SIDE_FETCH.md)

サーバーサイドフェッチ

- Server Components
- データフェッチパターン
- キャッシング戦略

## 将来の機能

### [important/BILLING_SYSTEM_DESIGN.md](./important/BILLING_SYSTEM_DESIGN.md)

課金システム設計（将来実装予定）

- サブスクリプションモデル
- 従量課金
- 決済連携

## ドキュメント作成ガイドライン

新しいドキュメントを作成する際は、以下のガイドラインに従ってください：

1. **明確な目的**: ドキュメントの目的を冒頭に明記
2. **構造化**: 目次を作成し、セクションを明確に分ける
3. **コード例**: 実際のコード例を含める
4. **最新性**: 実装と同期を保つ
5. **簡潔さ**: 必要な情報のみを記載

## メンテナンス

ドキュメントは実装と同時に更新してください。古い情報や実装済みの一時的なドキュメントは定期的に削除します。
