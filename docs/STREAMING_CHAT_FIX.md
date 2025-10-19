# ストリーミングチャット修正ガイド

## 🔍 問題の原因

ストリーミングチャットが失敗する原因は**CORS 設定の不備**です。

### 現在の状況

- **Frontend**: Vercel (ブラウザから実行)
- **Backend Go**: ECS (ALB 経由でアクセス可能)
- **問題**: Backend Go が Vercel からのリクエストを拒否

### 技術的な詳細

1. **フロントエンドの実装**

   ```typescript
   // frontend/lib/actions/conversation.ts:166
   const response = await fetch(
     `${BACKEND_GO_URL}/api/v1/conversations/${conversationId}/messages`
     // ブラウザから直接実行される
   );
   ```

2. **Backend Go の CORS 設定**

   ```go
   // backend-go/internal/handler/http/middleware/cors.go:19
   allowedOrigins := map[string]bool{
       "http://localhost:3000":   true,
       "http://localhost:3001":   true,
       os.Getenv("FRONTEND_URL"): true,  // ← これが未設定だった
   }
   ```

3. **ECS タスク定義**
   - `FRONTEND_URL` 環境変数が設定されていなかった
   - そのため、Vercel からのリクエストが拒否されていた

---

## ✅ 解決策

### ステップ 1: Vercel の URL を確認

Vercel ダッシュボードで確認:

```
https://your-app.vercel.app
```

### ステップ 2: Terraform ファイルを更新

`terraform/environments/prod/terraform.tfvars`:

```hcl
# Frontend URL for CORS
frontend_url = "https://your-app.vercel.app"  # 実際のURLに変更

# Allowed Origins
allowed_origins = [
  "https://neuraknot.com",
  "https://www.neuraknot.com",
  "https://your-app.vercel.app"  # 実際のURLに変更
]
```

### ステップ 3: Terraform を適用

```bash
cd terraform/environments/prod
terraform plan -var-file=terraform.tfvars -var-file=secrets.tfvars
terraform apply -var-file=terraform.tfvars -var-file=secrets.tfvars
```

### ステップ 4: Vercel の環境変数を設定

Vercel ダッシュボード → Settings → Environment Variables:

```bash
BACKEND_GO_URL=http://neuraKnot-prod-alb-1183211640.ap-northeast-1.elb.amazonaws.com
```

**注意**: HTTPS リダイレクトを有効にしている場合は `https://` を使用

### ステップ 5: Vercel を再デプロイ

環境変数変更後は再デプロイが必要:

```bash
git commit --allow-empty -m "Update environment variables"
git push origin main
```

または、Vercel ダッシュボードから手動で再デプロイ。

---

## 🧪 動作確認

### 1. Backend Go のログを確認

```bash
aws logs tail /ecs/neuraKnot-prod-backend-go --follow --profile sso
```

正常な場合:

```
[GIN] 2025/10/19 - 10:00:00 | 200 | POST /api/v1/conversations/xxx/messages
```

CORS エラーの場合:

```
Origin not allowed: https://your-app.vercel.app
```

### 2. ブラウザの DevTools で確認

1. **F12** → **Network** タブ
2. チャットメッセージを送信
3. リクエストを確認:
   - **Request URL**: ALB の URL
   - **Status**: 200 OK
   - **Response Headers**: `Access-Control-Allow-Origin` が設定されているか

### 3. CORS エラーの確認

ブラウザのコンソールでエラーを確認:

```
Access to fetch at 'http://...' from origin 'https://your-app.vercel.app'
has been blocked by CORS policy
```

このエラーが出る場合は、Backend Go の CORS 設定が正しくありません。

---

## 📊 設定の流れ

```
┌─────────────────────────────────────────────────────────┐
│ 1. Vercelの環境変数設定                                   │
│    BACKEND_GO_URL = ALBのURL                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. TerraformでCORS設定                                   │
│    frontend_url = VercelのURL                           │
│    allowed_origins = [VercelのURL]                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Terraform Apply                                       │
│    ECSタスク定義が更新される                              │
│    Backend Goが再起動される                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Vercel再デプロイ                                      │
│    環境変数が反映される                                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. 動作確認                                              │
│    ブラウザ → ALB → Backend Go                          │
│    CORSチェック: OK                                      │
│    ストリーミングチャット: 動作                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 トラブルシューティング

### 問題 1: CORS エラーが解消しない

**原因**: Backend Go が再起動されていない

**解決策**:

```bash
# ECSサービスを強制更新
aws ecs update-service \
  --cluster neuraKnot-prod-cluster \
  --service neuraKnot-prod-backend-go \
  --force-new-deployment \
  --profile sso
```

### 問題 2: 環境変数が反映されない

**原因**: Vercel の再デプロイが必要

**解決策**:

- Vercel ダッシュボード → Deployments → Redeploy

### 問題 3: HTTPS リダイレクトで 503 エラー

**原因**: SSL 証明書が設定されていない

**解決策**:

- 一時的に HTTP を使用: `BACKEND_GO_URL=http://...`
- または、SSL 証明書を取得して HTTPS を有効化

### 問題 4: Cookie が送信されない

**原因**: クロスオリジンでの Cookie 送信設定

**確認**:

```typescript
// frontend/lib/actions/conversation.ts
fetch(url, {
  credentials: "include", // ← これが必要
  headers: {
    Cookie: `access_token=${accessToken}`,
  },
});
```

**Backend Go 側**:

```go
// backend-go/internal/handler/http/middleware/cors.go
c.Header("Access-Control-Allow-Credentials", "true")  // ← これが必要
```

---

## 📝 変更内容のまとめ

### Terraform ファイル

1. **terraform/modules/ecs/variables.tf**

   - `frontend_url` 変数を追加

2. **terraform/modules/ecs/main.tf**

   - Backend Go タスク定義に `FRONTEND_URL` 環境変数を追加

3. **terraform/environments/prod/variables.tf**

   - `frontend_url` 変数を追加

4. **terraform/environments/prod/main.tf**

   - ECS モジュールに `frontend_url` を渡す

5. **terraform/environments/prod/terraform.tfvars**
   - `frontend_url` の値を設定
   - `allowed_origins` に Vercel URL を追加

### Backend Go

変更なし（既存の CORS 設定を使用）

### Frontend

変更なし（Vercel の環境変数のみ設定）

---

## 🎯 次のステップ

1. **Vercel の URL を確認**
2. **terraform.tfvars を更新**
3. **Terraform Apply**
4. **Vercel の環境変数を設定**
5. **Vercel 再デプロイ**
6. **動作確認**

これで、ストリーミングチャットが正常に動作するはずです！
