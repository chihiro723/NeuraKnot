# 課金システム実装ガイド

このドキュメントは、NeuraKnot プロジェクトに実装された Stripe 連携サブスクリプション課金システムの実装内容と使用方法を説明します。

## 📋 実装概要

### アーキテクチャ

- **課金モデル**: 段階的サブスクリプション + 超過従量課金
- **プラン構成**: Free / Basic / Pro
- **決済プロバイダー**: Stripe
- **データベース**: PostgreSQL

### 主要機能

1. ✅ サブスクリプション管理（作成・変更・キャンセル）
2. ✅ トークン使用量追跡
3. ✅ 超過料金自動計算
4. ✅ Stripe Webhook 連携
5. ✅ LLM 料金マスタ管理
6. ✅ ユーザー向けダッシュボード

---

## 🗂️ ディレクトリ構成

```
backend-go/
├── migrations/
│   ├── 000002_add_billing_system.up.sql        # マイグレーションファイル
│   ├── 000002_add_billing_system.down.sql      # ロールバック用
│   ├── 000003_seed_llm_pricing.up.sql          # LLM料金初期データ
│   └── 000003_seed_llm_pricing.down.sql        # ロールバック用
├── internal/
│   ├── domain/
│   │   ├── billing/
│   │   │   ├── subscription_tier.go            # サブスクリプションティア定義
│   │   │   ├── token_usage.go                  # トークン使用量エンティティ
│   │   │   ├── llm_pricing.go                  # LLM料金マスタエンティティ
│   │   │   └── repository.go                   # リポジトリインターフェース
│   │   └── user/
│   │       └── user.go                          # Userエンティティ（拡張済み）
│   ├── infrastructure/
│   │   ├── external/
│   │   │   └── stripe_client.go                # Stripe APIクライアント
│   │   └── persistence/
│   │       ├── token_usage_repository.go       # トークン使用量リポジトリ
│   │       ├── llm_pricing_repository.go       # LLM料金マスタリポジトリ
│   │       └── user/
│   │           └── repository.go                # Userリポジトリ（拡張済み）
│   ├── usecase/
│   │   └── billing/
│   │       └── billing_usecase.go              # 課金ユースケース
│   └── handler/
│       └── http/
│           ├── billing_handler.go              # 課金APIハンドラ
│           ├── webhook_handler.go              # Webhook処理ハンドラ
│           ├── request/
│           │   └── billing.go                   # リクエスト構造体
│           └── response/
│               └── billing.go                   # レスポンス構造体

frontend/
└── app/
    └── dashboard/
        └── settings/
            └── subscription/
                └── page.tsx                     # サブスクリプション管理画面
```

---

## 🗄️ データベーススキーマ

### 新規テーブル

#### 1. `llm_pricing` - LLM 料金マスタ

```sql
CREATE TABLE llm_pricing (
    id UUID PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,              -- openai, anthropic, google
    model VARCHAR(100) NOT NULL,                -- gpt-4o, claude-3-5-sonnet, etc
    prompt_cost_per_1m DECIMAL(10, 4) NOT NULL, -- USD/1Mトークン
    completion_cost_per_1m DECIMAL(10, 4) NOT NULL,
    effective_from TIMESTAMP NOT NULL,
    effective_to TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

#### 2. `token_usage` - トークン使用量

```sql
CREATE TABLE token_usage (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    period_start TIMESTAMP NOT NULL,            -- 課金期間開始
    period_end TIMESTAMP NOT NULL,              -- 課金期間終了
    tokens_prompt BIGINT DEFAULT 0,
    tokens_completion BIGINT DEFAULT 0,
    tokens_total BIGINT DEFAULT 0,
    cost_usd DECIMAL(10, 4) DEFAULT 0,
    request_count INTEGER DEFAULT 0,
    provider_breakdown JSONB DEFAULT '{}',      -- プロバイダー別内訳
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, period_start, period_end)
);
```

### 拡張テーブル

#### 3. `users` - ユーザー情報（拡張）

```sql
ALTER TABLE users
ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE,
ADD COLUMN subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free',
ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN stripe_subscription_id VARCHAR(255) UNIQUE,
ADD COLUMN current_period_start TIMESTAMP,
ADD COLUMN current_period_end TIMESTAMP;
```

#### 4. `ai_chat_sessions` - AI 処理セッション（拡張）

```sql
ALTER TABLE ai_chat_sessions
ADD COLUMN cost_usd DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN cost_jpy DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN prompt_cost_per_1m DECIMAL(10, 4),
ADD COLUMN completion_cost_per_1m DECIMAL(10, 4);
```

---

## 🎯 プラン定義

### Free ティア

- **月額料金**: ¥0
- **トークン制限**: 100,000 トークン/月
- **AI エージェント**: 3 体まで
- **超過**: 不可
- **サポート**: コミュニティ

### Basic ティア

- **月額料金**: ¥1,500 ($10)
- **トークン制限**: 5,000,000 トークン/月
- **AI エージェント**: 10 体まで
- **超過料金**: ¥450/1M トークン ($3/1M)
- **サポート**: メール

### Pro ティア

- **月額料金**: ¥10,000 ($67)
- **トークン制限**: 50,000,000 トークン/月
- **AI エージェント**: 無制限
- **超過料金**: ¥300/1M トークン ($2/1M)
- **サポート**: 優先

---

## 🔌 API エンドポイント

### 課金 API

#### 1. Checkout Session 作成

```http
POST /api/billing/checkout
Content-Type: application/json

