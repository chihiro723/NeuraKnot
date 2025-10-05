# AWS ドキュメント

BridgeSpeak アプリケーションの AWS インフラストラクチャに関するドキュメントです。

## 📚 ドキュメント一覧

### インフラストラクチャ

- **[INFRASTRUCTURE.md](./INFRASTRUCTURE.md)** - AWS インフラストラクチャの詳細構成
- **[COGNITO_SETUP.md](./COGNITO_SETUP.md)** - AWS Cognito 認証システムのセットアップガイド

## 🎯 概要

BridgeSpeak は AWS 上で動作するマイクロサービスアーキテクチャを採用しています：

- **フロントエンド**: Next.js (Vercel または ECS)
- **バックエンド API**: Go (ECS Fargate)
- **AI サーバー**: Python FastAPI (ECS Fargate)
- **データベース**: PostgreSQL (RDS)
- **認証**: AWS Cognito
- **ロードバランサー**: Application Load Balancer
- **コンテナレジストリ**: Amazon ECR

## 🚀 クイックスタート

### 1. 前提条件

- AWS CLI がインストール・設定済み
- Terraform がインストール済み
- Docker がインストール済み

### 2. 環境変数の設定

```bash
export AWS_REGION="ap-northeast-1"
export ENVIRONMENT="dev"
```

### 3. インフラストラクチャのデプロイ

```bash
cd terraform
terraform init
terraform plan -var="environment=dev"
terraform apply -var="environment=dev"
```

### 4. アプリケーションのデプロイ

```bash
./scripts/deploy.sh
```

## 📖 詳細ドキュメント

### インフラストラクチャ構成

[INFRASTRUCTURE.md](./INFRASTRUCTURE.md) では以下の内容を詳しく説明しています：

- ネットワーク構成（VPC、サブネット、ルーティング）
- 認証・認可（AWS Cognito、OAuth）
- データベース（RDS PostgreSQL）
- コンテナ・コンピューティング（ECS Fargate）
- ロードバランシング（ALB）
- セキュリティ（Security Groups、IAM）
- 機密情報管理（Secrets Manager）
- 監視・ログ（CloudWatch）
- コスト見積もり

### Cognito セットアップ

[COGNITO_SETUP.md](./COGNITO_SETUP.md) では以下の内容を詳しく説明しています：

- AWS Cognito の設定手順
- OAuth 認証の設定（Google、LINE、X）
- フロントエンド・バックエンドの連携
- データベーススキーマの更新
- トラブルシューティング

## 🔧 運用・メンテナンス

### 監視

- **CloudWatch**: アプリケーションログとメトリクス
- **ECS**: タスクの健全性監視
- **RDS**: データベースのパフォーマンス監視
- **ALB**: ロードバランサーのメトリクス

### バックアップ

- **RDS**: 自動バックアップ（7 日間保持）
- **EBS スナップショット**: 手動作成
- **ECR イメージ**: ライフサイクルポリシーで管理

### セキュリティ

- **暗号化**: データベースとストレージの暗号化
- **アクセス制御**: IAM ロールとポリシー
- **ネットワーク**: セキュリティグループと NACL
- **機密情報**: Secrets Manager での管理

## 💰 コスト最適化

### 開発環境

- **RDS**: db.t3.micro
- **ECS**: 最小構成
- **NAT Gateway**: 2 つ（冗長性のため）

### 本番環境

- **RDS**: db.t3.medium 以上
- **ECS**: 複数タスクでの冗長性
- **ALB**: 削除保護有効

## 🆘 サポート

### トラブルシューティング

各ドキュメントにトラブルシューティングセクションがあります：

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md#トラブルシューティング)
- [COGNITO_SETUP.md](./COGNITO_SETUP.md#トラブルシューティング)

### ログの確認

```bash
# ECS タスクのログ
aws logs get-log-events --log-group-name "/ecs/bridgespeak-dev-go-backend"

# RDS のログ
aws rds describe-db-log-files --db-instance-identifier bridgespeak-dev-db
```

### よくある問題

1. **ECS タスクが起動しない**
2. **RDS に接続できない**
3. **ALB のヘルスチェックが失敗**
4. **Cognito 認証が失敗**

詳細は各ドキュメントのトラブルシューティングセクションを参照してください。

## 📞 お問い合わせ

- **バグ報告**: [GitHub Issues](https://github.com/your-org/bridgespeak/issues)
- **技術的な質問**: チーム Slack チャンネル
- **メール**: support@bridgespeak.com

---

**Happy AWS! 🚀**
