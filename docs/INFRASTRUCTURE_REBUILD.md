# NeuraKnot インフラストラクチャ再構築ガイド

> **最終削除日**: 2026-02-07
> **削除理由**: コスト削減のための全環境完全削除
> **削除前の月額コスト**: 約 $107-120/月

---

## 目次

1. [削除されたリソース一覧](#1-削除されたリソース一覧)
2. [再構築の前提条件](#2-再構築の前提条件)
3. [Step 1: Dev 環境の再構築](#3-step-1-dev-環境の再構築cognito-のみ)
4. [Step 2: Prod 環境の再構築](#4-step-2-prod-環境の再構築フルスタック)
5. [Step 3: Docker イメージのビルドとプッシュ](#5-step-3-docker-イメージのビルドとプッシュ)
6. [Step 4: DB マイグレーション](#6-step-4-db-マイグレーション)
7. [Step 5: GitHub Actions の設定](#7-step-5-github-actions-の設定)
8. [Step 6: フロントエンド (Vercel) の設定](#8-step-6-フロントエンドvercelの設定)
9. [Step 7: DNS 設定](#9-step-7-dns-設定)
10. [削除前の設定値リファレンス](#10-削除前の設定値リファレンス)
11. [コスト見積もり](#11-コスト見積もり)
12. [トラブルシューティング](#12-トラブルシューティング)

---

## 1. 削除されたリソース一覧

### Prod 環境 (93 リソース)

| カテゴリ              | リソース                                                  | 詳細                         |
| --------------------- | --------------------------------------------------------- | ---------------------------- |
| **VPC**               | VPC, サブネット x4, IGW, NAT GW, ルートテーブル           | CIDR: 10.0.0.0/16            |
| **ECS**               | クラスター, サービス x2, タスク定義 x2, SG, CW Logs x3    | Fargate, Auto Scaling 付き   |
| **RDS**               | PostgreSQL 15, パラメータグループ, サブネットグループ, SG | db.t3.micro                  |
| **ALB**               | ALB, ターゲットグループ, リスナー (HTTP/HTTPS), SG        | パブリック                   |
| **ECR**               | リポジトリ x3 (backend-go, backend-python, migrate)       | イメージ含め完全削除         |
| **Cognito**           | User Pool, Client, Domain                                 | メール・パスワード認証       |
| **S3**                | メディアバケット (neuraknot-prod-media)                   | アバター画像 25 ファイル削除 |
| **Route53**           | ホストゾーン (neuraknot.net), A/CNAME レコード            | ドメイン自体は残存           |
| **ACM**               | SSL 証明書 (\*.neuraknot.net)                             | DNS 検証                     |
| **IAM**               | ECS ロール x2, GitHub OIDC, ポリシー多数                  | 最小権限設計                 |
| **Bastion**           | EC2 (t4g.nano), IAM ロール, SG                            | SSM Session Manager          |
| **VPC Endpoints**     | SSM, SSMMessages, EC2Messages, Logs                       | Interface 型                 |
| **Service Discovery** | Cloud Map ネームスペース, サービス                        | backend-python 用            |
| **Secrets Manager**   | cognito-client-secret                                     | 完全削除                     |

### Dev 環境 (5 リソース)

| カテゴリ    | リソース                                 |
| ----------- | ---------------------------------------- |
| **Cognito** | User Pool, Client, Domain, Random String |

---

## 2. 再構築の前提条件

### 必要なツール

```bash
# Terraform
terraform -version  # >= 1.0

# AWS CLI
aws --version       # v2 推奨

# Docker
docker --version

# AWS SSO ログイン
aws sso login --profile admin
```

### 必要な情報

再構築前に以下を準備：

| 項目                    | 説明                        | 入手方法                       |
| ----------------------- | --------------------------- | ------------------------------ |
| `db_password`           | PostgreSQL パスワード       | 新規生成                       |
| `encryption_master_key` | 暗号化マスターキー (Base64) | `openssl rand -base64 32`      |
| `openai_api_key`        | OpenAI API キー             | https://platform.openai.com/   |
| `anthropic_api_key`     | Anthropic API キー          | https://console.anthropic.com/ |
| `google_api_key`        | Google AI API キー          | https://aistudio.google.dev/   |
| `langsmith_api_key`     | LangSmith API キー (任意)   | https://smith.langchain.com/   |
| ドメイン名              | `neuraknot.net`             | ドメインレジストラ             |
| Vercel プロジェクト     | フロントエンドのデプロイ先  | https://vercel.com/            |

---

## 3. Step 1: Dev 環境の再構築（Cognito のみ）

```bash
cd terraform/environments/dev

# ローカル state ファイルを削除（クリーンスタート）
rm -f terraform.tfstate terraform.tfstate.backup

# 初期化
AWS_PROFILE=admin terraform init

# プラン確認
AWS_PROFILE=admin terraform plan -var-file="terraform.tfvars"

# 適用
AWS_PROFILE=admin terraform apply -var-file="terraform.tfvars"

# 出力値を保存（フロントエンド設定に必要）
AWS_PROFILE=admin terraform output -json > cognito-outputs.json
```

### 出力される値

- `cognito_user_pool_id` → フロントエンド `.env.local` に設定
- `cognito_client_id` → フロントエンド `.env.local` に設定
- `cognito_client_secret` → バックエンド設定に使用

---

## 4. Step 2: Prod 環境の再構築（フルスタック）

### 4-1. secrets.tfvars の作成

```bash
cd terraform/environments/prod

# ローカル state ファイルを削除（クリーンスタート）
rm -f terraform.tfstate terraform.tfstate.backup
```

`secrets.tfvars` を作成：

```hcl
# Database
db_password = "YOUR_SECURE_PASSWORD"

# Backend Go
gin_mode              = "release"
cognito_token_expiration = 3600
encryption_master_key = "YOUR_BASE64_MASTER_KEY"

# AI API Keys
openai_api_key    = "sk-..."
anthropic_api_key = "sk-ant-..."
google_api_key    = "AIza..."

# LangSmith (任意)
langsmith_tracing_v2 = true
langsmith_api_key    = "lsv2_..."
langsmith_project    = "NeuraKnot"
langsmith_endpoint   = "https://smith.langchain.com"
```

### 4-2. 初回デプロイ（ダミーイメージで）

初回は ECR にイメージがないため、ダミーイメージで起動：

```bash
cd terraform/environments/prod
```

`terraform.tfvars` の以下を一時変更：

```hcl
# 初回デプロイ用（ECR にイメージをプッシュ後に元に戻す）
backend_go_image     = "public.ecr.aws/docker/library/nginx:alpine"
backend_python_image = "public.ecr.aws/docker/library/nginx:alpine"
```

```bash
# 初期化
AWS_PROFILE=admin terraform init

# プラン確認
AWS_PROFILE=admin terraform plan \
  -var-file="terraform.tfvars" \
  -var-file="secrets.tfvars"

# 適用（約 10-15 分）
AWS_PROFILE=admin terraform apply \
  -var-file="terraform.tfvars" \
  -var-file="secrets.tfvars"

# 出力値を確認
AWS_PROFILE=admin terraform output
```

### 4-3. 重要な出力値

```bash
# ECR リポジトリ URL（イメージプッシュに必要）
terraform output ecr_repository_urls

# Cognito 情報（フロントエンド設定に必要）
terraform output cognito_user_pool_id
terraform output cognito_client_id

# ALB DNS 名（動作確認に必要）
terraform output alb_dns_name

# GitHub Actions 用ロール ARN
terraform output github_actions_role_arn

# RDS エンドポイント（マイグレーションに必要）
terraform output rds_endpoint
```

---

## 5. Step 3: Docker イメージのビルドとプッシュ

```bash
# AWS ECR にログイン
AWS_PROFILE=admin aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin 528757808906.dkr.ecr.ap-northeast-1.amazonaws.com

# Backend Go のビルド & プッシュ
docker build -t 528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-backend-go:latest \
  -f backend-go/docker/Dockerfile.prod backend-go/
docker push 528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-backend-go:latest

# Backend Python のビルド & プッシュ
docker build -t 528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-backend-python:latest \
  -f backend-python/docker/Dockerfile.prod backend-python/
docker push 528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-backend-python:latest

# Migrate イメージのビルド & プッシュ
docker build -t 528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-migrate:latest \
  -f backend-go/docker/Dockerfile.prod --target migrate backend-go/
docker push 528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-migrate:latest
```

### terraform.tfvars のイメージ設定を元に戻す

```hcl
backend_go_image     = "528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-backend-go:latest"
backend_python_image = "528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-backend-python:latest"
```

```bash
# イメージを更新して再適用
AWS_PROFILE=admin terraform apply \
  -var-file="terraform.tfvars" \
  -var-file="secrets.tfvars"
```

---

## 6. Step 4: DB マイグレーション

### Bastion 経由で RDS に接続

```bash
# Bastion を起動 & ポートフォワーディング
./scripts/connect-rds-bastion.sh start

# マイグレーション実行
./scripts/migrate.sh up

# 確認
psql -h localhost -p 15432 -U postgres -d neuraKnot -c "\dt"

# 完了後、Bastion を停止
./scripts/connect-rds-bastion.sh stop --stop-bastion
```

---

## 7. Step 5: GitHub Actions の設定

### GitHub Secrets に設定する値

```bash
# terraform output から取得
AWS_ROLE_ARN=$(AWS_PROFILE=admin terraform output -raw github_actions_role_arn)
AWS_REGION="ap-northeast-1"
ECR_REGISTRY="528757808906.dkr.ecr.ap-northeast-1.amazonaws.com"
ECS_CLUSTER_NAME="neuraKnot-prod-cluster"
ECS_SERVICE_NAME_GO="neuraKnot-prod-backend-go"
ECS_SERVICE_NAME_PYTHON="neuraKnot-prod-backend-python"
```

GitHub リポジトリの Settings > Secrets and variables > Actions に設定：

| Secret 名                 | 値                                                                  |
| ------------------------- | ------------------------------------------------------------------- |
| `AWS_ROLE_ARN`            | `arn:aws:iam::528757808906:role/neuraKnot-prod-github-actions-role` |
| `AWS_REGION`              | `ap-northeast-1`                                                    |
| `ECR_REGISTRY`            | `528757808906.dkr.ecr.ap-northeast-1.amazonaws.com`                 |
| `ECS_CLUSTER_NAME`        | `neuraKnot-prod-cluster`                                            |
| `ECS_SERVICE_NAME_GO`     | `neuraKnot-prod-backend-go`                                         |
| `ECS_SERVICE_NAME_PYTHON` | `neuraKnot-prod-backend-python`                                     |

---

## 8. Step 6: フロントエンド（Vercel）の設定

### Vercel 環境変数

Terraform output から取得した値を Vercel のプロジェクト設定に反映：

| 変数名                             | 値の例                      |
| ---------------------------------- | --------------------------- |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | `ap-northeast-1_XXXXXXXXX`  |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID`    | `xxxxxxxxxxxxxxxxxxxx`      |
| `NEXT_PUBLIC_API_URL`              | `https://api.neuraknot.net` |

---

## 9. Step 7: DNS 設定

### Route53 のネームサーバーをドメインレジストラに設定

```bash
# Route53 のネームサーバーを確認
AWS_PROFILE=admin aws route53 get-hosted-zone \
  --id $(AWS_PROFILE=admin terraform output -raw route53_zone_id) \
  --query 'DelegationSet.NameServers'
```

出力された 4 つの NS レコードを、ドメインレジストラ（お名前.com 等）に設定。

### DNS 反映待ち

```bash
# DNS 確認
dig api.neuraknot.net
dig www.neuraknot.net
```

反映には最大 48 時間かかる場合があります。

---

## 10. 削除前の設定値リファレンス

### terraform.tfvars（削除前の値）

```hcl
environment  = "prod"
aws_region   = "ap-northeast-1"
project_name = "neuraKnot"

# VPC
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["ap-northeast-1a", "ap-northeast-1c"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]
single_nat_gateway   = true

# ECR
ecr_repositories = ["backend-go", "backend-python", "migrate"]

# Cognito
password_minimum_length = 8
token_validity_access   = 60
token_validity_refresh  = 30

# RDS
db_name                        = "neuraKnot"
db_username                    = "postgres"
rds_instance_class             = "db.t3.micro"
rds_allocated_storage          = 20
rds_max_allocated_storage      = 20
rds_backup_retention_period    = 1
rds_multi_az                   = false
rds_deletion_protection        = false
enable_rds_enhanced_monitoring = false

# Domain
domain_name  = "neuraknot.net"
vercel_ip    = "216.198.79.1"
vercel_cname = "ea4433abb975d17c.vercel-dns-017.com"

# ALB
alb_health_check_path          = "/health"
alb_enable_deletion_protection = false

# ECS
backend_go_cpu            = 256
backend_go_memory         = 512
backend_python_cpu        = 256
backend_python_memory     = 512
backend_go_desired_count  = 1
backend_python_desired_count = 1

# CORS
allowed_origins = [
  "https://neuraknot.net",
  "https://www.neuraknot.net",
  "https://neuraknot.vercel.app"
]

# Service Discovery
backend_python_service_name = "backend-python"

# Logging
log_retention_in_days = 7
log_level             = "info"
frontend_url          = "https://www.neuraknot.net"
```

### 削除前の Cognito 情報（参考）

| 項目         | Prod                         | Dev                          |
| ------------ | ---------------------------- | ---------------------------- |
| User Pool ID | `ap-northeast-1_J6iK4yYhj`   | `ap-northeast-1_CwAIHQJp9`   |
| Client ID    | `1i1ch214jnmg45eh4dp09enuce` | `789rmm3gu5hkjh86s8knie7g73` |
| Domain       | `neuraknot-prod-dphiow6y`    | `neuraknot-dev-xs0hszxh`     |

> **注意**: 再構築時にはこれらの値は全て新規生成されます。フロントエンド・バックエンドの設定を更新する必要があります。

---

## 11. コスト見積もり

### 再構築後の月額コスト（削除前と同じ構成の場合）

| リソース         | 構成                   | 月額             |
| ---------------- | ---------------------- | ---------------- |
| RDS              | db.t3.micro, Single-AZ | ~$12-15          |
| ECS Fargate      | 0.25 vCPU x 512MB x 2  | ~$20-25          |
| ALB              | 1 台                   | ~$20             |
| NAT Gateway      | 1 台                   | ~$32             |
| VPC Endpoints    | SSM x3 + Logs          | ~$21.60          |
| Route53          | ホストゾーン 1 つ      | $0.50            |
| Bastion (停止時) | EBS 8GB のみ           | $0.64            |
| S3               | 従量課金               | ~$0-5            |
| **合計**         |                        | **~$107-120/月** |

---

## 12. トラブルシューティング

### ECR にイメージがなくて ECS タスクが起動しない

```bash
# ダミーイメージで先にインフラ構築 → その後イメージをプッシュ
# terraform.tfvars で一時的にダミーイメージを指定
backend_go_image     = "public.ecr.aws/docker/library/nginx:alpine"
backend_python_image = "public.ecr.aws/docker/library/nginx:alpine"
```

### terraform init でエラーが出る

```bash
# .terraform ディレクトリを削除して再初期化
rm -rf .terraform .terraform.lock.hcl
terraform init
```

### Cognito の User Pool ID が変わった

再構築時に新しい User Pool ID が生成されます。以下を更新：

- フロントエンド環境変数 (`NEXT_PUBLIC_COGNITO_USER_POOL_ID`)
- バックエンド環境変数 (`COGNITO_USER_POOL_ID`)
- Vercel 環境変数

### RDS に接続できない

```bash
# Bastion を確認
./scripts/connect-rds-bastion.sh status

# Bastion が停止していれば起動
./scripts/connect-rds-bastion.sh start
```

### SSL 証明書の検証が完了しない

Route53 の NS レコードがドメインレジストラに正しく設定されているか確認：

```bash
dig NS neuraknot.net
```

---

## 再構築の所要時間

| ステップ                         | 所要時間                    |
| -------------------------------- | --------------------------- |
| terraform apply (Prod)           | 10-15 分                    |
| Docker イメージビルド & プッシュ | 10-15 分                    |
| DB マイグレーション              | 2-5 分                      |
| DNS 反映                         | 数分〜48 時間               |
| **合計**                         | **約 30-60 分**（DNS 除く） |