{
  "tier": "basic",
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel"
}

Response:
{
  "session_id": "cs_...",
  "session_url": "https://checkout.stripe.com/..."
}
```

#### 2. Billing Portal Session 作成

```http
POST /api/billing/portal
Content-Type: application/json

{
  "return_url": "https://example.com/settings"
}

Response:
{
  "url": "https://billing.stripe.com/..."
}
```

#### 3. 現在の使用量取得

```http
GET /api/billing/usage

Response:
{
  "period_start": "2025-11-01T00:00:00Z",
  "period_end": "2025-12-01T00:00:00Z",
  "tokens_total": 1500000,
  "cost_usd": 5.25,
  "cost_jpy": 787.5,
  "remaining_tokens": 3500000,
  "overage_tokens": 0,
  "overage_cost": 0
}
```

#### 4. プラン情報取得

```http
GET /api/billing/tiers

Response:
[
  {
    "tier": "free",
    "monthly_token_limit": 100000,
    "price_jpy": 0,
    "price_usd": 0,
    ...
  },
  ...
]
```

### Webhook

#### Stripe Webhook

```http
POST /api/webhooks/stripe
Stripe-Signature: t=...,v1=...

Handled events:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
```

---

## 🚀 セットアップ手順

### 1. データベースマイグレーション

```bash
# ローカル環境用マイグレーションスクリプトを使用（推奨）
# プロジェクトルートから実行
./scripts/migrate-local.sh up

# または、個別にマイグレーションを適用する場合
./scripts/migrate-local.sh up 1
```

**本番環境**: [PRODUCTION_MIGRATION_GUIDE.md](./PRODUCTION_MIGRATION_GUIDE.md) を参照してください。

### 2. 環境変数設定

`backend-go/.env.local` に以下を追加：

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...  # テストモード（本番環境では sk_live_... を使用）
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhookエンドポイント作成後に取得

# Stripe Price IDs（Stripeダッシュボードで商品作成後に設定）
STRIPE_PRICE_ID_PRO=price_xxxxx  # Proプランの月額Price ID
STRIPE_PRICE_ID_MAX=price_yyyyy  # Maxプランの月額Price ID
```

**重要**:

- `STRIPE_SECRET_KEY`: Stripe ダッシュボードの「開発者 > API キー」から取得
- `STRIPE_WEBHOOK_SECRET`: Webhook エンドポイント作成時に表示される署名シークレット
- `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_MAX`: 商品の Price 作成後にコピー

### 3. Stripe ダッシュボード設定

1. **商品と Price 作成**

   - Pro: 980 円/月（または$6.5/月）
   - Max: 2,980 円/月（または$19.9/月）
   - Price ID をコピーして環境変数に設定

2. **Webhook 設定**
   - Endpoint URL: `https://your-domain.com/api/v1/webhooks/stripe`（本番）
   - または: Stripe CLI でローカル開発（後述）
   - イベント選択:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Webhook 署名シークレットをコピーして環境変数に設定

