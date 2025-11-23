# Stripe 設定ガイド - 完全版

このドキュメントでは、NeuraKnot プロジェクトで Stripe 決済を動作させるために**あなたが実際に行う作業**を、ステップバイステップで説明します。

---

## 📋 事前確認

このガイドを始める前に、以下が完了していることを確認してください：

- [ ] PostgreSQL がインストールされている
- [ ] Go 1.25+がインストールされている
- [ ] Node.js 18+がインストールされている
- [ ] プロジェクトがクローンされている

---

## Phase 1: 事前準備（30 分）

### ✅ Step 1: Stripe アカウント作成

1. ブラウザで [https://stripe.com/jp](https://stripe.com/jp) を開く
2. 「今すぐ始める」ボタンをクリック
3. メールアドレス、パスワードを入力してアカウント作成
4. メールで届いた認証リンクをクリック
5. ダッシュボードにログイン

**重要**: ダッシュボード左上に「テストモード」「本番モード」のスイッチがあります。
→ **「テストモード」になっていることを確認**（青色のスイッチ）

---

### ✅ Step 2: データベースマイグレーション

```bash
# プロジェクトルートに移動
cd /Users/chihiro/Desktop/個人開発/NeuraKnot

# マイグレーションを実行
psql -U postgres -d neuraknot -f backend-go/migrations/000002_add_billing_system.up.sql
psql -U postgres -d neuraknot -f backend-go/migrations/000003_seed_llm_pricing.up.sql
```

**確認コマンド**:

```sql
-- PostgreSQLに接続
psql -U postgres -d neuraknot

-- usersテーブルにstripe_customer_id列が追加されたか確認
\d users

-- llm_pricingテーブルが作成されたか確認
SELECT COUNT(*) FROM llm_pricing;
-- 結果: 4以上の行数が表示されればOK

-- 終了
\q
```

---

## Phase 2: Stripe 設定（テストモード）（40 分）

### ✅ Step 3: テストモード用 API キー取得

1. Stripe ダッシュボードで左上が**「テストモード」**になっているか確認
2. 左メニューから「開発者」をクリック
3. 「API キー」をクリック
4. 「シークレットキー」の欄で「表示」ボタンをクリック
5. `sk_test_...` で始まるキーをコピー

**メモ帳に記録**:

```
テスト用シークレットキー: sk_test_YOUR_TEST_KEY_HERE
```

---

### ✅ Step 4-1: 商品作成（Pro プラン）

1. Stripe ダッシュボード左メニューから「商品カタログ」→「商品」をクリック
2. 右上の「商品を追加」ボタンをクリック
3. 以下を入力:
   - **名前**: `Pro Plan`
   - **説明**: `月額980円で1,300万トークン/月まで利用可能`
   - **画像**: （任意、スキップ可）
4. 「料金を追加」セクションで:
   - **料金モデル**: `Standard pricing（標準の料金設定）` を選択
   - **価格**: `980` を入力
   - **通貨**: `JPY` を選択
   - **請求期間**: `Recurring（定期的）` → `月次` を選択
5. 「商品を保存」ボタンをクリック
6. 作成された商品ページの「料金」セクションに表示される **Price ID**（`price_...`で始まる）をコピー

**メモ帳に記録**:

```
Pro用Price ID（テスト）: price_1xxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### ✅ Step 4-2: 商品作成（Max プラン）

同じ手順で 2 つ目の商品を作成:

1. 「商品を追加」ボタンをクリック
2. 以下を入力:
   - **名前**: `Max Plan`
   - **説明**: `月額2,980円で4,000万トークン/月まで利用可能`
3. 料金設定:
   - **価格**: `2980`
   - **通貨**: `JPY`
   - **請求期間**: `月次`
4. 「商品を保存」
5. **Price ID** をコピー

**メモ帳に記録**:

```
Max用Price ID（テスト）: price_1yyyyyyyyyyyyyyyyyyyyyyyyy
```

---

### ✅ Step 5: Stripe CLI インストール

```bash
# Macの場合
brew install stripe/stripe-cli/stripe

# インストール確認
stripe --version
# 出力例: stripe version 1.x.x

# Stripeアカウントにログイン（ブラウザが開く）
stripe login
# → ブラウザで「アクセスを許可」をクリック

# ログイン成功を確認
stripe config --list
```

---

### ✅ Step 6: 環境変数ファイル作成

`backend-go/.env.local` ファイルを作成（まだ存在しない場合）:

```bash
cd /Users/chihiro/Desktop/個人開発/NeuraKnot/backend-go

# .env.localファイルを作成
touch .env.local

# エディタで開く
code .env.local
# または
vim .env.local
```

以下の内容を貼り付け（**Step 3, 4 でコピーした値に置き換える**）:

```bash
# ========================================
# Stripe設定（テストモード）
# ========================================

# Step 3でコピーしたシークレットキー
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY_HERE

# Step 7で取得（まだ空欄でOK）
STRIPE_WEBHOOK_SECRET=

# Step 4-1でコピーしたProプランのPrice ID
STRIPE_PRICE_ID_PRO=price_1xxxxxxxxxxxxxxxxxxxxxxxxx

# Step 4-2でコピーしたMaxプランのPrice ID
STRIPE_PRICE_ID_MAX=price_1yyyyyyyyyyyyyyyyyyyyyyyyy
```

ファイルを保存して閉じる。

**確認**: .gitignore に含まれているか確認

```bash
cat ../.gitignore | grep ".env.local"
# 出力: .env.local があればOK
```

---

### ✅ Step 7: Webhook のローカルテスト準備

**ターミナルウィンドウ 1（Webhook リスニング専用）**を開く:

```bash
cd /Users/chihiro/Desktop/個人開発/NeuraKnot

# Webhookをローカルにフォワード
stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe
```

以下のような出力が表示される:

```
> Ready! You are using Stripe API Version [2024-xx-xx]. Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx (^C to quit)
```

**この `whsec_...` をコピー**して、`backend-go/.env.local`の`STRIPE_WEBHOOK_SECRET`に設定:

```bash
# .env.localを再度開いて編集
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**重要**: このターミナルウィンドウは起動したまま（閉じない）

---

## Phase 3: アプリケーション起動とテスト（30 分）

### ✅ Step 8: バックエンド起動

**ターミナルウィンドウ 2（バックエンド専用）**を開く:

```bash
cd /Users/chihiro/Desktop/個人開発/NeuraKnot/backend-go

# 依存関係をインストール
go mod tidy

# ビルド
go build -o bin/api cmd/api/main.go

# 起動
./bin/api
```

以下のようなログが表示されれば OK:

```
[INFO] Server started on :8080
[INFO] Stripe Secret Key configured
```

**重要**: このターミナルウィンドウは起動したまま（閉じない）

---

### ✅ Step 9: フロントエンド起動

**ターミナルウィンドウ 3（フロントエンド専用）**を開く:

```bash
cd /Users/chihiro/Desktop/個人開発/NeuraKnot/frontend

# 依存関係をインストール（初回のみ）
npm install

# 開発サーバー起動
npm run dev
```

以下のような出力が表示されれば OK:

```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

### ✅ Step 10: 決済テスト実行

1. ブラウザで [http://localhost:3000](http://localhost:3000) を開く
2. 新規ユーザー登録（テスト用メールアドレスで OK）
3. ログイン
4. ダッシュボード → 設定 → サブスクリプション管理 を開く
5. **「Pro プランにアップグレード」**ボタンをクリック
6. Stripe Checkout ページに遷移する

**Stripe Checkout で以下を入力**:

- **メールアドレス**: 任意のメールアドレス
- **カード情報**（テスト用）:
  - カード番号: `4242 4242 4242 4242`
  - 有効期限: 任意の未来の日付（例: `12/34`）
  - CVC: 任意の 3 桁（例: `123`）
  - カード名義: 任意（例: `Test User`）
- **請求先住所**:
  - 国: 日本
  - 郵便番号: 任意（例: `100-0001`）

7. **「申し込む」**ボタンをクリック

---

### ✅ Step 11: 動作確認

決済完了後、以下を確認:

#### ターミナルウィンドウ 1（Webhook）の確認:

以下のようなログが表示されるはず:

```
2024-xx-xx xx:xx:xx   --> customer.subscription.created [evt_xxxxx]
2024-xx-xx xx:xx:xx  <--  [200] POST http://localhost:8080/api/v1/webhooks/stripe [evt_xxxxx]
```

#### ターミナルウィンドウ 2（Backend）の確認:

以下のようなログが表示されるはず:

```
[INFO] Received Stripe webhook event: customer.subscription.created
[INFO] Subscription created: sub_xxxxx for customer: cus_xxxxx
[INFO] User subscription updated: user_id=xxxxx tier=pro
```

#### データベースの確認:

```bash
# 別のターミナルで実行
psql -U postgres -d neuraknot

SELECT id, email, subscription_tier, subscription_status, stripe_customer_id
FROM users
WHERE email = 'your-test-email@example.com';
```

以下が表示されれば OK:

```
 id   | email                    | subscription_tier | subscription_status | stripe_customer_id
------+--------------------------+-------------------+---------------------+-------------------
 xxxx | your-test-email@...      | pro               | active              | cus_xxxxx
```

#### ブラウザの確認:

- ダッシュボードの設定画面で「現在のプラン: Pro」と表示される
- 使用量が表示される

---

### 🎉 テスト成功の判断基準

以下が全て確認できればテスト成功:

- [x] Stripe Checkout で決済完了
- [x] ターミナル 1 で Webhook イベント受信確認
- [x] ターミナル 2 でバックエンドログ確認
- [x] データベースで`subscription_tier`が`pro`に更新
- [x] ブラウザで「Pro」プラン表示

---

## Phase 4: 本番環境設定（デプロイ時）

### ⚠️ 重要な注意事項

本番環境では**実際の決済が発生**します。以下の手順は本番デプロイ時にのみ実行してください。

---

### ✅ Step 12: 本番モードに切り替え

1. Stripe ダッシュボード左上のスイッチを「本番モード」に切り替え
2. 確認ダイアログが表示される場合は「続行」をクリック

---

### ✅ Step 13: 本番用 API キー取得

1. 本番モードで「開発者」→「API キー」を開く
2. **シークレットキー**（`sk_live_...`で始まる）を**表示**してコピー

**メモ帳に記録**:

```
本番用シークレットキー: sk_live_YOUR_LIVE_KEY_HERE
```

---

### ✅ Step 14: 本番用商品と Price 作成

Step 4-1, 4-2 と同じ手順で、**本番モード**でも商品を作成:

**Pro Plan**:

- 価格: 980 JPY（または 6.5 USD）
- 請求期間: 月次

**Max Plan**:

- 価格: 2980 JPY（または 19.9 USD）
- 請求期間: 月次

**メモ帳に記録**:

```
Pro用Price ID（本番）: price_1xxxxxxxxxxxxxxxxxxxxxxxxx
Max用Price ID（本番）: price_1yyyyyyyyyyyyyyyyyyyyyyyyy
```

---

### ✅ Step 15: 本番用 Webhook エンドポイント作成

1. 本番モードで「開発者」→「Webhook」を開く
2. 「エンドポイントを追加」ボタンをクリック
3. 設定:
   - **エンドポイント URL**: `https://your-production-domain.com/api/v1/webhooks/stripe`
     - 例: `https://api.neuraknot.com/api/v1/webhooks/stripe`
   - **説明**: `Production Webhook for NeuraKnot`
   - **リッスンするイベント**: 「イベントを選択」をクリック
     - [x] `customer.subscription.created`
     - [x] `customer.subscription.updated`
     - [x] `customer.subscription.deleted`
     - [x] `invoice.payment_succeeded`
     - [x] `invoice.payment_failed`
4. 「エンドポイントを追加」ボタンをクリック
5. 作成されたエンドポイントをクリック
6. 「署名シークレット」の「表示」をクリックしてコピー

**メモ帳に記録**:

```
本番用Webhook Secret: whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### ✅ Step 16: AWS Secrets Manager 設定

**本番環境の環境変数は AWS Secrets Manager に設定**します。

#### AWS CLI で設定する場合:

```bash
# Secretを作成
aws secretsmanager create-secret \
  --name neuraknot/prod/stripe \
  --description "Stripe API keys for production" \
  --secret-string '{
    "STRIPE_SECRET_KEY":"sk_live_YOUR_LIVE_KEY_HERE",
    "STRIPE_WEBHOOK_SECRET":"whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx",
    "STRIPE_PRICE_ID_PRO":"price_1xxxxxxxxxxxxxxxxxxxxxxxxx",
    "STRIPE_PRICE_ID_MAX":"price_1yyyyyyyyyyyyyyyyyyyyyyyyy"
  }'
