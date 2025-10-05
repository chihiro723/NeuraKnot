# 🛠️ セットアップガイド

このガイドでは、BridgeSpeak プロジェクトの完全なセットアップ手順を説明します。

## 📋 前提条件

- Node.js 18.0.0 以上
- npm または yarn
- Git アカウント
- AWS アカウント（無料）

## 🚀 ステップ 1: プロジェクトのセットアップ

### 1.1 リポジトリのクローン

```bash
git clone [repository-url]
cd bridgespeak
```

### 1.2 依存関係のインストール

```bash
npm install
```

### 1.3 環境変数ファイルの準備

```bash
cp .env.example .env.local
```

## 🗄️ ステップ 2: AWS Cognito プロジェクトの作成

### 2.1 アカウント作成・ログイン

1. [AWS](https://aws.amazon.com)にアクセス
2. **アカウント作成** または **ログイン**
3. 無料利用枠を確認

### 2.2 Cognito User Pool の作成

1. **AWS Cognito** サービスに移動
2. **User Pools** を選択
3. **Create user pool** をクリック
4. プロジェクト設定を入力：
   - **Name**: `bridgespeak`
   - **Region**: `ap-northeast-1` (東京)
   - **Username**: `Email address` と `Username` の両方を選択
5. **Create** をクリック

### 2.3 認証設定

1. **Sign-in experience** で以下を設定：
   - **Email** を有効化
   - **Username** を有効化
2. **Security requirements** で以下を設定：
   - **Password policy**: `General` を選択
   - **MFA**: `No MFA` を選択
3. **Self-service sign-up** で以下を設定：
   - **Enable self-registration**: `ON`
   - **Email verification**: `ON`

### 2.4 App Client の作成

1. **App integration** で以下を設定：
   - **App client name**: `bridgespeak-client`
   - **Client secret**: `Generate a client secret`
2. **Hosted authentication pages** を有効化
3. **Domain**: カスタムドメインを設定

## 🔧 ステップ 3: 環境変数の設定

`.env.local` ファイルを編集して、AWS Cognito の API 情報を設定：

```env
NEXT_PUBLIC_AWS_REGION=ap-northeast-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_cognito_user_pool_id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_cognito_client_id
NEXT_PUBLIC_COGNITO_DOMAIN=your_cognito_domain
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

**取得した Cognito User Pool ID、Client ID、Domain を上記の値に置き換えてください。**

> **重要**: `.env.local`は機密情報を含むため、Git にコミットされません。チームメンバーは各自で設定する必要があります。

## 🗃️ ステップ 4: データベーススキーマの作成

### 4.1 マイグレーションファイルの実行

PostgreSQL データベースで以下のマイグレーションを**順番に**実行：

#### a) 初期スキーマ（最重要）

`backend-go/migrations/000001_create_users_table.up.sql` の内容をコピー＆実行

> **注意**: このファイルは基本テーブル、インデックスを含む最も重要なマイグレーションです。

#### b) テキストテーブル

`backend-go/migrations/000002_create_texts_table.up.sql` の内容をコピー＆実行

#### c) Cognito 連携用テーブル更新

`backend-go/migrations/000003_update_users_table_for_cognito.up.sql` の内容をコピー＆実行

### 4.2 実行順序の重要性

```
1. 000001_create_users_table.up.sql (基盤テーブル)
2. 000002_create_texts_table.up.sql (テキストテーブル)
3. 000003_update_users_table_for_cognito.up.sql (Cognito連携)
```

### 4.3 実行結果の確認

各 SQL の実行後、成功メッセージが表示されることを確認してください。

## 🧪 ステップ 5: サンプルデータの作成

### 5.1 ユーザーテーブルの確認

PostgreSQL データベースで `users` テーブルを確認し、Cognito 連携用のカラムが正しく作成されていることを確認：

```sql
SELECT cognito_user_id, email, username, display_name, status FROM users;
```

### 5.2 テストユーザーの作成（手動）

Cognito でユーザー登録を行った後、以下の SQL を実行して PostgreSQL にユーザー情報を同期：

```sql
-- 1. CognitoユーザーIDを確認（Cognitoダッシュボードから取得）
-- 2. PostgreSQLにユーザー情報を挿入
INSERT INTO users (cognito_user_id, email, name, username, display_name, status) VALUES
('cognito-user-id-here', 'test@example.com', 'Test User', 'testuser', 'Test User', 'online');
```

## 🚀 ステップ 6: アプリケーションの起動

### 6.1 開発サーバーの起動

```bash
npm run dev
```

### 6.2 アプリケーションへのアクセス

ブラウザで `http://localhost:3000` にアクセス

## ✅ ステップ 7: 動作確認

### 7.1 基本機能の確認

1. **ユーザー登録**: 新規アカウントを作成
2. **ログイン**: 作成したアカウントでログイン
3. **ダッシュボード**: 友だちリストに AI エージェントが表示されることを確認
4. **チャット**: AI エージェントとの会話が開始できることを確認

### 7.2 データベースの確認

PostgreSQL データベースで以下を確認：

- `users` テーブルにユーザーデータが作成されている
- `cognito_user_id` カラムが正しく設定されている
- `texts` テーブルが作成されている

### 7.3 レスポンシブデザインの確認

- デスクトップ表示（1024px 以上）: 2 カラムレイアウト
- モバイル表示（1023px 以下）: フルスクリーン + ボトムナビゲーション

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. 環境変数が読み込まれない

```bash
# .envファイルの確認
cat .env

# 開発サーバーの再起動
npm run dev
```

#### 2. Cognito 接続エラー

- User Pool ID と Client ID の確認
- AWS Cognito プロジェクトの起動状態確認
- ネットワーク接続の確認

#### 3. データベーステーブルが見つからない

- **原因**: マイグレーションが正しく実行されていない
- **解決**: PostgreSQL でテーブル作成 SQL を再実行

#### 4. 認証エラー

- **原因**: Cognito 設定の問題
- **解決**: AWS Cognito ダッシュボードで設定を確認

#### 5. ユーザー情報が表示されない

- **原因**: Cognito と PostgreSQL の連携が正しく設定されていない
- **解決**: 手動で users テーブルにデータを挿入

### デバッグ用クエリ

```sql
-- ユーザーテーブルの確認
SELECT cognito_user_id, email, username, display_name, status FROM users;

-- テーブルの構造確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public';

-- 全テーブルが作成されていることを確認
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

## 🔄 開発時のデータリセット

```sql
-- 全データ削除（開発時のみ使用）
TRUNCATE texts, users CASCADE;
-- Cognitoユーザーは手動で削除する必要があります
```

**⚠️ 警告**: 本番環境では絶対に実行しないでください。

## 🎉 セットアップ完了！

おめでとうございます！以下の機能が利用できるようになりました：

- ✅ ユーザー登録・ログイン（AWS Cognito）
- ✅ プロフィール管理
- ✅ OAuth 認証（Google、LINE、X）
- ✅ レスポンシブデザイン
- ✅ セキュアなデータアクセス（JWT）

## 📞 サポート

問題が解決しない場合は、以下を確認してください：

1. AWS Cognito ダッシュボードのエラーログ
2. ブラウザの開発者ツールのコンソール
3. [プロジェクトの GitHub Issues](https://github.com/your-org/bridgespeak/issues)

---

次は [新規エンジニア向けガイド](GETTING_STARTED.md) で開発の進め方を学びましょう！