### 4. ビルドと起動

```bash
# バックエンド
cd backend-go
go mod tidy
go build -o bin/api cmd/api/main.go
./bin/api

# フロントエンド
cd frontend
npm install
npm run dev
```

---

## 🔄 処理フロー

### サブスクリプション登録フロー

```
1. ユーザーがプラン選択
   ↓
2. Frontend: POST /api/billing/checkout
   ↓
3. Backend: Stripe Checkout Session作成
   ↓
4. ユーザーがStripe Checkoutで支払い
   ↓
5. Stripe → Backend: customer.subscription.created webhook
   ↓
6. Backend: ユーザー情報更新（tier, subscription_id, period）
```

### トークン使用量記録フロー

```
1. ユーザーがAI処理実行
   ↓
2. Backend: トークン制限チェック（CheckTokenLimit）
   ↓
3. AI処理実行（LLM API呼び出し）
   ↓
4. Backend: トークン使用量記録（RecordTokenUsage）
   - LLM料金マスタから料金取得
   - コスト計算
   - token_usageテーブル更新
   ↓
5. ai_chat_sessionsにコスト記録
```

### 月次課金フロー

```
1. Stripe: 月次請求処理
   ↓
2. 超過料金があれば自動で請求項目追加
   ↓
3. Stripe → Backend: invoice.payment_succeeded webhook
   ↓
4. Backend: 新しい課金期間のtoken_usageレコード作成
   ↓
5. ユーザーのcurrent_period_start/end更新
```

---

## 🧪 テスト方法

### Stripe テストモード

```bash
# Stripe CLIをインストール
brew install stripe/stripe-cli/stripe

# Stripe CLIでログイン（初回のみ）
stripe login

# Webhookをローカルにフォワード
stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe

# テストカード番号
4242 4242 4242 4242  # 成功
4000 0000 0000 0002  # 失敗
```

### トークン使用量テスト

```go
// backend-go/internal/usecase/billing/billing_usecase_test.go
func TestRecordTokenUsage(t *testing.T) {
    // テストコード
}
```

---

## 📝 今後の改善点

### ステータス

#### ✅ 完了済み

1. [x] `user_repository.go`に`GetByStripeCustomerID()`メソッド追加
2. [x] Stripe Price ID を環境変数から取得する実装
3. [x] Webhook ハンドラーのルーティング設定
4. [x] 超過従量課金関連コードに未実装を明示

### 必須対応（残タスク）

1. [ ] エラーハンドリング強化
2. [ ] ログ出力の改善
3. [ ] Stripe ダッシュボードでの商品・Price・Webhook 設定

### 機能追加（未実装）

1. [ ] 超過従量課金の自動請求処理（現在は関数のみ存在、未実装）
2. [ ] プラン変更時の日割り計算
3. [ ] 請求書 PDF 生成
4. [ ] メール通知（支払い成功/失敗）
5. [ ] 使用量アラート機能
6. [ ] 管理者ダッシュボード

### パフォーマンス最適化

1. [ ] token_usage の集計クエリ最適化
2. [ ] キャッシュ導入（Redis）
3. [ ] バッチ処理の実装

---

## 🔒 セキュリティ考慮事項

1. **Webhook 署名検証**: Stripe 署名を必ず検証
2. **API 認証**: すべての課金 API に認証必須
3. **データ暗号化**: Stripe Customer ID など機密情報の取り扱い
4. **Rate Limiting**: API 呼び出し制限
5. **監査ログ**: 課金操作のログ記録

---

## 📚 参考リンク

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Billing Documentation](https://stripe.com/docs/billing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [NeuraKnot Billing System Design](./BILLING_SYSTEM_DESIGN.md)

---

## 🆘 トラブルシューティング

### Webhook が受信されない

- Stripe CLI でローカルテスト
- Webhook URL が正しいか確認
- ファイアウォール設定を確認

### トークン使用量が記録されない

- llm_pricing テーブルに料金データが存在するか確認
- ログでエラーメッセージを確認

### 決済が失敗する

- Stripe テストモードになっているか確認
- テストカード番号が正しいか確認
- Stripe API キーが正しいか確認

---

**実装日**: 2025 年 11 月 6 日
**バージョン**: v1.0
**ステータス**: ✅ 実装完了
