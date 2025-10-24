# SSM 経由プライベート RDS 接続ガイド

## 概要

このガイドでは、AWS SSM Session Manager を使用して、プライベートサブネットにある RDS インスタンスに安全に接続する方法を説明します。

## アーキテクチャ

```
ローカルPC (localhost:15432)
    ↓
AWS SSM Session Manager
    ↓
ECS Fargate Task (SSM Proxy)
    ↓
RDS (Private Subnet)
```

### SSM Proxy タスクの詳細

- **イメージ**: `public.ecr.aws/amazonlinux/amazonlinux:latest` (Amazon Linux 2023)
- **リソース**: 256 CPU / 512 MB メモリ
- **ネットワーク**: プライベートサブネット、パブリック IP なし
- **実行時間**: 接続中のみ起動、使用後は停止
- **SSM Agent**: Fargate 基盤側で自動管理（コンテナ内不要）

### 主要なメリット

1. **セキュア**: SSH キー不要、パブリック IP アドレス不要
2. **コスト効率**: 使う時だけタスク起動（約 2 円/時間）
3. **監査可能**: CloudTrail で接続ログを記録
4. **簡単**: IAM ベースの認証
5. **保守不要**: Amazon Linux 2 の公式イメージを直接使用

## 前提条件

### 1. ローカル PC 環境

#### Session Manager Plugin のインストール

**macOS:**

```bash
brew install --cask session-manager-plugin
```

**Linux:**

```bash
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
sudo dpkg -i session-manager-plugin.deb
```

**Windows:**
[公式ドキュメント](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)を参照

#### インストール確認

```bash
session-manager-plugin
```

成功すると以下のようなメッセージが表示されます:

```
The Session Manager plugin is installed successfully. Use the AWS CLI to start a session.
```

### 2. AWS CLI 認証

```bash
# 認証情報の確認
aws sts get-caller-identity

# 出力例:
# {
#     "UserId": "AIDACKCEVSQ6C2EXAMPLE",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/your-name"
# }
```

### 3. 必要な IAM 権限

以下の権限がユーザーまたはロールに必要です:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:RunTask",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecs:StopTask",
        "ecs:ExecuteCommand"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:StartSession"],
      "Resource": ["arn:aws:ecs:ap-northeast-1:*:task/neuraKnot-prod-cluster/*"]
    },
    {
      "Effect": "Allow",
      "Action": ["iam:PassRole"],
      "Resource": [
        "arn:aws:iam::*:role/neuraKnot-prod-ecs-task-execution-role",
        "arn:aws:iam::*:role/neuraKnot-prod-ecs-task-role"
      ]
    }
  ]
}
```

## 接続方法

### 方法 1: 便利スクリプトを使用（推奨）

#### Step 1: スクリプトに実行権限を付与

```bash
chmod +x scripts/connect-rds.sh
```

#### Step 2: 接続開始

```bash
./scripts/connect-rds.sh start
```

スクリプトは自動的に以下を実行します:

1. VPC 情報の取得（サブネット、セキュリティグループ）
2. RDS エンドポイントの取得
3. SSM Proxy タスクの起動
4. ポートフォワーディングの開始

#### Step 3: pgAdmin で接続

別のターミナルまたは pgAdmin を開き、以下の設定で接続:

| 項目     | 値                               |
| -------- | -------------------------------- |
| Host     | `localhost`                      |
| Port     | `15432`                          |
| Database | `neuraKnot`                      |
| Username | `postgres`                       |
| Password | （AWS Secrets Manager から取得） |

#### Step 4: 接続終了

接続を終了する場合:

1. ポートフォワーディングターミナルで `Ctrl+C` を押す
2. タスクを停止:

```bash
./scripts/connect-rds.sh stop
```

#### その他のコマンド

```bash
# タスクのステータス確認
./scripts/connect-rds.sh status

# ヘルプ表示
./scripts/connect-rds.sh help
```

### 方法 2: 手動実行

手動で各ステップを実行する場合:

#### Step 1: VPC 情報の取得

```bash
# プライベートサブネットIDを取得
SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=tag:Name,Values=neuraKnot-prod-private-*" \
    --query 'Subnets[*].SubnetId' \
    --output json \
    --region ap-northeast-1)

