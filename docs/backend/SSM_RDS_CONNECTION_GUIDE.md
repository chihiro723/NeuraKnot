# SSM 経由プライベート RDS 接続ガイド

## 概要

このガイドでは、AWS SSM Session Manager を使用して、プライベートサブネットにある RDS インスタンスに安全に接続する方法を説明します。

## アーキテクチャ

```
ローカルPC (localhost:15432)
    ↓
AWS SSM Session Manager (Port Forwarding)
    ↓
EC2 Bastion Host (Private Subnet)
    ↓
RDS (Private Subnet)
```

### Bastion Host の詳細

- **インスタンスタイプ**: `t4g.nano` (ARM64)
- **AMI**: Amazon Linux 2
- **vCPU**: 2 コア
- **メモリ**: 512 MB
- **ネットワーク**: プライベートサブネット、パブリック IP なし
- **SSM Agent**: プリインストール済み
- **コスト**: 約 $3/月（常時稼働）

### 主要なメリット

1. **セキュア**: SSH キー不要、パブリック IP アドレス不要
2. **低コスト**: 月額 $3 で常時接続可能
3. **監査可能**: CloudTrail で接続ログを記録
4. **簡単**: IAM ベースの認証
5. **保守不要**: Amazon Linux 2 の自動更新
6. **高速**: 起動待ち時間なし（常時稼働）

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
        "ec2:DescribeInstances",
        "ssm:StartSession",
        "ssm:TerminateSession"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["rds:DescribeDBInstances"],
      "Resource": "*"
    }
  ]
}
```

## 接続方法

### 方法 1: 便利スクリプトを使用（推奨）

#### Step 1: スクリプトに実行権限を付与

```bash
chmod +x scripts/connect-rds-bastion.sh
```

#### Step 2: 接続開始

```bash
./scripts/connect-rds-bastion.sh start
```

スクリプトは自動的に以下を実行します:

1. Bastion Host インスタンス ID の取得
2. RDS エンドポイントの取得
3. ポートフォワーディングの開始

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

または:

```bash
./scripts/connect-rds-bastion.sh stop
```

#### その他のコマンド

```bash
# Bastion と RDS のステータス確認
./scripts/connect-rds-bastion.sh status

# ヘルプ表示
./scripts/connect-rds-bastion.sh help
```

### 方法 2: 手動実行

手動で各ステップを実行する場合:

#### Step 1: Bastion Host インスタンス ID の取得

```bash
INSTANCE_ID=$(aws ec2 describe-instances \
    --filters \
        "Name=tag:Name,Values=neuraKnot-prod-bastion" \
        "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text \
    --region ap-northeast-1)

echo "Bastion Instance ID: ${INSTANCE_ID}"
```

#### Step 2: RDS エンドポイントの取得

```bash
RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier neuraKnot-prod-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region ap-northeast-1)

echo "RDS Endpoint: ${RDS_ENDPOINT}"
```

#### Step 3: ポートフォワーディングの開始

```bash
aws ssm start-session \
    --target ${INSTANCE_ID} \
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

### 2. Bastion Host が見つからない

**確認項目:**

```bash
# Bastion インスタンスの確認
aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=neuraKnot-prod-bastion" \
    --region ap-northeast-1
```

**解決策:**
Terraform で Bastion Host をデプロイ:

```bash
cd terraform/environments/prod
terraform apply
```

### 3. SSM Agent がオフライン

**エラー:**

```
An error occurred (TargetNotConnected) when calling the StartSession operation: ...
```

**原因と解決策:**

1. **SSM Agent が起動していない**

   ```bash
   # Systems Manager で確認
   aws ssm describe-instance-information \
       --filters "Key=InstanceIds,Values=${INSTANCE_ID}" \
       --region ap-northeast-1
   ```

2. **VPC Endpoints が設定されていない**

   - プライベートサブネットには以下の VPC Endpoints が必要:
     - `com.amazonaws.ap-northeast-1.ssm`
     - `com.amazonaws.ap-northeast-1.ssmmessages`
     - `com.amazonaws.ap-northeast-1.ec2messages`

3. **セキュリティグループの設定**
   - Bastion Host のセキュリティグループが全てのアウトバウンドトラフィックを許可しているか確認

### 4. RDS に接続できない

**確認項目:**

1. **セキュリティグループルール**

   ```bash
   # RDS セキュリティグループの確認
   aws rds describe-db-instances \
       --db-instance-identifier neuraKnot-prod-db \
       --query 'DBInstances[0].VpcSecurityGroups' \
       --region ap-northeast-1
   ```

   - RDS のセキュリティグループが Bastion Host からの接続を許可しているか確認

2. **RDS のステータス**

   ```bash
   aws rds describe-db-instances \
       --db-instance-identifier neuraKnot-prod-db \
       --query 'DBInstances[0].[DBInstanceStatus,Endpoint]' \
       --region ap-northeast-1
   ```

3. **ネットワーク接続**
   - Bastion Host と RDS が同じ VPC にあるか確認

### 5. ポート 15432 が既に使用されている

**エラー:**

```
Port 15432 is already in use
```

**解決策:**
別のポート番号を使用:

```bash
aws ssm start-session \
    --target ${INSTANCE_ID} \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "{\"host\":[\"${RDS_ENDPOINT}\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"25432\"]}" \
    --region ap-northeast-1
```

pgAdmin の接続設定でもポート番号を `25432` に変更してください。

## セキュリティのベストプラクティス

### 1. IAM 権限の最小化

必要最小限の権限のみを付与してください。

### 2. CloudTrail での監査

SSM 接続は自動的に CloudTrail に記録されます:

```bash
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=EventName,AttributeValue=StartSession \
    --region ap-northeast-1
```

### 3. パスワード管理

- RDS パスワードは Secrets Manager で管理
- ローカル PC にパスワードを保存しない
- 定期的にパスワードをローテーション

### 4. VPC フローログ

VPC フローログを有効にして、ネットワークトラフィックを監視してください。

### 5. Session Manager セッションログ

Session Manager のセッションログを CloudWatch Logs に保存:

```bash
# Terraform で設定済み
# セッションログの確認
aws logs tail /aws/ssm/session-logs --follow --region ap-northeast-1
```

## コスト

### Bastion Host のコスト

EC2 t4g.nano 料金（ap-northeast-1 リージョン）:

- **オンデマンド**: $0.0042/時間
- **月額**: $0.0042 × 24 × 30 = **約 $3/月**

### 使用例

- 常時稼働: 月額約 $3（約 450 円）
- 追加のデータ転送料金は発生しない（同一 VPC 内）

### コスト最適化

必要に応じて Bastion Host を停止することで、さらにコストを削減できます:

```bash
# インスタンスを停止
aws ec2 stop-instances --instance-ids ${INSTANCE_ID} --region ap-northeast-1

# インスタンスを起動
aws ec2 start-instances --instance-ids ${INSTANCE_ID} --region ap-northeast-1
```

停止中は EBS ストレージ料金のみ（月額約 $0.8）

## 関連ドキュメント

- [AWS SSM Session Manager 公式ドキュメント](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html)
- [EC2 Instance Connect 公式ドキュメント](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Connect-using-EC2-Instance-Connect.html)
- [pgAdmin 公式ドキュメント](https://www.pgadmin.org/docs/)

## サポート

問題が発生した場合は、以下の情報を含めて報告してください:

1. エラーメッセージの全文
2. 実行したコマンド
3. AWS CLI のバージョン: `aws --version`
4. Session Manager Plugin のバージョン: `session-manager-plugin --version`
5. Bastion Host のシステムログ (必要に応じて)
