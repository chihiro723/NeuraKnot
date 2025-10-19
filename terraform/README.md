# NeuraKnot Terraform Infrastructure

このディレクトリには、NeuraKnot アプリケーションの AWS インフラストラクチャを管理するための Terraform コードが含まれています。

## 📁 ディレクトリ構造

```
terraform/
├── modules/                          # 再利用可能なモジュール
│   ├── cognito/                      # AWS Cognito User Pool
│   ├── vpc/                          # VPC・サブネット・ルーティング
│   ├── ecr/                          # ECR リポジトリ
│   ├── ecs/                          # ECS クラスター・サービス・タスク定義
│   ├── rds/                          # RDS PostgreSQL
│   ├── alb/                          # Application Load Balancer
│   ├── service-discovery/            # Cloud Map（Backend Python 用）
│   ├── secrets/                      # Secrets Manager
│   └── iam/                          # IAM ロール・ポリシー
├── environments/
│   ├── dev/                          # 開発環境（Cognito のみ）
│   └── prod/                         # 本番環境（フルスタック）
├── .gitignore
└── README.md
```

## 🚀 クイックスタート

### 前提条件

- [Terraform](https://www.terraform.io/downloads.html) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) がインストール・設定済み
- AWS アカウントの適切な権限

### 1. Dev 環境のデプロイ（Cognito のみ）

```bash
cd environments/dev

# 初期化
terraform init

# プラン確認
terraform plan

# 適用
terraform apply
```

### 2. Prod 環境のデプロイ（フルスタック）

```bash
cd environments/prod

# 初期化
terraform init

# プラン確認
terraform plan

# 適用
terraform apply
```

## 🏗️ アーキテクチャ概要

### Dev 環境

- **Cognito User Pool**: 認証のみ
- **コスト**: $0（無料枠内）
- **用途**: ローカル開発・テスト

### Prod 環境

- **VPC**: 10.0.0.0/16（Multi-AZ）
- **ECS Fargate**: Backend Go + Backend Python（API サーバーのみ）
- **Vercel**: Next.js Frontend（フロントエンド）
- **RDS PostgreSQL**: Multi-AZ、暗号化有効
- **ALB**: Application Load Balancer（API 用）
- **Cognito**: メール・パスワード認証
- **Service Discovery**: Backend Python 用内部通信
- **Secrets Manager**: 機密情報管理

## 📋 モジュール一覧

### 1. Cognito モジュール

**用途**: ユーザー認証・管理（メール・パスワード認証）

**主要リソース**:

- `aws_cognito_user_pool` - User Pool 本体
- `aws_cognito_user_pool_client` - クライアントアプリ
- `aws_cognito_user_pool_domain` - Cognito ドメイン

### 2. VPC モジュール

**用途**: ネットワーク基盤

**主要リソース**:

- `aws_vpc` - VPC (10.0.0.0/16)
- `aws_subnet` - パブリック x2, プライベート x2
- `aws_internet_gateway` - インターネットゲートウェイ
- `aws_nat_gateway` - NAT Gateway x2（Multi-AZ）

### 3. ECR モジュール

**用途**: コンテナイメージ管理

**主要リソース**:

- `aws_ecr_repository` - backend-go, backend-python
- `aws_ecr_lifecycle_policy` - イメージライフサイクル

### 4. ECS モジュール

**用途**: コンテナオーケストレーション（バックエンド API のみ）

**主要リソース**:

- `aws_ecs_cluster` - ECS クラスター
- `aws_ecs_task_definition` - タスク定義（backend-go, backend-python）
- `aws_ecs_service` - ECS サービス（backend-go, backend-python）
- `aws_cloudwatch_log_group` - CloudWatch ログ

### 5. RDS モジュール

**用途**: データベース

**主要リソース**:

- `aws_db_instance` - PostgreSQL 15
- `aws_db_subnet_group` - サブネットグループ
- `aws_security_group` - セキュリティグループ

### 6. ALB モジュール

**用途**: ロードバランシング（API 用）

**主要リソース**:

- `aws_lb` - Application Load Balancer
- `aws_lb_target_group` - ターゲットグループ（backend-go）
- `aws_lb_listener` - HTTP/HTTPS リスナー

### 7. Service Discovery モジュール

**用途**: 内部サービス通信

**主要リソース**:

- `aws_service_discovery_private_dns_namespace` - プライベート DNS ネームスペース
- `aws_service_discovery_service` - Backend Python 用サービス

### 8. Secrets Manager モジュール

**用途**: 機密情報管理

**主要リソース**:

- `aws_secretsmanager_secret` - シークレット定義
- `aws_secretsmanager_secret_version` - シークレット値

### 9. IAM モジュール

**用途**: アクセス制御

**主要リソース**:

- `aws_iam_role` - ECS Task Execution/Task Role
- `aws_iam_policy` - カスタムポリシー
- `aws_iam_role_policy_attachment` - ポリシーアタッチメント

## 🔧 設定方法

### 環境変数の設定

```bash
export AWS_REGION="ap-northeast-1"
export ENVIRONMENT="dev"  # または "prod"
```

### terraform.tfvars の設定

各環境の `terraform.tfvars` ファイルを編集して、必要な値を設定してください。

**Dev 環境**:

```hcl
environment = "dev"
aws_region  = "ap-northeast-1"
project_name = "neuraKnot"

# Cognito settings
password_minimum_length = 8
token_validity_access   = 60
token_validity_refresh  = 30
```

**Prod 環境**:

```hcl
environment = "prod"
aws_region  = "ap-northeast-1"
project_name = "neuraKnot"
# その他の設定...
```

### S3 バックエンドの設定

State ファイルを S3 で管理する場合：

```bash
# バックエンド設定ファイルを作成
cat > backend.conf << EOF
bucket = "your-terraform-state-bucket"
key = "${ENVIRONMENT}/terraform.tfstate"
region = "ap-northeast-1"
dynamodb_table = "terraform-state-lock"
encrypt = true
EOF

# 初期化時にバックエンド設定を指定
terraform init -backend-config=backend.conf
```

## 🚀 デプロイ手順

### 1. 初回デプロイ

```bash
# Dev 環境
cd environments/dev
terraform init
terraform plan
terraform apply

# Prod 環境
cd environments/prod
terraform init
terraform plan
terraform apply
```

### 2. 更新デプロイ

```bash
# プラン確認
terraform plan

# 適用
terraform apply
```

### 3. リソース削除

```bash
# 注意: 本番環境では慎重に実行
terraform destroy
```

## 📊 コスト見積もり

### Dev 環境

- **月額**: $0（Cognito 無料枠内）

### Prod 環境

- **月額**: $100-130
  - RDS (db.t3.medium): $30-40
  - ECS Fargate (2 タスク): $20-30
  - ALB: $20
  - NAT Gateway (2 つ): $45
  - その他: $5-15
- **Vercel**: 無料枠または $20/月（Pro プラン）

## 🔒 セキュリティ

### ネットワークセキュリティ

- ALB: 0.0.0.0/0 からの HTTP/HTTPS を許可
- ECS: ALB からのみ許可（Backend Go）、Backend Go からのみ許可（Backend Python）
- RDS: ECS からのみ許可

### 機密情報管理

- データベースパスワード: Secrets Manager
- Cognito クライアントシークレット: Secrets Manager
- AI API キー: Secrets Manager
- 外部 API キー: Secrets Manager

### 暗号化

- RDS: 暗号化有効
- EBS: 暗号化有効
- Secrets Manager: 暗号化有効

## 📝 出力値の確認

デプロイ後、以下のコマンドで出力値を確認できます：

```bash
# 全出力値
terraform output

# 特定の出力値
terraform output cognito_user_pool_id
terraform output alb_dns_name
```

## 🆘 トラブルシューティング

### よくある問題

1. **ECS タスクが起動しない**

   - ロググループの確認
   - セキュリティグループの確認
   - IAM ロールの確認

2. **RDS に接続できない**

   - セキュリティグループの確認
   - サブネットグループの確認
   - パスワードの確認

3. **ALB のヘルスチェックが失敗**
   - ターゲットグループの確認
   - ヘルスチェックパスの確認

### ログの確認

```bash
# ECS タスクのログ
aws logs tail /ecs/neuraKnot-prod-backend-go --follow

# RDS のログ
aws rds describe-db-log-files --db-instance-identifier neuraKnot-prod-db
```

## 📚 関連ドキュメント

- [AWS インフラストラクチャ構成](../../docs/aws/INFRASTRUCTURE.md)
- [Cognito セットアップガイド](../../docs/aws/COGNITO_SETUP.md)
- [開発ルール・貢献ガイド](../../docs/CONTRIBUTING.md)

## 🤝 貢献

このインフラストラクチャに変更を加える場合は、以下の手順に従ってください：

1. 変更内容を確認
2. `terraform plan` でプランを確認
3. レビュー後に `terraform apply` を実行
4. 変更をドキュメントに反映

## 📄 ライセンス

MIT License
