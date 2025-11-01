# AWS S3を使った本番環境セットアップ手順

## 📋 前提条件

- AWS CLIがインストールされ、認証情報が設定されていること
- Terraformがインストールされていること（v1.0以上）
- 必要な環境変数が`terraform.tfvars`と`secrets.tfvars`に設定されていること

## 🚀 Terraform実行手順

### 1. prodディレクトリに移動

```bash
cd /Users/chihiro/Desktop/個人開発/NeuraKnot/terraform/environments/prod
```

### 2. Terraform初期化

プロバイダーとモジュールをダウンロードします：

```bash
terraform init
```

### 3. 実行計画の確認

何が作成/変更されるか確認します：

```bash
terraform plan -var-file="terraform.tfvars" -var-file="secrets.tfvars"
```

**重要なリソース確認項目**:
- ✅ S3バケット: `neuraknot-prod-media`
- ✅ S3バケットポリシー（avatarsフォルダは公開読み取り可能）
- ✅ VPC Endpoint（S3へのプライベート接続）
- ✅ IAMポリシー（ECSタスクロールにS3アクセス権限）

### 4. リソースの作成/更新

実行計画を確認後、リソースを作成します：

```bash
terraform apply -var-file="terraform.tfvars" -var-file="secrets.tfvars"
```

確認プロンプトで `yes` と入力してください。

### 5. 自動承認で実行（オプション）

確認なしで実行する場合（注意して使用）：

```bash
terraform apply -var-file="terraform.tfvars" -var-file="secrets.tfvars" -auto-approve
```

## 📊 作成されるS3関連リソース

### S3バケット
- **バケット名**: `neuraknot-prod-media`
- **リージョン**: `ap-northeast-1`
- **用途**: アバター画像、添付ファイルの保存

### セキュリティ設定
- ✅ **バージョニング**: 有効（誤削除対策）
- ✅ **暗号化**: AES256（サーバーサイド暗号化）
- ✅ **パブリックアクセス**: `avatars/*`のみ公開読み取り可能

### ライフサイクルポリシー
- `temp/`: 1日後に自動削除
- `attachments/`: 90日後にSTANDARD_IA、365日後にGLACIERに移行

### VPC Endpoint
- **タイプ**: Gateway型（無料）
- **用途**: ECSからS3へのプライベート接続（インターネット経由なし）

### IAMポリシー
- **対象**: ECSタスクロール
- **権限**: S3バケットへの読み書き、削除、一覧表示

## 🔍 出力値の確認

Terraform実行後、以下のコマンドで出力値を確認できます：

```bash
# すべての出力を表示
terraform output

# S3バケット名を表示
terraform output s3_bucket_name

# S3バケットARNを表示
terraform output s3_bucket_arn

# S3バケットドメイン名を表示
terraform output s3_bucket_domain_name
```

## 🔧 環境変数の設定

Terraform実行後、以下の環境変数をアプリケーションに設定してください：

```bash
# S3設定
S3_BUCKET_NAME=neuraknot-prod-media
S3_REGION=ap-northeast-1
S3_BASE_URL=https://neuraknot-prod-media.s3.ap-northeast-1.amazonaws.com

# MinIO設定は不要（本番環境ではS3を使用）
# S3_ENDPOINT=""
# S3_ACCESS_KEY_ID=""
# S3_SECRET_ACCESS_KEY=""
```

## ⚠️ 注意事項

### 1. コスト
- S3ストレージ: 使用量に応じて課金
- VPC Endpoint（Gateway型）: 無料
- データ転送: 送信時に課金

### 2. セキュリティ
- `avatars/*`フォルダのみ公開読み取り可能
- その他のファイルはプライベート
- ECSタスクのみがS3に書き込み可能

### 3. バックアップ
- バージョニングが有効なため、誤削除時に復元可能
- 重要なデータは定期的にバックアップを推奨

## 🧹 リソースの削除

**警告**: この操作は本番環境のすべてのリソースを削除します！

```bash
# S3バケットを空にする（Terraformは空のバケットしか削除できない）
aws s3 rm s3://neuraknot-prod-media --recursive

# Terraformでリソースを削除
terraform destroy -var-file="terraform.tfvars" -var-file="secrets.tfvars"
```

## 📝 トラブルシューティング

### エラー: "bucket already exists"
- バケット名は全世界で一意である必要があります
- `terraform.tfvars`の`environment`を変更してください

### エラー: "access denied"
- AWS認証情報を確認してください
- IAMユーザーに必要な権限があるか確認してください

### エラー: "module not found"
- `terraform init`を実行してモジュールをダウンロードしてください

## 🔗 関連ドキュメント

- [AWS S3ドキュメント](https://docs.aws.amazon.com/s3/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [VPC Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)

