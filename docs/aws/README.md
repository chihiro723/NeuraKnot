# AWS ドキュメント

BridgeSpeak アプリケーションの AWS インフラストラクチャに関するドキュメントです。

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

- User Pool設定（DEV/PROD分離）
- OAuth認証（Google, Apple, LINE）
- トークン設定

## 概要

BridgeSpeak は AWS 上で動作するマイクロサービスアーキテクチャを採用しています：

- **フロントエンド**: Vercel（Next.js）
- **バックエンド API**: Go (ECS Fargate)
- **AI サーバー**: Python FastAPI (ECS Fargate - 内部通信のみ)
- **データベース**: PostgreSQL (RDS Multi-AZ)
- **認証**: AWS Cognito (DEV/PROD User Pool分離)
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

### Terraformでのデプロイ

```bash
cd terraform/environments/prod
terraform init
terraform plan
terraform apply
```

## 運用・監視

### CloudWatch監視

- **ECS**: タスクCPU・メモリ使用率
- **RDS**: 接続数・クエリパフォーマンス
- **ALB**: リクエスト数・レスポンスタイム
- **Lambda**: 実行時間・エラー率

### アラート設定

- ECS CPU使用率 > 80%
- RDS接続数 > 80%
- ALB 5xx エラー > 10件/分
- Python AI 接続エラー > 10件/5分

### バックアップ

- **RDS**: 自動バックアップ（7日間保持）
- **ECR**: ライフサイクルポリシー（最新10イメージ保持）
- **Cognito**: 定期的なエクスポート（S3保存）

## セキュリティ

### ネットワークセキュリティ

- **ALB**: インターネット公開（HTTPS/HTTP）
- **Go Backend**: ALBからのみアクセス可
- **Python AI**: Go Backendからのみアクセス可（内部通信）
- **RDS**: ECSからのみアクセス可

### 機密情報管理

- **Secrets Manager**: データベース認証情報、OAuth認証情報
- **暗号化**: RDS暗号化、EBS暗号化
- **IAM**: 最小権限の原則

## コスト見積もり

### DEV環境
- 月額: $0（ローカル開発 + Cognito無料枠）

### PROD環境
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
- [Cognito認証のトラブルシューティング](./COGNITO_SETUP.md#トラブルシューティング)

### ログ確認

```bash
# ECS タスクのログ
aws logs tail /ecs/bridgespeak-prod-backend-go --follow

# RDS のログ
aws rds describe-db-log-files --db-instance-identifier bridgespeak-prod-db
```