```

#### AWS コンソールで設定する場合:

1. AWS Console → Secrets Manager
2. 「新しいシークレットを保存」
3. シークレットタイプ: 「その他のシークレットのタイプ」
4. キー/値のペアを追加:
   - キー: `STRIPE_SECRET_KEY`, 値: `sk_live_...`
   - キー: `STRIPE_WEBHOOK_SECRET`, 値: `whsec_...`
   - キー: `STRIPE_PRICE_ID_PRO`, 値: `price_...`
   - キー: `STRIPE_PRICE_ID_MAX`, 値: `price_...`
5. シークレット名: `neuraknot/prod/stripe`
6. 「保存」

---

### ✅ Step 17: ECS Task Definition に環境変数を設定

ECS のタスク定義で、Secrets Manager から環境変数を読み込むように設定:

```json
{
  "containerDefinitions": [
    {
      "name": "backend-go",
      "secrets": [
        {
          "name": "STRIPE_SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:neuraknot/prod/stripe:STRIPE_SECRET_KEY::"
        },
        {
          "name": "STRIPE_WEBHOOK_SECRET",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:neuraknot/prod/stripe:STRIPE_WEBHOOK_SECRET::"
        },
        {
          "name": "STRIPE_PRICE_ID_PRO",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:neuraknot/prod/stripe:STRIPE_PRICE_ID_PRO::"
        },
        {
          "name": "STRIPE_PRICE_ID_MAX",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:neuraknot/prod/stripe:STRIPE_PRICE_ID_MAX::"
        }
      ]
    }
  ]
}
```

---

### ✅ Step 18: 本番デプロイ後の動作確認

1. 本番環境にデプロイ
2. Stripe ダッシュボード（本番モード）で「Webhook」を開く
3. 作成したエンドポイントをクリック
4. 「テスト Webhook を送信」ボタンをクリック
5. イベントタイプ: `customer.subscription.created` を選択
6. 「テスト Webhook を送信」

**確認**:

- Stripe ダッシュボードで「成功」と表示される（緑色）
- バックエンドログで Webhook イベント受信が記録される

---

## 📊 環境別設定まとめ

| 環境             | API キー      | Webhook Secret                  | Price ID（Pro）  | Price ID（Max）  | 設定場所            |
| ---------------- | ------------- | ------------------------------- | ---------------- | ---------------- | ------------------- |
| **ローカル開発** | `sk_test_...` | Stripe CLI 出力                 | `price_test_...` | `price_test_...` | `.env.local`        |
| **開発サーバー** | `sk_test_...` | Stripe ダッシュボード（テスト） | `price_test_...` | `price_test_...` | `.env.development`  |
| **本番環境**     | `sk_live_...` | Stripe ダッシュボード（本番）   | `price_live_...` | `price_live_...` | AWS Secrets Manager |

---

## ✅ 最終チェックリスト

### ローカル開発環境

- [ ] Stripe アカウント作成（テストモード）
- [ ] データベースマイグレーション実行
- [ ] テストモードで API キー取得
- [ ] テストモードで商品・Price 作成（Pro, Max）
- [ ] Stripe CLI インストール・ログイン
- [ ] `.env.local`作成、全環境変数設定
- [ ] `stripe listen`起動（ターミナル 1）
- [ ] バックエンド起動（ターミナル 2）
- [ ] フロントエンド起動（ターミナル 3）
- [ ] テストカードで決済テスト成功
- [ ] Webhook イベント受信確認
- [ ] データベースで`subscription_tier`更新確認
- [ ] ブラウザで「Pro」プラン表示確認

### 本番環境（デプロイ時）

- [ ] 本番モードに切り替え
- [ ] 本番用 API キー取得
- [ ] 本番用商品・Price 作成（Pro, Max）
- [ ] 本番用 Webhook エンドポイント作成
- [ ] AWS Secrets Manager に本番 API キー設定
- [ ] ECS Task Definition に環境変数設定
- [ ] 本番デプロイ実行
- [ ] Stripe ダッシュボードで Webhook テスト成功確認

---

## 🆘 トラブルシューティング

### Webhook が受信されない

**症状**: 決済完了後、データベースが更新されない

**確認項目**:

1. `stripe listen`が起動しているか確認
2. `.env.local`の`STRIPE_WEBHOOK_SECRET`が正しいか確認
3. バックエンドが`localhost:8080`で起動しているか確認
4. バックエンドログでエラーが出ていないか確認

**解決方法**:

```bash
# stripe listenを再起動
# Ctrl+C で停止後、再実行
stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe

