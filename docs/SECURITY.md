# セキュリティガイド

NeuraKnot のセキュリティ設定とベストプラクティスに関するガイドです。

---

## 目次

- [認証・認可](#認証認可)
- [CORS 設定](#cors設定)
- [API 仕様の保護](#api仕様の保護)
- [機密情報管理](#機密情報管理)
- [本番環境のセキュリティ](#本番環境のセキュリティ)
- [セキュリティチェックリスト](#セキュリティチェックリスト)

---

## 認証・認可

### AWS Cognito

**開発環境 (DEV User Pool)**

- User Pool ID: 環境変数で管理
- 認証方式: メール + パスワード
- OAuth: 無効
- 用途: ローカル開発・テスト

**本番環境 (PROD User Pool)**

- User Pool ID: 環境変数で管理
- 認証方式: メール + OAuth (Google, Apple, LINE)
- OAuth: 有効
- 用途: 本番環境のみ

### トークン管理

- **アクセストークン**: 1 時間
- **リフレッシュトークン**: 30 日
- **保存場所**: クライアント側は httpOnly クッキー（推奨）
- **送信方法**: Authorization ヘッダー（Bearer Token）

---

## CORS 設定

### Backend Go (REST API)

**設定ファイル**: `backend-go/internal/handler/http/middleware/cors.go`

**許可するオリジン**:

- 開発環境: `http://localhost:3000`, `http://localhost:3001`
- 本番環境: 環境変数 `FRONTEND_URL` で指定

**本番環境設定 (terraform.tfvars)**:

```hcl
frontend_url = "https://www.neuraknot.net"
```

**セキュリティポイント**:

- 動的なオリジンチェック（allowedOrigins マップで管理）
- 資格情報の送信を許可（`Access-Control-Allow-Credentials: true`）
- ワイルドカード（`*`）は使用しない

### Backend Python (AI Server)

**設定ファイル**: `backend-python/app/main.py`

**許可するオリジン (terraform.tfvars)**:

```hcl
allowed_origins = [
  "https://neuraknot.net",
  "https://www.neuraknot.net",
  "https://neuraknot.vercel.app"  # バックアップ・開発確認用
]
```

**セキュリティポイント**:

- 明示的なオリジンリスト
- すべての HTTP メソッドとヘッダーを許可（内部通信のため）
- 資格情報の送信を許可

### CORS 設定の更新方法

1. **terraform.tfvars を更新**:

```bash
cd terraform/environments/prod
vim terraform.tfvars
# frontend_url と allowed_origins を編集
```

2. **Terraform を適用**:

```bash
terraform plan -var-file="terraform.tfvars" -var-file="secrets.tfvars"
terraform apply -var-file="terraform.tfvars" -var-file="secrets.tfvars"
```

3. **ECS タスクが自動的に再起動され、新しい設定が反映されます**

---

## API 仕様の保護

### Swagger UI

**開発環境**: 公開

- URL: `http://localhost:8080/swagger/index.html`
- アクセス: 制限なし
- 用途: 開発・デバッグ

**本番環境**: 非公開（推奨）

- URL: 本番環境では無効化を推奨
- アクセス: 無効
- 理由: API 仕様の外部公開を防ぐ

### 本番環境で Swagger UI を無効化する方法

**方法 1: 環境変数で制御**

`backend-go/cmd/api/main.go`で環境に応じた分岐:

```go
if os.Getenv("GIN_MODE") != "release" {
    // Swagger UIを有効化（開発環境のみ）
    router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
}
```

**方法 2: ミドルウェアで認証**

Swagger UI へのアクセスに認証を要求:

```go
authorized := router.Group("/swagger", middleware.AuthMiddleware())
{
    authorized.GET("/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
}
```

---

## 機密情報管理

### 環境変数

**開発環境 (.env.local)**:

- ファイルは`.gitignore`に含める
- 絶対にコミットしない
- チーム内で安全に共有（1Password、LastPass など）

**本番環境**:

- AWS Secrets Manager で管理
- Terraform 経由で環境変数として注入
- ECS タスク定義で参照

### 機密情報の種類

**必須の機密情報**:

- データベースパスワード (`DB_PASSWORD`)
- 暗号化マスターキー (`ENCRYPTION_MASTER_KEY`)
- Cognito クライアントシークレット (`COGNITO_CLIENT_SECRET`)
- AI API キー (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`)

**オプションの機密情報**:

- 外部サービス API キー（Slack、Notion、GitHub など）
- LangSmith API キー（トレーシング用）

### 機密情報のローテーション

1. **AWS Secrets Manager で新しいシークレットを作成**
2. **Terraform で参照を更新**
3. **ECS タスクを再デプロイ**
4. **古いシークレットを削除**

---

## 本番環境のセキュリティ

### ネットワークセキュリティ

**VPC 構成**:

- パブリックサブネット: ALB のみ
- プライベートサブネット: ECS、RDS
- NAT Gateway 経由でインターネットアクセス

**セキュリティグループ**:

- ALB → ECS: HTTPS のみ許可
- ECS → RDS: PostgreSQL (5432) のみ許可
- ECS → インターネット: HTTPS (443) のみ許可

### SSL/TLS 証明書

**API 用 (AWS ACM)**:

- ドメイン: `api.neuraknot.net`
- 証明書タイプ: ワイルドカード (`*.neuraknot.net`)
- 自動更新: 有効

**フロントエンド用 (Vercel)**:

- ドメイン: `neuraknot.net`, `www.neuraknot.net`
- 証明書: Let's Encrypt
- 自動更新: 有効

### データ暗号化

**通信の暗号化**:

- すべての HTTPS 通信: TLS 1.2+
- 内部通信（ECS ↔ RDS）: VPC 内の暗号化

**データ保存の暗号化**:

- RDS: 暗号化有効 (AES-256)
- EBS: 暗号化有効
- Secrets Manager: 自動暗号化
- アプリケーションレベル: AES-256-GCM (user_service_configs)

---

## セキュリティチェックリスト

### デプロイ前

- [ ] 機密情報が`.env.local`または Secrets Manager で管理されている
- [ ] `.env.local`が`.gitignore`に含まれている
- [ ] 本番環境の CORS 設定が正しい
- [ ] 本番環境の Swagger UI が無効化されている（推奨）
- [ ] SSL/TLS 証明書が有効
- [ ] データベース接続文字列にパスワードがハードコードされていない

### デプロイ後

- [ ] HTTPS 通信が正常に機能している
- [ ] CORS 設定が期待通りに動作している
- [ ] 認証フローが正常に動作している
- [ ] 不正なオリジンからのアクセスがブロックされている
- [ ] CloudWatch Logs でエラーログを確認

### 定期的な確認

- [ ] 機密情報のローテーション（90 日ごと推奨）
- [ ] SSL/TLS 証明書の有効期限確認（ACM は自動更新）
- [ ] セキュリティグループのルール見直し
- [ ] 不要な IAM ロール・ポリシーの削除
- [ ] CloudWatch Logs の監視とアラート設定

---

## トラブルシューティング

### CORS エラー

**症状**: `Access to fetch at 'https://api.neuraknot.net' from origin 'https://neuraknot.net' has been blocked by CORS policy`

**原因**:

1. CORS 設定にオリジンが含まれていない
2. 環境変数が正しく設定されていない
3. ECS タスクが古い設定を使用している

**解決方法**:

1. `terraform.tfvars`を確認
2. `terraform apply`で設定を反映
3. ECS タスクを手動で再起動（必要に応じて）

### 認証エラー

**症状**: `401 Unauthorized`

**原因**:

1. トークンが期限切れ
2. トークンが無効
3. Cognito 設定が正しくない

**解決方法**:

1. ログアウトして再ログイン
2. リフレッシュトークンで新しいアクセストークンを取得
3. Cognito 設定を確認

---

## 参考リンク

- [AWS Cognito セキュリティベストプラクティス](https://docs.aws.amazon.com/cognito/latest/developerguide/security-best-practices.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [AWS セキュリティベストプラクティス](https://aws.amazon.com/jp/architecture/security-identity-compliance/)
