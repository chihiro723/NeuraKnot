# Vercel デプロイメントガイド

## 📋 設定手順の概要

1. **Vercel の環境変数を設定** (フロントエンド → バックエンド接続)
2. **Terraform で CORS 設定** (バックエンド → フロントエンド許可)
3. **デプロイして確認**

---

## 1. Vercel の環境変数を設定

### 必須環境変数

Vercel のプロジェクト設定で以下の環境変数を設定してください:

#### Backend API URL

```bash
BACKEND_GO_URL=http://neuraKnot-prod-alb-1183211640.ap-northeast-1.elb.amazonaws.com
```

**注意**: HTTPS リダイレクトを有効にしている場合は `https://` を使用してください。

#### AWS Cognito 設定

```bash
NEXT_PUBLIC_AWS_REGION=ap-northeast-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<your-user-pool-id>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<your-client-id>
NEXT_PUBLIC_COGNITO_DOMAIN=<your-cognito-domain>
```

### 設定方法

1. **Vercel ダッシュボードにアクセス**

   - https://vercel.com/dashboard
   - プロジェクトを選択

2. **Settings → Environment Variables**

   - 各環境変数を追加
   - Environment: `Production`, `Preview`, `Development` を選択

3. **再デプロイ**
   ```bash
   # 環境変数変更後は再デプロイが必要
   git commit --allow-empty -m "Trigger redeploy"
   git push origin main
   ```

## 2. Terraform で CORS 設定

Backend Go が Vercel からのリクエストを許可するように設定します。

### 2-1. Vercel のデプロイメント URL を確認

Vercel ダッシュボードで以下を確認:

- **Production URL**: `https://your-app.vercel.app`
- **Custom Domain** (設定している場合): `https://your-domain.com`

### 2-2. Terraform ファイルを更新

`terraform/environments/prod/terraform.tfvars` を編集:

```hcl
# Frontend URL for CORS (Backend Goの環境変数)
frontend_url = "https://your-app.vercel.app"  # 実際のVercel URLに変更

# Allowed Origins (Backend Pythonの環境変数)
allowed_origins = [
  "https://neuraknot.com",
  "https://www.neuraknot.com",
  "https://your-app.vercel.app"  # 実際のVercel URLに変更
]
```

**重要**:

- `frontend_url`: Backend Go の CORS 設定で使用
- `allowed_origins`: Backend Python の CORS 設定で使用
- 両方とも同じ Vercel URL を設定してください

### 2-3. Terraform を適用

```bash
cd terraform/environments/prod
terraform plan -var-file=terraform.tfvars -var-file=secrets.tfvars
terraform apply -var-file=terraform.tfvars -var-file=secrets.tfvars
```

## トラブルシューティング

### ストリーミングチャットが失敗する

**原因 1: 環境変数が反映されていない**

- Vercel で環境変数を設定後、再デプロイしましたか？
- ブラウザの DevTools で実際のリクエスト URL を確認してください

**原因 2: CORS エラー**

- Backend Go のログで CORS エラーを確認
- `ALLOWED_ORIGINS` に Vercel のドメインが含まれているか確認

**原因 3: ALB のヘルスチェック失敗**

- Backend Go のコンテナが正常に起動しているか確認
- CloudWatch Logs でエラーを確認

### デバッグコマンド

#### Backend Go のログを確認

```bash
aws logs tail /ecs/neuraKnot-prod-backend-go --follow --profile sso
```

#### ALB のヘルスチェック状態を確認

```bash
aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw backend_go_target_group_arn) \
  --profile sso
```

#### ブラウザの DevTools で確認

1. F12 → Network タブ
2. チャットメッセージを送信
3. リクエスト URL とレスポンスを確認

## セキュリティ考慮事項

### HTTPS の使用（推奨）

本番環境では HTTPS を使用してください:

1. **Route 53 でドメインを設定**
2. **ACM で SSL 証明書を取得**
3. **ALB に HTTPS リスナーを追加**
4. **Vercel の環境変数を更新**
   ```bash
   BACKEND_GO_URL=https://api.your-domain.com
   ```

### 環境変数の管理

- **機密情報**: Vercel の環境変数に保存（暗号化される）
- **公開情報**: `NEXT_PUBLIC_` プレフィックスを使用
- **ローカル開発**: `.env.local` ファイルを使用（`.gitignore`に追加）

## 参考リンク

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [AWS ALB Documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