# ECSセキュリティグループIDを取得
SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=tag:Name,Values=neuraKnot-prod-ecs-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region ap-northeast-1)

echo "Subnet IDs: $SUBNET_IDS"
echo "Security Group: $SG_ID"
```

#### Step 2: SSM Proxy タスクの起動

```bash
CLUSTER_NAME="neuraKnot-prod-cluster"
TASK_DEFINITION="neuraKnot-prod-ssm-proxy"

TASK_ARN=$(aws ecs run-task \
    --cluster ${CLUSTER_NAME} \
    --task-definition ${TASK_DEFINITION} \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=${SUBNET_IDS},securityGroups=[${SG_ID}],assignPublicIp=DISABLED}" \
    --enable-execute-command \
    --region ap-northeast-1 \
    --query 'tasks[0].taskArn' \
    --output text)

TASK_ID=$(echo $TASK_ARN | cut -d'/' -f3)
echo "Task ID: ${TASK_ID}"

# タスクが起動するまで待機
aws ecs wait tasks-running \
    --cluster ${CLUSTER_NAME} \
    --tasks ${TASK_ARN} \
    --region ap-northeast-1
```

#### Step 3: RDS エンドポイントの取得

```bash
RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier neuraKnot-prod-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region ap-northeast-1)

echo "RDS Endpoint: ${RDS_ENDPOINT}"
```

#### Step 4: ポートフォワーディングの開始

```bash
aws ssm start-session \
    --target "ecs:${CLUSTER_NAME}_${TASK_ID}" \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "{\"host\":[\"${RDS_ENDPOINT}\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"15432\"]}" \
    --region ap-northeast-1
```

成功すると以下のメッセージが表示されます:

```
Starting session with SessionId: ...
Port 15432 opened for session [...]
Waiting for connections...
```

#### Step 5: タスクの停止

```bash
aws ecs stop-task \
    --cluster ${CLUSTER_NAME} \
    --task ${TASK_ARN} \
    --region ap-northeast-1
```

## データベースパスワードの取得

### Terraform Output から取得（初回のみ）

```bash
cd terraform/environments/prod
terraform output -raw db_password
```

### AWS Secrets Manager に保存（推奨）

RDS パスワードは Secrets Manager で管理することを強く推奨します。

## pgAdmin での接続設定

### 1. 新しいサーバーの追加

pgAdmin を開き、以下の手順で新しいサーバーを追加:

1. 左側のツリーで「Servers」を右クリック
2. 「Register」→「Server...」を選択

### 2. General タブ

| 項目 | 値                   |
| ---- | -------------------- |
| Name | NeuraKnot Production |

### 3. Connection タブ

| 項目                 | 値                     |
| -------------------- | ---------------------- |
| Host name/address    | `localhost`            |
| Port                 | `15432`                |
| Maintenance database | `neuraKnot`            |
| Username             | `postgres`             |
| Password             | （取得したパスワード） |
| Save password?       | ☑️ (任意)              |

### 4. Advanced タブ

| 項目           | 値          |
| -------------- | ----------- |
| DB restriction | `neuraKnot` |

### 5. 保存

「Save」をクリックして設定を保存します。

## psql での接続

コマンドラインでの接続:

```bash
# パスワード入力プロンプトあり
psql -h localhost -p 15432 -U postgres -d neuraKnot

# パスワードを環境変数で指定
export PGPASSWORD='your-password'
psql -h localhost -p 15432 -U postgres -d neuraKnot
```

## トラブルシューティング

### 1. Session Manager Plugin が見つからない

**エラー:**

```
SessionManagerPlugin is not found. Please refer to SessionManager Documentation here: ...
```

**解決策:**
Session Manager Plugin を再インストール:

```bash
brew reinstall --cask session-manager-plugin
```

### 2. タスクが起動しない

**確認項目:**

1. ECS クラスターが存在するか確認
2. タスク定義が存在するか確認
3. CloudWatch Logs を確認

```bash
# ECSクラスターの確認
aws ecs describe-clusters \
    --clusters neuraKnot-prod-cluster \
    --region ap-northeast-1

