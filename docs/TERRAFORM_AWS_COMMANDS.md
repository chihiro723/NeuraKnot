# Terraform & AWS CLI コマンドリファレンス

このドキュメントでは、NeuraKnot プロジェクトで使用する便利な Terraform と AWS CLI コマンドを網羅的にまとめています。

## 目次

- [Terraform コマンド](#terraform-コマンド)
- [AWS CLI コマンド](#aws-cli-コマンド)
- [Docker & ECR コマンド](#docker--ecr-コマンド)
- [トラブルシューティング](#トラブルシューティング)

---

## Terraform コマンド

### 基本操作

#### 初期化

```bash
# Terraformの初期化
terraform init

# モジュールを最新版に更新
terraform init -upgrade

# バックエンド設定を再構成
terraform init -reconfigure
```

#### プランニング

```bash
# 実行計画を確認
terraform plan

# 変数ファイルを指定してプラン
terraform plan -var-file="terraform.tfvars" -var-file="secrets.tfvars"

# プランを保存
terraform plan -out=tfplan

# 特定のリソースのみプラン
terraform plan -target=module.ecs.aws_ecs_service.backend_go
```

#### 適用

```bash
# 変更を適用
terraform apply

# 自動承認で適用
terraform apply -auto-approve

# 保存したプランを適用
terraform apply tfplan

# 変数ファイルを指定して適用
terraform apply -var-file="terraform.tfvars" -var-file="secrets.tfvars"

# 特定のリソースのみ適用
terraform apply -target=module.ecs
```

#### 破棄

```bash
# すべてのリソースを削除
terraform destroy

# 自動承認で削除
terraform destroy -auto-approve

# 特定のリソースのみ削除
terraform destroy -target=module.ecs.aws_ecs_service.backend_go
```

### State 管理

#### State 確認

```bash
# State内のリソース一覧
terraform state list

# 特定のリソースの詳細表示
terraform state show module.ecs.aws_ecs_service.backend_go

# Stateから特定のリソースを削除
terraform state rm module.secrets.aws_secretsmanager_secret.cognito_client_secret

# リソースを別の名前に移動
terraform state mv module.old_name module.new_name
```

#### State 同期

```bash
# Stateをリモートと同期
terraform refresh

# Stateファイルをバックアップ
cp terraform.tfstate terraform.tfstate.backup
```

#### State ロック解除

```bash
# ロックを強制解除（ロックIDが必要）
terraform force-unlock <LOCK_ID>

# ローカルStateのロックファイルを削除
rm -f .terraform.tfstate.lock.info
```

### 出力・検証

#### 出力確認

```bash
# すべての出力を表示
terraform output

# 特定の出力を表示
terraform output alb_dns_name

# JSON形式で出力
terraform output -json

# 生の値を出力（引用符なし）
terraform output -raw alb_dns_name
```

#### 検証

```bash
# 構文チェック
terraform validate

# フォーマット整形
terraform fmt

# 再帰的にフォーマット
terraform fmt -recursive

# フォーマットチェックのみ
terraform fmt -check
```

### ワークスペース管理

```bash
# ワークスペース一覧
terraform workspace list

# 新しいワークスペースを作成
terraform workspace new prod

# ワークスペースを切り替え
terraform workspace select prod

# 現在のワークスペースを表示
terraform workspace show

# ワークスペースを削除
terraform workspace delete dev
```

### インポート

```bash
# 既存のAWSリソースをインポート
terraform import module.vpc.aws_vpc.main vpc-12345678

# ECSサービスをインポート
terraform import module.ecs.aws_ecs_service.backend_go arn:aws:ecs:region:account:service/cluster-name/service-name
```

### グラフ生成

```bash
# 依存関係グラフを生成
terraform graph | dot -Tpng > graph.png

# 簡易的なグラフ
terraform graph
```

---

## AWS CLI コマンド

### 認証・プロファイル

#### プロファイル管理

```bash
# 利用可能なプロファイル一覧
aws configure list-profiles

# 特定のプロファイルを使用
export AWS_PROFILE=admin

# 現在の認証情報を確認
aws sts get-caller-identity

# SSOログイン
aws sso login --profile admin
```

### ECS (Elastic Container Service)

#### サービス管理

```bash
# サービス一覧
aws ecs list-services --cluster neuraKnot-prod-cluster --region ap-northeast-1

# サービスの詳細情報
aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --services neuraKnot-prod-backend-go neuraKnot-prod-backend-python \
  --region ap-northeast-1

# サービスの状態を確認（表形式）
aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --services neuraKnot-prod-backend-go \
  --region ap-northeast-1 \
  --query 'services[*].[serviceName,status,runningCount,desiredCount,deployments[0].rolloutState]' \
  --output table

# サービスを強制的に再デプロイ
aws ecs update-service \
  --cluster neuraKnot-prod-cluster \
  --service neuraKnot-prod-backend-go \
  --force-new-deployment \
  --region ap-northeast-1

# サービスのタスク数を変更
aws ecs update-service \
  --cluster neuraKnot-prod-cluster \
  --service neuraKnot-prod-backend-go \
  --desired-count 2 \
  --region ap-northeast-1

# サービスを停止（desired-count=0）
aws ecs update-service \
  --cluster neuraKnot-prod-cluster \
  --service neuraKnot-prod-backend-go \
  --desired-count 0 \
  --region ap-northeast-1
```

#### タスク管理

```bash
# タスク一覧
aws ecs list-tasks \
  --cluster neuraKnot-prod-cluster \
  --region ap-northeast-1

# 特定のサービスのタスク一覧
aws ecs list-tasks \
  --cluster neuraKnot-prod-cluster \
  --service-name neuraKnot-prod-backend-go \
  --region ap-northeast-1

# タスクの詳細情報
aws ecs describe-tasks \
  --cluster neuraKnot-prod-cluster \
  --tasks <task-arn> \
  --region ap-northeast-1

# タスク定義の一覧
aws ecs list-task-definitions --region ap-northeast-1

# タスク定義の詳細
aws ecs describe-task-definition \
  --task-definition neuraKnot-prod-backend-go \
  --region ap-northeast-1

# タスク定義の環境変数を確認
aws ecs describe-task-definition \
  --task-definition neuraKnot-prod-backend-go \
  --region ap-northeast-1 \
  --query 'taskDefinition.containerDefinitions[0].environment' \
  --output table

# タスクを停止
aws ecs stop-task \
  --cluster neuraKnot-prod-cluster \
  --task <task-arn> \
  --region ap-northeast-1
```

#### ECS Exec（コンテナ内でコマンド実行）

```bash
# タスク内でシェルを起動
aws ecs execute-command \
  --cluster neuraKnot-prod-cluster \
  --task <task-id> \
  --container backend-go \
  --interactive \
  --command "/bin/sh" \
  --region ap-northeast-1
```

#### イベント確認

```bash
# サービスのイベントログ
aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --services neuraKnot-prod-backend-go \
  --region ap-northeast-1 \
  --query 'services[0].events[0:10].[createdAt,message]' \
  --output table
```

### ECR (Elastic Container Registry)

#### リポジトリ管理

```bash
# リポジトリ一覧
aws ecr describe-repositories --region ap-northeast-1

# 特定のリポジトリの詳細
aws ecr describe-repositories \
  --repository-names neuraknot-prod-backend-go \
  --region ap-northeast-1

# イメージ一覧
aws ecr list-images \
  --repository-name neuraknot-prod-backend-go \
  --region ap-northeast-1

# イメージの詳細情報
aws ecr describe-images \
  --repository-name neuraknot-prod-backend-go \
  --region ap-northeast-1

# 特定のタグのイメージ情報
aws ecr describe-images \
  --repository-name neuraknot-prod-backend-go \
  --image-ids imageTag=latest \
  --region ap-northeast-1
```

#### イメージ削除

```bash
# 特定のタグのイメージを削除
aws ecr batch-delete-image \
  --repository-name neuraknot-prod-backend-go \
  --image-ids imageTag=old-tag \
  --region ap-northeast-1

# タグなしイメージを削除
aws ecr list-images \
  --repository-name neuraknot-prod-backend-go \
  --filter "tagStatus=UNTAGGED" \
  --region ap-northeast-1 \
  --query 'imageIds[*]' \
  --output json | \
  jq -r '.[] | "--image-ids imageDigest=\(.imageDigest)"' | \
  xargs -I {} aws ecr batch-delete-image \
    --repository-name neuraknot-prod-backend-go {} \
    --region ap-northeast-1
```

### CloudWatch Logs

#### ログ確認

```bash
# ログストリーム一覧
aws logs describe-log-streams \
  --log-group-name /ecs/neuraKnot-prod-backend-go \
  --region ap-northeast-1

# リアルタイムでログを表示
aws logs tail /ecs/neuraKnot-prod-backend-go \
  --follow \
  --region ap-northeast-1

# 最新5分間のログを表示
aws logs tail /ecs/neuraKnot-prod-backend-go \
  --since 5m \
  --region ap-northeast-1

# 特定の時間範囲のログを表示
aws logs tail /ecs/neuraKnot-prod-backend-go \
  --since 2025-10-19T10:00:00 \
  --until 2025-10-19T11:00:00 \
  --region ap-northeast-1

# ログをフィルタリング
aws logs filter-log-events \
  --log-group-name /ecs/neuraKnot-prod-backend-go \
  --filter-pattern "ERROR" \
  --region ap-northeast-1

# ログをJSON形式で出力
aws logs tail /ecs/neuraKnot-prod-backend-go \
  --format json \
  --region ap-northeast-1
```

### ALB (Application Load Balancer)

#### ロードバランサー管理

```bash
# ALB一覧
aws elbv2 describe-load-balancers --region ap-northeast-1

# 特定のALBの詳細
aws elbv2 describe-load-balancers \
  --names neuraKnot-prod-alb \
  --region ap-northeast-1

# ターゲットグループ一覧
aws elbv2 describe-target-groups --region ap-northeast-1

# ターゲットグループのヘルス状態
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn> \
  --region ap-northeast-1

# リスナー一覧
aws elbv2 describe-listeners \
  --load-balancer-arn <alb-arn> \
  --region ap-northeast-1

# リスナールール一覧
aws elbv2 describe-rules \
  --listener-arn <listener-arn> \
  --region ap-northeast-1
```

### RDS (Relational Database Service)

#### データベース管理

```bash
# RDSインスタンス一覧
aws rds describe-db-instances --region ap-northeast-1

# 特定のRDSインスタンスの詳細
aws rds describe-db-instances \
  --db-instance-identifier neuraknot-prod-db \
  --region ap-northeast-1

# RDSのエンドポイント取得
aws rds describe-db-instances \
  --db-instance-identifier neuraknot-prod-db \
  --region ap-northeast-1 \
  --query 'DBInstances[0].Endpoint.[Address,Port]' \
  --output table

# RDSインスタンスを停止
aws rds stop-db-instance \
  --db-instance-identifier neuraknot-prod-db \
  --region ap-northeast-1

# RDSインスタンスを起動
aws rds start-db-instance \
  --db-instance-identifier neuraknot-prod-db \
  --region ap-northeast-1

# スナップショット一覧
aws rds describe-db-snapshots \
  --db-instance-identifier neuraknot-prod-db \
  --region ap-northeast-1

# スナップショットを作成
aws rds create-db-snapshot \
  --db-snapshot-identifier neuraknot-prod-snapshot-$(date +%Y%m%d) \
  --db-instance-identifier neuraknot-prod-db \
  --region ap-northeast-1
```

### Cognito

#### ユーザープール管理

```bash
# ユーザープール一覧
aws cognito-idp list-user-pools \
  --max-results 10 \
  --region ap-northeast-1

# ユーザープールの詳細
aws cognito-idp describe-user-pool \
  --user-pool-id ap-northeast-1_J6iK4yYhj \
  --region ap-northeast-1

# ユーザープールクライアントの詳細
aws cognito-idp describe-user-pool-client \
  --user-pool-id ap-northeast-1_J6iK4yYhj \
  --client-id <client-id> \
  --region ap-northeast-1

# ユーザー一覧
aws cognito-idp list-users \
  --user-pool-id ap-northeast-1_J6iK4yYhj \
  --region ap-northeast-1

# 特定のユーザー情報
aws cognito-idp admin-get-user \
  --user-pool-id ap-northeast-1_J6iK4yYhj \
  --username <username> \
  --region ap-northeast-1

# ユーザーを削除
aws cognito-idp admin-delete-user \
  --user-pool-id ap-northeast-1_J6iK4yYhj \
  --username <username> \
  --region ap-northeast-1
```

### VPC & ネットワーク

#### VPC 管理

```bash
# VPC一覧
aws ec2 describe-vpcs --region ap-northeast-1

# サブネット一覧
aws ec2 describe-subnets --region ap-northeast-1

# セキュリティグループ一覧
aws ec2 describe-security-groups --region ap-northeast-1

# 特定のセキュリティグループの詳細
aws ec2 describe-security-groups \
  --group-ids sg-12345678 \
  --region ap-northeast-1

# ルートテーブル一覧
aws ec2 describe-route-tables --region ap-northeast-1

# NAT Gateway一覧
aws ec2 describe-nat-gateways --region ap-northeast-1

# インターネットゲートウェイ一覧
aws ec2 describe-internet-gateways --region ap-northeast-1
```

### IAM (Identity and Access Management)

#### ロール・ポリシー管理

```bash
# ロール一覧
aws iam list-roles

# 特定のロールの詳細
aws iam get-role --role-name neuraKnot-prod-ecs-task-role

# ロールにアタッチされたポリシー一覧
aws iam list-attached-role-policies \
  --role-name neuraKnot-prod-ecs-task-role

# ポリシーの詳細
aws iam get-policy --policy-arn <policy-arn>

# ポリシーのバージョン内容
aws iam get-policy-version \
  --policy-arn <policy-arn> \
  --version-id v1
```

### Secrets Manager

#### シークレット管理

```bash
# シークレット一覧
aws secretsmanager list-secrets --region ap-northeast-1

# シークレットの値を取得
aws secretsmanager get-secret-value \
  --secret-id neuraKnot-prod-db-password \
  --region ap-northeast-1

# シークレットを更新
aws secretsmanager update-secret \
  --secret-id neuraKnot-prod-db-password \
  --secret-string "new-password" \
  --region ap-northeast-1

# シークレットを削除（復旧可能期間付き）
aws secretsmanager delete-secret \
  --secret-id neuraKnot-prod-db-password \
  --recovery-window-in-days 7 \
  --region ap-northeast-1
```

### リソース検索

#### タグベースの検索

```bash
# 特定のタグを持つリソースを検索
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Environment,Values=prod \
  --region ap-northeast-1

# プロジェクト名でリソースを検索
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Project,Values=neuraKnot \
  --region ap-northeast-1
```

---

## Docker & ECR コマンド

### Docker 基本操作

#### イメージ管理

```bash
# イメージ一覧
docker images

# イメージをビルド
docker build -t my-app:latest .

# マルチプラットフォームビルド（Apple Silicon対応）
docker buildx build --platform linux/amd64 -t my-app:latest .

# イメージを削除
docker rmi my-app:latest

# 未使用のイメージを削除
docker image prune

# すべての未使用リソースを削除
docker system prune -a
```

#### コンテナ管理

```bash
# コンテナ一覧（実行中）
docker ps

# コンテナ一覧（すべて）
docker ps -a

# コンテナを起動
docker run -d -p 8080:8080 my-app:latest

# コンテナを停止
docker stop <container-id>

# コンテナを削除
docker rm <container-id>

# コンテナのログを確認
docker logs <container-id>

# コンテナ内でコマンド実行
docker exec -it <container-id> /bin/sh
```

### ECR との連携

#### ECR ログイン

```bash
# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin \
  528757808906.dkr.ecr.ap-northeast-1.amazonaws.com
```

#### イメージのプッシュ

```bash
# Backend Goのイメージをビルド＆プッシュ
cd backend-go
docker buildx build \
  --platform linux/amd64 \
  -t 528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-backend-go:latest \
  -f docker/Dockerfile.prod \
  . \
  --push

# Backend Pythonのイメージをビルド＆プッシュ
cd backend-python
docker buildx build \
  --platform linux/amd64 \
  -t 528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-backend-python:latest \
  -f docker/Dockerfile.prod \
  . \
  --push
```

#### イメージのプル

```bash
# ECRからイメージをプル
docker pull 528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-backend-go:latest
```

#### タグ管理

```bash
# イメージにタグを追加
docker tag my-app:latest \
  528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-backend-go:v1.0.0

# 複数タグでプッシュ
docker push 528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-backend-go:latest
docker push 528757808906.dkr.ecr.ap-northeast-1.amazonaws.com/neuraknot-prod-backend-go:v1.0.0
```

---

## トラブルシューティング

### Terraform 関連

#### State ロックの問題

```bash
# ロックファイルを削除
rm -f .terraform.tfstate.lock.info

# ロックを強制解除
terraform force-unlock <LOCK_ID>
```

#### プロバイダーの問題

```bash
# プロバイダーを再ダウンロード
rm -rf .terraform
terraform init

# プロバイダーキャッシュをクリア
rm -rf ~/.terraform.d/plugin-cache
```

#### State 不整合

```bash
# Stateをリモートと同期
terraform refresh

# 特定のリソースをStateから削除して再インポート
terraform state rm module.ecs.aws_ecs_service.backend_go
terraform import module.ecs.aws_ecs_service.backend_go <service-arn>
```

### ECS 関連

#### タスクが起動しない

```bash
# サービスのイベントログを確認
aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --services neuraKnot-prod-backend-go \
  --region ap-northeast-1 \
  --query 'services[0].events[0:10]'

# タスク定義の環境変数を確認
aws ecs describe-task-definition \
  --task-definition neuraKnot-prod-backend-go \
  --region ap-northeast-1 \
  --query 'taskDefinition.containerDefinitions[0].environment'

# CloudWatch Logsを確認
aws logs tail /ecs/neuraKnot-prod-backend-go \
  --since 10m \
  --region ap-northeast-1
```

#### プラットフォームミスマッチエラー

```bash
# linux/amd64プラットフォーム用に再ビルド
docker buildx build --platform linux/amd64 -t my-app:latest . --push
```

### Docker 関連

#### ビルドエラー

```bash
# ビルドキャッシュをクリア
docker builder prune

# ビルドログを詳細表示
docker build --progress=plain -t my-app:latest .
```

#### ディスク容量不足

```bash
# 未使用リソースをすべて削除
docker system prune -a --volumes

# ディスク使用状況を確認
docker system df
```

### ネットワーク関連

#### ALB ヘルスチェック失敗

```bash
# ターゲットグループのヘルス状態を確認
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn> \
  --region ap-northeast-1

# セキュリティグループのルールを確認
aws ec2 describe-security-groups \
  --group-ids <sg-id> \
  --region ap-northeast-1
```

#### サービス間通信エラー

```bash
# Service Discoveryの状態を確認
aws servicediscovery list-services \
  --region ap-northeast-1

# DNSレコードを確認
aws servicediscovery discover-instances \
  --namespace-name neuraKnot-prod.local \
  --service-name backend-python \
  --region ap-northeast-1
```

---

## 便利なエイリアス

以下を `~/.zshrc` または `~/.bashrc` に追加すると便利です:

```bash
# Terraform
alias tf='terraform'
alias tfi='terraform init'
alias tfp='terraform plan'
alias tfa='terraform apply'
alias tfd='terraform destroy'
alias tfo='terraform output'
alias tfv='terraform validate'
alias tff='terraform fmt'

# AWS CLI
alias awsp='export AWS_PROFILE='
alias awsl='aws sts get-caller-identity'

# ECS
alias ecs-services='aws ecs list-services --cluster neuraKnot-prod-cluster --region ap-northeast-1'
alias ecs-tasks='aws ecs list-tasks --cluster neuraKnot-prod-cluster --region ap-northeast-1'

# CloudWatch Logs
alias logs-go='aws logs tail /ecs/neuraKnot-prod-backend-go --follow --region ap-northeast-1'
alias logs-python='aws logs tail /ecs/neuraKnot-prod-backend-python --follow --region ap-northeast-1'

# Docker
alias dps='docker ps'
alias dimg='docker images'
alias dclean='docker system prune -a'
```

---

## 参考リンク

### 公式ドキュメント

- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS CLI Command Reference](https://awscli.amazonaws.com/v2/documentation/api/latest/index.html)
- [Docker Documentation](https://docs.docker.com/)
- [Amazon ECS Documentation](https://docs.aws.amazon.com/ecs/)

### NeuraKnot プロジェクト関連

- [Terraform 設定](../terraform/)
- [インフラ構成図](./aws/INFRASTRUCTURE.md)
- [デプロイガイド](./CONTRIBUTING.md)

---

最終更新: 2025-10-19
