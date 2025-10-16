# AWS インフラストラクチャ構成

## 🎯 概要

NeuraKnot アプリケーションの AWS インフラストラクチャ構成について説明します。Terraform を使用して Infrastructure as Code で管理されています。

## 🏗️ アーキテクチャ概要

### 全体構成図

```
Internet
    ↓
[Application Load Balancer] (Public Subnets)
    ↓
[ECS Fargate] (Private Subnets)
    ↓
[RDS PostgreSQL] (Private Subnets)
    ↓
[AWS Cognito] (認証)
    ↓
[Secrets Manager] (機密情報)
```

### 主要コンポーネント

- **フロントエンド**: Next.js (Vercel または ECS)
- **バックエンド API**: Go (ECS Fargate)
- **AI サーバー**: Python FastAPI (ECS Fargate)
- **データベース**: PostgreSQL (RDS)
- **認証**: AWS Cognito
- **ロードバランサー**: Application Load Balancer
- **コンテナレジストリ**: Amazon ECR

## 🌐 ネットワーク構成

### VPC (Virtual Private Cloud)

- **VPC**: `neuraKnot-{environment}-vpc`
- **CIDR**: 10.0.0.0/16
- **DNS サポート**: 有効
- **DNS ホスト名**: 有効

### サブネット構成

#### パブリックサブネット（ALB 用）

| サブネット名               | AZ              | CIDR        | 用途 |
| -------------------------- | --------------- | ----------- | ---- |
| `neuraKnot-{env}-public-1` | ap-northeast-1a | 10.0.1.0/24 | ALB  |
| `neuraKnot-{env}-public-2` | ap-northeast-1c | 10.0.2.0/24 | ALB  |

#### プライベートサブネット（ECS・RDS 用）

| サブネット名                | AZ              | CIDR         | 用途     |
| --------------------------- | --------------- | ------------ | -------- |
| `neuraKnot-{env}-private-1` | ap-northeast-1a | 10.0.10.0/24 | ECS・RDS |
| `neuraKnot-{env}-private-2` | ap-northeast-1c | 10.0.20.0/24 | ECS・RDS |

### ルーティング

- **パブリックルートテーブル**: Internet Gateway 経由
- **プライベートルートテーブル**: NAT Gateway 経由

## 🔐 認証・認可

### AWS Cognito User Pool

- **名前**: `neuraKnot-{environment}-user-pool`
- **認証方式**: メールアドレス + ユーザー名
- **パスワードポリシー**:
  - 最小長: 8 文字
  - 大文字・小文字・数字・記号必須
  - 一時パスワード有効期限: 7 日

### OAuth 認証プロバイダー

- **Google**: OAuth 2.0
- **LINE**: OIDC
- **X (Twitter)**: OIDC

### JWT トークン設定

- **アクセストークン**: 1 時間
- **ID トークン**: 1 時間
- **リフレッシュトークン**: 30 日

## 🗄️ データベース

### Amazon RDS (PostgreSQL)

- **エンジン**: PostgreSQL 15.4
- **インスタンスクラス**:
  - dev: `db.t3.micro`
  - prod: `db.t3.medium`
- **ストレージ**: 20GB（最大 100GB まで自動拡張）
- **暗号化**: 有効
- **バックアップ**: 7 日間保持
- **パフォーマンスインサイト**: 有効

### セキュリティ設定

- **パブリックアクセス**: 無効
- **セキュリティグループ**: ECS からのみアクセス可能
- **サブネットグループ**: プライベートサブネット

## 🐳 コンテナ・コンピューティング

### Amazon ECS (Fargate)

#### クラスター

- **名前**: `neuraKnot-{environment}-cluster`
- **Container Insights**: 有効

#### タスク定義

- **Go Backend**:
  - CPU: 256
  - メモリ: 512MB
  - ポート: 8080
- **Python AI Server**:
  - CPU: 512
  - メモリ: 1024MB
  - ポート: 8000
- **Next.js Frontend**:
  - CPU: 256
  - メモリ: 512MB
  - ポート: 3000

#### サービス

- **デザイアカウント**: 1（dev）、2（prod）
- **起動タイプ**: FARGATE
- **ネットワーク**: プライベートサブネット

### Amazon ECR (Container Registry)

#### リポジトリ

- `neuraKnot-{environment}-backend-go`
- `neuraKnot-{environment}-python-ai`
- `neuraKnot-{environment}-nextjs-frontend`

#### ライフサイクルポリシー

- タグ付きイメージ: 最新 10 個保持
- タグなしイメージ: 1 日後に削除

## ⚖️ ロードバランシング

### Application Load Balancer (ALB)