# タスク定義の確認
aws ecs describe-task-definition \
    --task-definition neuraKnot-prod-ssm-proxy \
    --region ap-northeast-1

# CloudWatch Logsの確認
aws logs tail /ecs/neuraKnot-prod-backend-go \
    --follow \
    --region ap-northeast-1
```

### 3. SSM セッションが開始できない

**エラー:**

```
An error occurred (TargetNotConnected) when calling the StartSession operation: ...
```

**原因と解決策:**

1. **タスクが RUNNING 状態になっていない**

   ```bash
   # タスクの状態を確認
   aws ecs describe-tasks \
       --cluster neuraKnot-prod-cluster \
       --tasks ${TASK_ARN} \
       --region ap-northeast-1
   ```

2. **Execute Command が有効になっていない**

   - タスク起動時に `--enable-execute-command` フラグを指定

3. **IAM ロールに SSM 権限がない**
   - Terraform で追加した IAM 権限が適用されているか確認

### 4. RDS に接続できない

**確認項目:**

1. **セキュリティグループルール**

   ```bash
   aws ec2 describe-security-groups \
       --group-ids ${SG_ID} \
       --region ap-northeast-1
   ```

2. **RDS のステータス**

   ```bash
   aws rds describe-db-instances \
       --db-instance-identifier neuraKnot-prod-db \
       --query 'DBInstances[0].[DBInstanceStatus,Endpoint]' \
       --region ap-northeast-1
   ```

3. **ネットワーク接続**
   - ECS タスクと RDS が同じ VPC にあるか確認
   - NAT Gateway が正常に動作しているか確認

### 5. ポート 15432 が既に使用されている

**エラー:**

```
Port 15432 is already in use
```

**解決策:**
別のポート番号を使用:

```bash
aws ssm start-session \
    --target "ecs:${CLUSTER_NAME}_${TASK_ID}" \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "{\"host\":[\"${RDS_ENDPOINT}\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"25432\"]}" \
    --region ap-northeast-1
```

pgAdmin の接続設定でもポート番号を `25432` に変更してください。

## セキュリティのベストプラクティス

### 1. タスクの即時停止

使用後はすぐに SSM Proxy タスクを停止してください:

```bash
./scripts/connect-rds.sh stop
```

### 2. IAM 権限の最小化

必要最小限の権限のみを付与してください。

### 3. CloudTrail での監査

SSM 接続は自動的に CloudTrail に記録されます:

```bash
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=EventName,AttributeValue=StartSession \
    --region ap-northeast-1
```

### 4. パスワード管理

- RDS パスワードは Secrets Manager で管理
- ローカル PC にパスワードを保存しない
- 定期的にパスワードをローテーション

### 5. VPC フローログ

VPC フローログを有効にして、ネットワークトラフィックを監視してください。

## コスト

### SSM Proxy タスクのコスト

Fargate 料金（ap-northeast-1 リージョン）:

- vCPU: 0.25 vCPU × $0.04656/時間 = $0.01164/時間
- メモリ: 0.5 GB × $0.00511/GB/時間 = $0.002555/時間
- **合計: 約 $0.014/時間（約 2 円/時間）**

### 使用例

- 1 日 1 時間接続: 月額約 60 円
- 1 日 8 時間接続: 月額約 480 円

## 関連ドキュメント

- [AWS SSM Session Manager 公式ドキュメント](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html)
- [ECS Exec 公式ドキュメント](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html)
- [pgAdmin 公式ドキュメント](https://www.pgadmin.org/docs/)

## サポート

問題が発生した場合は、以下の情報を含めて報告してください:

1. エラーメッセージの全文
2. 実行したコマンド
3. AWS CLI のバージョン: `aws --version`
4. Session Manager Plugin のバージョン: `session-manager-plugin --version`
5. CloudWatch Logs の該当部分
