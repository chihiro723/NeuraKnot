# AWS Cognito 認証システム セットアップガイド

## 概要

BridgeSpeak アプリケーションの認証システムを AWS Cognito で構築しました。このドキュメントでは、セットアップとデプロイの手順を説明します。

## アーキテクチャ

### 認証フロー

1. **フロントエンド** (Next.js) → **バックエンド** (Go) → **AWS Cognito**
2. **OAuth 認証**: Google、LINE、X（Twitter）
3. **データベース**: PostgreSQL（Cognito ユーザー ID と連携）

### 主要コンポーネント

- **AWS Cognito User Pool**: ユーザー認証・管理
- **AWS Cognito Identity Providers**: OAuth 認証
- **Go Backend API**: JWT 検証・ユーザー管理
- **Next.js Frontend**: 認証 UI・状態管理
- **PostgreSQL**: ユーザー情報の永続化

## セットアップ手順

### 1. 前提条件

- AWS CLI がインストール・設定済み
- Terraform がインストール済み
- Docker がインストール済み
- Go 1.21+ がインストール済み
- Node.js 18+ がインストール済み

### 2. 環境変数の設定

#### Terraform 用

```bash
export AWS_REGION="ap-northeast-1"
export ENVIRONMENT="dev"
```

#### OAuth 認証用（オプション）

```bash
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export LINE_CHANNEL_ID="your-line-channel-id"
export LINE_CHANNEL_SECRET="your-line-channel-secret"
export TWITTER_CLIENT_ID="your-twitter-client-id"
export TWITTER_CLIENT_SECRET="your-twitter-client-secret"
```

### 3. OAuth 認証の設定

#### Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. OAuth 2.0 クライアント ID を作成
4. 承認済みリダイレクト URI に以下を追加：
   - `https://your-cognito-domain.auth.ap-northeast-1.amazoncognito.com/oauth2/idpresponse`

#### LINE OAuth

