# AWS ドキュメント

NeuraKnot アプリケーションの AWS インフラストラクチャに関するドキュメントです。

[← ドキュメント一覧に戻る](../)

## ドキュメント一覧

### [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)

AWS インフラストラクチャの詳細構成

- ネットワーク設計（VPC、サブネット）
- ECS Fargate
- RDS PostgreSQL
- Application Load Balancer
- Service Discovery（Cloud Map）
- セキュリティグループ・IAM
- コスト見積もり

### [COGNITO_SETUP.md](./COGNITO_SETUP.md)

AWS Cognito 認証システムのセットアップガイド

- User Pool 設定（DEV/PROD 分離）
- OAuth 認証（Google, Apple, LINE）
- トークン設定

## 概要

NeuraKnot は AWS 上で動作するマイクロサービスアーキテクチャを採用しています：

- **フロントエンド**: Vercel（Next.js）
- **バックエンド API**: Go (ECS Fargate)
- **AI サーバー**: Backend Python FastAPI (ECS Fargate - 内部通信のみ)
- **データベース**: PostgreSQL (RDS Multi-AZ)
- **認証**: AWS Cognito (DEV/PROD User Pool 分離)
- **ロードバランサー**: Application Load Balancer
- **Service Discovery**: AWS Cloud Map
- **コンテナレジストリ**: Amazon ECR

## デプロイ

### 前提条件

- AWS CLI がインストール・設定済み
- Terraform がインストール済み（本番環境用）
- Docker がインストール済み

### 環境変数の設定

```bash
export AWS_REGION="ap-northeast-1"
export ENVIRONMENT="dev"  # または "prod"
```

### Terraform でのデプロイ

```bash
cd terraform/environments/prod
terraform init
terraform plan
terraform apply
```

## 運用・監視

### CloudWatch 監視

- **ECS**: タスク CPU・メモリ使用率
- **RDS**: 接続数・クエリパフォーマンス
- **ALB**: リクエスト数・レスポンスタイム
- **Lambda**: 実行時間・エラー率

### アラート設定

- ECS CPU 使用率 > 80%
- RDS 接続数 > 80%
- ALB 5xx エラー > 10 件/分
- Backend Python 接続エラー > 10 件/5 分

### バックアップ

- **RDS**: 自動バックアップ（7 日間保持）
- **ECR**: ライフサイクルポリシー（最新 10 イメージ保持）
- **Cognito**: 定期的なエクスポート（S3 保存）

## セキュリティ

### ネットワークセキュリティ

- **ALB**: インターネット公開（HTTPS/HTTP）
- **Backend Go**: ALB からのみアクセス可
- **Backend Python**: Backend Go からのみアクセス可（内部通信）
- **RDS**: ECS からのみアクセス可

### 機密情報管理

- **Secrets Manager**: データベース認証情報、OAuth 認証情報
- **暗号化**: RDS 暗号化、EBS 暗号化
- **IAM**: 最小権限の原則

## コスト見積もり

### DEV 環境

- 月額: $0（ローカル開発 + Cognito 無料枠）

### PROD 環境

- 月額: $224-284
  - RDS (db.t3.medium): $60-80
  - ECS Fargate: $60-75
  - ALB: $20
  - NAT Gateway: $35
  - その他: $49-74

詳細は[INFRASTRUCTURE.md](./INFRASTRUCTURE.md)を参照してください。

## トラブルシューティング

よくある問題の解決方法は各ドキュメントを参照：

- [インフラストラクチャのトラブルシューティング](./INFRASTRUCTURE.md#トラブルシューティング)
- [Cognito 認証のトラブルシューティング](./COGNITO_SETUP.md#トラブルシューティング)

### ログ確認

```bash
# ECS タスクのログ
aws logs tail /ecs/neuraKnot-prod-backend-go --follow

# RDS のログ
aws rds describe-db-log-files --db-instance-identifier neuraKnot-prod-db
```