# 新しいwhsec_...を.env.localに再設定
# バックエンドを再起動
```

---

### Price ID が見つからない

**症状**: `tier does not have a stripe price id` エラー

**確認項目**:

1. `.env.local`に`STRIPE_PRICE_ID_PRO`と`STRIPE_PRICE_ID_MAX`が設定されているか
2. Price ID が`price_`で始まっているか（`prod_`ではない）

**解決方法**:

- Stripe ダッシュボード → 商品 → 作成した商品をクリック
- 「料金」セクションで`price_...`をコピー
- `.env.local`を更新してバックエンド再起動

---

### データベース接続エラー

**症状**: `failed to connect to database` エラー

**確認項目**:

```bash
# PostgreSQLが起動しているか確認
psql -U postgres -d neuraknot -c "SELECT 1;"
```

**解決方法**:

```bash
# PostgreSQLを起動（Macの場合）
brew services start postgresql@15

# データベースが存在するか確認
psql -U postgres -l | grep neuraknot
```

---

## 🎓 補足情報

### テストカード番号一覧

| カード番号            | 結果                             |
| --------------------- | -------------------------------- |
| `4242 4242 4242 4242` | 成功                             |
| `4000 0000 0000 0002` | カードが拒否される               |
| `4000 0000 0000 9995` | 資金不足                         |
| `4000 0000 0000 0341` | 請求先住所の郵便番号が一致しない |

詳細: [Stripe テストカード](https://stripe.com/docs/testing)

---

### Stripe CLI の便利なコマンド

```bash
# イベント履歴を確認
stripe events list

# 特定のイベントを確認
stripe events retrieve evt_xxxxx

# 顧客一覧を確認
stripe customers list

# サブスクリプション一覧を確認
stripe subscriptions list
```

---

## 📞 サポート

問題が解決しない場合:

1. [Stripe ドキュメント](https://stripe.com/docs)を確認
2. [Stripe サポート](https://support.stripe.com/)に問い合わせ
3. プロジェクトの GitHub Issues に報告

---

**最終更新**: 2025 年 11 月 9 日
