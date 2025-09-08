# 🛠️ セットアップガイド

このガイドでは、BridgeSpeakプロジェクトの完全なセットアップ手順を説明します。

## 📋 前提条件

- Node.js 18.0.0 以上
- npm または yarn
- Gitアカウント
- Supabaseアカウント（無料）

## 🚀 ステップ1: プロジェクトのセットアップ

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

## 🗄️ ステップ2: Supabaseプロジェクトの作成

### 2.1 アカウント作成・ログイン
1. [Supabase](https://supabase.com)にアクセス
2. **Start your project** をクリック
3. GitHubアカウントでサインアップ/ログイン

### 2.2 新しいプロジェクトの作成
1. **New Project** をクリック
2. 組織を選択（個人アカウントでOK）
3. プロジェクト設定を入力：
   - **Name**: `bridgespeak`
   - **Database Password**: 強力なパスワードを生成
   - **Region**: `Northeast Asia (Tokyo)` 推奨
4. **Create new project** をクリック
5. プロジェクトの準備完了まで1-2分待機

### 2.3 認証設定
1. **Authentication** → **Settings** に移動
2. **Email** タブを選択
3. 以下の設定を行う：
   - **Enable email confirmations**: **OFF** に設定
   - **Enable sign ups**: **ON** に設定
4. **Save** をクリックして設定を保存

### 2.4 API キーの取得
1. **Settings** → **API** に移動
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 🔧 ステップ3: 環境変数の設定

`.env.local` ファイルを編集して、SupabaseのAPI情報を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**取得したProject URLとanon keyを上記の値に置き換えてください。**

> **重要**: `.env.local`は機密情報を含むため、Gitにコミットされません。チームメンバーは各自で設定する必要があります。

## 🗃️ ステップ4: データベーススキーマの作成

### 4.1 マイグレーションファイルの実行

Supabaseダッシュボードの **SQL Editor** で以下のマイグレーションを**順番に**実行：

#### a) 初期スキーマ（最重要）
`supabase/migrations/00000000000000_initial_schema.sql` の内容をコピー＆実行

> **注意**: このファイルは基本テーブル、トリガー、RLSポリシーを含む最も重要なマイグレーションです。

#### b) サンプルデータ
`supabase/migrations/20250607194921_copper_art.sql` の内容をコピー＆実行

#### c) リアルタイム機能
`supabase/migrations/20250607213847_flat_peak.sql` の内容をコピー＆実行

#### d) グループチャット機能（オプション）
`supabase/migrations/20250607215232_mellow_temple.sql` の内容をコピー＆実行

### 4.2 実行順序の重要性

```
1. initial_schema.sql (基盤テーブル・トリガー・RLS)
2. copper_art.sql (サンプルデータ)
3. flat_peak.sql (リアルタイム機能)
4. mellow_temple.sql (グループチャット機能)
```

### 4.3 実行結果の確認
各SQLの実行後、成功メッセージが表示されることを確認してください。

## 🧪 ステップ5: サンプルデータの作成

### 5.1 AIエージェントの確認
**Table Editor** で `ai_agents` テーブルを確認し、5つのAIエージェントが作成されていることを確認：

```sql
SELECT name, personality_preset FROM ai_agents WHERE is_active = true;
```

### 5.2 友だち関係の作成（手動）

アプリでユーザー登録を行った後、以下のSQLを実行してAIエージェントと友だちになります：

```sql
-- 1. あなたのユーザーIDを確認
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- 2. プロフィールIDを確認  
SELECT id, user_id FROM profiles ORDER BY created_at DESC LIMIT 1;

-- 3. 友だち関係を作成（YOUR_USER_IDを実際のプロフィールIDに置換）
INSERT INTO friendships (user_id, friend_type, friend_id) VALUES
('YOUR_PROFILE_ID', 'ai', (SELECT id FROM ai_agents WHERE personality_preset = 'support')),
('YOUR_PROFILE_ID', 'ai', (SELECT id FROM ai_agents WHERE personality_preset = 'friendly')),
('YOUR_PROFILE_ID', 'ai', (SELECT id FROM ai_agents WHERE personality_preset = 'business'));

-- 4. 会話を作成
INSERT INTO conversations (participant1_type, participant1_id, participant2_type, participant2_id) VALUES
('human', 'YOUR_PROFILE_ID', 'ai', (SELECT id FROM ai_agents WHERE personality_preset = 'support')),
('human', 'YOUR_PROFILE_ID', 'ai', (SELECT id FROM ai_agents WHERE personality_preset = 'friendly'));
```

## 🚀 ステップ6: アプリケーションの起動

### 6.1 開発サーバーの起動
```bash
npm run dev
```

### 6.2 アプリケーションへのアクセス
ブラウザで `http://localhost:3000` にアクセス

## ✅ ステップ7: 動作確認

### 7.1 基本機能の確認
1. **ユーザー登録**: 新規アカウントを作成
2. **ログイン**: 作成したアカウントでログイン  
3. **ダッシュボード**: 友だちリストにAIエージェントが表示されることを確認
4. **チャット**: AIエージェントとの会話が開始できることを確認

### 7.2 データベースの確認
**Table Editor** で以下を確認：
- `profiles` テーブルにユーザーデータが作成されている
- `ai_agents` テーブルにサンプルエージェントが存在する
- `friendships` テーブルに友だち関係が作成されている

### 7.3 レスポンシブデザインの確認
- デスクトップ表示（1024px以上）: 2カラムレイアウト
- モバイル表示（1023px以下）: フルスクリーン + ボトムナビゲーション

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. 環境変数が読み込まれない
```bash
# .envファイルの確認
cat .env

# 開発サーバーの再起動
npm run dev
```

#### 2. Supabase接続エラー
- URLとAPIキーの確認
- Supabaseプロジェクトの起動状態確認
- ネットワーク接続の確認

#### 3. データベーステーブルが見つからない
- **原因**: マイグレーションが正しく実行されていない
- **解決**: SQL Editorでテーブル作成SQLを再実行

#### 4. 認証エラー
- **原因**: RLSポリシーの問題
- **解決**: Table Editorで **Policies** タブを確認

#### 5. 友だちリストが空
- **原因**: 友だち関係が作成されていない
- **解決**: 手動でfriendshipsテーブルにデータを挿入

### デバッグ用クエリ

```sql
-- 現在のユーザーIDを確認
SELECT auth.uid();

-- テーブルのポリシー確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies WHERE schemaname = 'public';

-- テーブルのRLS状態確認
SELECT schemaname, tablename, rowsecurity, forcerowsecurity 
FROM pg_tables WHERE schemaname = 'public';

-- 全テーブルが作成されていることを確認
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

## 🔄 開発時のデータリセット

```sql
-- 全データ削除（開発時のみ使用）
TRUNCATE message_reads, messages, conversations, friendships CASCADE;
-- プロフィールは auth.users と連動するため通常削除しない
```

**⚠️ 警告**: 本番環境では絶対に実行しないでください。

## 🎉 セットアップ完了！

おめでとうございます！以下の機能が利用できるようになりました：

- ✅ ユーザー登録・ログイン
- ✅ プロフィール管理  
- ✅ AIエージェントとの友だち関係
- ✅ リアルタイムチャット機能
- ✅ レスポンシブデザイン
- ✅ セキュアなデータアクセス（RLS）

## 📞 サポート

問題が解決しない場合は、以下を確認してください：
1. Supabaseダッシュボードのエラーログ
2. ブラウザの開発者ツールのコンソール
3. [プロジェクトの GitHub Issues](https://github.com/your-org/bridgespeak/issues)

---

次は [新規エンジニア向けガイド](GETTING_STARTED.md) で開発の進め方を学びましょう！