- **名前**: `neuraKnot-{environment}-alb`
- **タイプ**: Application Load Balancer
- **スキーム**: Internet-facing
- **削除保護**: prod 環境のみ有効

### ターゲットグループ

- **Go Backend**: `neuraKnot-{environment}-backend-go-tg`
- **ヘルスチェック**: `/health`エンドポイント
- **プロトコル**: HTTP
- **ポート**: 8080

### リスナー

- **HTTP**: ポート 80
- **HTTPS**: ポート 443（SSL 証明書設定時）

## 🔒 セキュリティ

### Security Groups

#### ALB Security Group

- **インバウンド**:
  - HTTP (80): 0.0.0.0/0
  - HTTPS (443): 0.0.0.0/0
- **アウトバウンド**: 全許可

#### ECS Security Group

- **インバウンド**:
  - HTTP (8080): ALB Security Group
- **アウトバウンド**: 全許可

#### RDS Security Group

- **インバウンド**:
  - PostgreSQL (5432): ECS Security Group
- **アウトバウンド**: 全許可

### IAM Roles

#### ECS Execution Role

- **用途**: コンテナ実行
- **ポリシー**: ECS Task Execution Role Policy
- **追加権限**: Secrets Manager アクセス

#### ECS Task Role

- **用途**: アプリケーション実行
- **権限**: Cognito 操作用

#### RDS Enhanced Monitoring Role

- **用途**: データベース監視
- **ポリシー**: AmazonRDSEnhancedMonitoringRole

## 🔐 機密情報管理

### AWS Secrets Manager

#### データベースパスワード

- **シークレット名**: `neuraKnot-{environment}-db-password`
- **回復期間**: 7 日
- **用途**: RDS 接続パスワード

#### OAuth 認証情報

- **シークレット名**: `neuraKnot-{environment}-oauth-credentials`
- **内容**: Google、LINE、X の認証情報
- **回復期間**: 7 日

## 📊 監視・ログ

### CloudWatch

#### ロググループ

- `/ecs/neuraKnot-{environment}-backend-go`
- `/ecs/neuraKnot-{environment}-python-ai`
- `/ecs/neuraKnot-{environment}-nextjs-frontend`

#### ログ保持期間

- **dev**: 30 日
- **prod**: 90 日

#### メトリクス

- ECS タスクの CPU・メモリ使用率
- ALB のリクエスト数・レスポンス時間
- RDS の接続数・CPU 使用率

## 💰 コスト見積もり

### 月額コスト（dev 環境）

| サービス           | コスト       |
| ------------------ | ------------ |
| RDS (db.t3.micro)  | $15-20       |
| ECS Fargate        | $10-15       |
| ALB                | $20          |
| NAT Gateway (2 つ) | $45          |
| ECR                | $5-10        |
| CloudWatch         | $5-10        |
| **合計**           | **$100-120** |

### 月額コスト（prod 環境）

| サービス               | コスト       |
| ---------------------- | ------------ |
| RDS (db.t3.medium)     | $30-40       |
| ECS Fargate (2 タスク) | $20-30       |
| ALB                    | $20          |
| NAT Gateway (2 つ)     | $45          |
| ECR                    | $5-10        |
| CloudWatch             | $10-20       |
| **合計**               | **$130-165** |

## 🚀 デプロイメント

### Terraform コマンド

```bash
# 初期化
terraform init

# プラン確認
terraform plan -var="environment=dev"

# 適用
terraform apply -var="environment=dev"

# 破棄
terraform destroy -var="environment=dev"
```

### 環境変数

```bash
export AWS_REGION="ap-northeast-1"
export ENVIRONMENT="dev"
```

## 🔧 メンテナンス

### 定期メンテナンス

- **RDS**: 日曜日 4:00-5:00 (JST)
- **ECS**: 自動更新
- **ALB**: 自動更新

### バックアップ

- **RDS**: 自動バックアップ（7 日間保持）
- **EBS スナップショット**: 手動作成
- **ECR イメージ**: ライフサイクルポリシーで管理

## 📚 関連ドキュメント

- [Cognito セットアップガイド](./COGNITO_SETUP.md)
- [Terraform 設定ファイル](../../terraform/)
- [デプロイスクリプト](../../scripts/deploy.sh)

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
   - セキュリティグループの確認

### ログの確認方法

```bash
# ECS タスクのログ
aws logs get-log-events --log-group-name "/ecs/neuraKnot-dev-backend-go" --log-stream-name "ecs/backend-go/..."

# RDS のログ
aws rds describe-db-log-files --db-instance-identifier neuraKnot-dev-db
```

---

**注意**: 本番環境では必ず SSL 証明書を設定し、HTTPS での通信を有効にしてください。