1. [LINE Developers Console](https://developers.line.biz/) にアクセス
2. 新しいチャンネルを作成
3. チャンネル ID とチャンネルシークレットを取得
4. コールバック URL に以下を追加：
   - `https://your-cognito-domain.auth.ap-northeast-1.amazoncognito.com/oauth2/idpresponse`

#### X（Twitter）OAuth

1. [Twitter Developer Portal](https://developer.twitter.com/) にアクセス
2. 新しいアプリを作成
3. OAuth 2.0 クライアント ID とシークレットを取得
4. コールバック URL に以下を追加：
   - `https://your-cognito-domain.auth.ap-northeast-1.amazoncognito.com/oauth2/idpresponse`

### 4. デプロイ

#### 自動デプロイ（推奨）

```bash
./scripts/deploy.sh
```

#### 手動デプロイ

1. **Terraform でインフラを構築**

```bash
cd terraform
terraform init
terraform plan -var="aws_region=ap-northeast-1" -var="environment=dev"
terraform apply
```

2. **環境変数を取得**

```bash
export COGNITO_USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
export COGNITO_CLIENT_ID=$(terraform output -raw cognito_user_pool_client_id)
export COGNITO_CLIENT_SECRET=$(terraform output -raw cognito_user_pool_client_secret)
export COGNITO_DOMAIN=$(terraform output -raw cognito_domain)
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
export RDS_USERNAME=$(terraform output -raw rds_username)
export DB_PASSWORD=$(terraform output -raw db_password)
```

3. **Go バックエンドをビルド・デプロイ**

```bash
cd backend-go
go mod tidy
go test ./...
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/main cmd/main.go
```

4. **Docker イメージをビルド・プッシュ**

```bash
# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.ap-northeast-1.amazonaws.com

# イメージをビルド・プッシュ
docker build -t go-backend .
docker tag go-backend:latest $(aws sts get-caller-identity --query Account --output text).dkr.ecr.ap-northeast-1.amazonaws.com/bridgespeak-dev-go-backend:latest
docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.ap-northeast-1.amazonaws.com/bridgespeak-dev-go-backend:latest
```

5. **Next.js フロントエンドをビルド**

```bash
cd frontend
cat > .env.local << EOF
NEXT_PUBLIC_AWS_REGION=ap-northeast-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID
NEXT_PUBLIC_COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID
NEXT_PUBLIC_COGNITO_DOMAIN=$COGNITO_DOMAIN
NEXT_PUBLIC_COGNITO_REDIRECT_URI=https://your-alb-dns-name/auth/callback
NEXT_PUBLIC_API_BASE_URL=https://your-alb-dns-name/api
EOF

npm install
npm run build
```

## API エンドポイント

### 認証関連

- `POST /api/auth/signin` - ログイン
- `POST /api/auth/signup` - サインアップ
- `POST /api/auth/signout` - ログアウト
- `POST /api/auth/refresh` - トークンリフレッシュ
- `GET /api/auth/validate` - トークン検証
- `GET /api/auth/user` - ユーザー情報取得
- `PUT /api/auth/user` - ユーザー情報更新
- `DELETE /api/auth/user` - ユーザー削除

### パスワード管理

- `POST /api/auth/change-password` - パスワード変更
- `POST /api/auth/forgot-password` - パスワードリセット
- `POST /api/auth/confirm-forgot-password` - パスワードリセット確認

### OAuth 認証

- `GET /api/auth/oauth/{provider}` - OAuth 認証開始
- `POST /api/auth/oauth/{provider}/callback` - OAuth 認証コールバック

## フロントエンド使用方法

### 認証フック

```typescript
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";

function MyComponent() {
  const { user, loading, error, signIn, signUp, signOut, isAuthenticated } =
    useCognitoAuth();

  // 認証状態の使用
  if (loading) return <div>読み込み中...</div>;
  if (!isAuthenticated) return <div>ログインが必要です</div>;

  return <div>こんにちは、{user?.name}さん！</div>;
}
```

### 認証アクション

```typescript
import { signInAction, signUpAction } from "@/lib/auth/cognito-actions";

// サーバーアクションとして使用
await signInAction(formData);
await signUpAction(formData);
```

## データベーススキーマ

### users テーブル

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    cognito_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'offline',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## セキュリティ考慮事項

1. **JWT 検証**: すべての API リクエストで JWT トークンを検証
2. **HTTPS**: 本番環境では必ず HTTPS を使用
3. **CORS 設定**: 適切なオリジンを設定
4. **レート制限**: API 呼び出し頻度を制限
5. **ログ監視**: 認証失敗や異常なアクセスを監視

## トラブルシューティング

### よくある問題

1. **Cognito ユーザープールが見つからない**

   - 環境変数が正しく設定されているか確認
   - AWS 認証情報が有効か確認

2. **OAuth 認証が失敗する**

   - リダイレクト URI が正しく設定されているか確認
   - OAuth 認証情報が正しいか確認

3. **データベース接続エラー**

   - RDS エンドポイントが正しいか確認
   - セキュリティグループの設定を確認

4. **フロントエンドで認証エラー**
   - 環境変数が正しく設定されているか確認
   - API ベース URL が正しいか確認

### ログの確認

```bash
# ECSタスクのログを確認
aws logs describe-log-groups --log-group-name-prefix "/ecs/bridgespeak"

# 特定のログストリームを確認
aws logs get-log-events --log-group-name "/ecs/bridgespeak-dev-go-backend" --log-stream-name "ecs/go-backend/..."
```

## 今後の拡張

1. **MFA（多要素認証）の追加**
2. **SAML 認証のサポート**
3. **カスタム認証フローの実装**
4. **ユーザーグループ・ロール管理**
5. **認証イベントの監査ログ**

## サポート

問題が発生した場合は、以下の情報を含めて報告してください：

- エラーメッセージ
- ログファイル
- 実行環境（OS、ブラウザ等）
- 再現手順
