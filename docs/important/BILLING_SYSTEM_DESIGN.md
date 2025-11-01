# NeuraKnot 課金システム設計書（Stripe 連携版）

## 📋 目次

1. [概要](#概要)
2. [課金モデル](#課金モデル)
3. [アーキテクチャ](#アーキテクチャ)
4. [テーブル設計](#テーブル設計)
5. [Stripe 設定](#stripe設定)
6. [データフロー](#データフロー)
7. [重要なクエリ](#重要なクエリ)
8. [実装ガイド](#実装ガイド)
9. [運用ガイド](#運用ガイド)

---

## 概要

### 課金システムの目的

NeuraKnot の課金システムは、以下の要件を満たすように設計されています：

- ✅ **利益率の確保**：LLM API の原価を上回る収益を保証
- ✅ **シンプルな運用**：Stripe に任せて保守しやすい設計
- ✅ **ユーザー体験**：明確な料金体系で安心して利用できる
- ✅ **スケーラビリティ**：将来的な機能拡張に対応可能
- ✅ **信頼性**：Stripe の実績ある決済インフラを活用

### 設計方針

1. **Stripe ファースト**：サブスク管理は Stripe に完全に任せる
2. **最小限の独自実装**：トークン使用量のみ自前で管理
3. **Webhook 駆動**：Stripe イベントでリアルタイム同期
4. **透明性**：原価と販売価格を明確に分離して記録
5. **バッチレス**：バッチ処理不要のシンプル設計

---

## 課金モデル

### 採用モデル：段階的サブスクリプション + 超過従量課金

```
┌─────────────────────────────────────────────────┐
│ 基本料金（月額固定）                              │
│   +                                             │
│ トークン制限内は使い放題                          │
│   +                                             │
│ 制限超過時は従量課金                              │
└─────────────────────────────────────────────────┘
```

### プラン構成

| プラン    | 月額料金 | トークン制限 | 超過料金             | AI 分身数 | 利用可能モデル   |
| --------- | -------- | ------------ | -------------------- | --------- | ---------------- |
| **Free**  | 0 円     | 100,000      | 不可（制限で停止）   | 1 体      | GPT-4o-mini のみ |
| **Basic** | 980 円   | 1,000,000    | 0.5 円/1000 トークン | 3 体      | OpenAI 系        |
| **Pro**   | 2,980 円 | 5,000,000    | 0.3 円/1000 トークン | 10 体     | すべて           |

### なぜこのモデルを選んだか？

#### メリット

1. **収益の安定性**

   - 基本料金で最低収益を確保
   - ヘビーユーザーから追加収益

2. **ユーザー体験**

   - 毎月の予算が立てやすい
   - 使い放題感があるので躊躇なく使える
   - Free プランで試せる

3. **リスク管理**

   - トークン制限で暴走を防ぐ
   - 超過料金で極端なコスト圧迫を回避

4. **成長戦略**
   - Free → Basic → Pro への明確なアップグレードパス

#### 他のモデルとの比較

| モデル           | メリット           | デメリット                 | NeuraKnot 採用 |
| ---------------- | ------------------ | -------------------------- | -------------- |
| 完全従量課金     | 公平、参入障壁低い | 収益不安定、ユーザーが躊躇 | ❌             |
| 完全定額         | 収益安定、使い放題 | ヘビーユーザーでコスト圧迫 | ❌             |
| **ハイブリッド** | バランスが良い     | 実装やや複雑               | ✅ **採用**    |
| プリペイド       | 前払いで確実       | ユーザー体験が悪い         | ❌             |

---

## アーキテクチャ

### 責任分離

```
┌─────────────────────────────────────────────────────────┐
│ Stripe（サブスク管理の真実の情報源）                      │
├─────────────────────────────────────────────────────────┤
│ ✅ Product（プラン定義：Free, Basic, Pro）               │
│ ✅ Price（料金設定：月額、トークン制限をmetadataに）      │
│ ✅ Customer（顧客情報）                                  │
│ ✅ Subscription（契約状態、期間、ステータス）             │
│ ✅ Invoice（請求履歴、決済結果）                          │
│ ✅ 自動課金（月次処理）                                   │
│ ✅ 決済リトライ                                          │
└─────────────────────────────────────────────────────────┘
                           ↕ Webhook
┌─────────────────────────────────────────────────────────┐
│ 自前DB（Stripe連携＋独自データ）                          │
├─────────────────────────────────────────────────────────┤
│ ✅ users（Stripe Customer IDの保存）                      │
│ ✅ token_usage（トークン使用量の追跡）                    │
│ ✅ llm_pricing（LLM原価計算用マスタ）                     │
│ ✅ ai_chat_sessions（AI処理履歴＋原価記録）              │
└─────────────────────────────────────────────────────────┘
```

### なぜこの設計？

#### Stripe に任せるもの

| 機能                 | 理由                                  |
| -------------------- | ------------------------------------- |
| プラン管理           | Stripe Dashboard で簡単に変更可能     |
| 契約状態             | active/canceled/past_due など自動管理 |
| 自動課金             | 毎月自動実行、バッチ不要              |
| 決済処理             | PCI DSS 準拠、セキュリティ万全        |
| 請求書発行           | 自動生成、メール送信                  |
| 決済失敗時のリトライ | Smart Retry で自動実行                |

#### 自前で管理するもの

| 機能           | 理由                             |
| -------------- | -------------------------------- |
| トークン使用量 | NeuraKnot 独自のビジネスロジック |
| LLM 原価計算   | 利益率分析に必要                 |
| AI 処理履歴    | 詳細なログが必要                 |

---

## テーブル設計

### 全体像

```
既存テーブル（拡張）:
├── users（ユーザー情報）← Stripe ID追加
└── ai_chat_sessions（AI処理履歴）← 原価カラム追加

新規テーブル（最小限）:
├── token_usage（トークン使用量）← 唯一の新規サブスク関連テーブル
└── llm_pricing（LLMモデル料金マスタ）← 内部計算用
```

**重要**：`subscription_plans`と`user_subscriptions`テーブルは**不要**です。Stripe が管理します。

### 1. llm_pricing（LLM モデル料金マスタ）

**目的**：各 LLM モデルの原価と販売価格を管理

```sql
CREATE TABLE llm_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- モデル識別
    provider VARCHAR(50) NOT NULL,              -- 'openai', 'anthropic', 'google'
    model VARCHAR(100) NOT NULL,                -- 'gpt-4o', 'claude-3-5-sonnet'

    -- 原価（LLM APIに支払う金額、1000トークンあたりUSD）
    cost_per_1k_prompt_tokens DECIMAL(10, 6) NOT NULL,
    cost_per_1k_completion_tokens DECIMAL(10, 6) NOT NULL,

    -- 販売価格（ユーザーに請求する金額、1000トークンあたりUSD）
    price_per_1k_prompt_tokens DECIMAL(10, 6) NOT NULL,
    price_per_1k_completion_tokens DECIMAL(10, 6) NOT NULL,

    -- 有効フラグ
    is_active BOOLEAN DEFAULT true,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 制約：販売価格は原価以上（利益を保証）
    CONSTRAINT chk_price_above_cost CHECK (
        price_per_1k_prompt_tokens >= cost_per_1k_prompt_tokens AND
        price_per_1k_completion_tokens >= cost_per_1k_completion_tokens
    ),

    -- 同一モデルのアクティブは1つだけ
    CONSTRAINT unique_active_model UNIQUE(provider, model) WHERE is_active = true
);

-- インデックス
CREATE INDEX idx_llm_pricing_active ON llm_pricing(provider, model) WHERE is_active = true;
```

#### 初期データ例（2024 年 12 月時点、利益率 30%）

```sql
INSERT INTO llm_pricing (
    provider, model,
    cost_per_1k_prompt_tokens, cost_per_1k_completion_tokens,
    price_per_1k_prompt_tokens, price_per_1k_completion_tokens
) VALUES
-- OpenAI GPT-4o
('openai', 'gpt-4o', 0.0025, 0.010, 0.00325, 0.013),
-- OpenAI GPT-4o-mini
('openai', 'gpt-4o-mini', 0.00015, 0.0006, 0.000195, 0.00078),
-- Anthropic Claude 3.5 Sonnet
('anthropic', 'claude-3-5-sonnet', 0.003, 0.015, 0.0039, 0.0195),
-- Google Gemini Pro
('google', 'gemini-pro', 0.00025, 0.0005, 0.000325, 0.00065);
```

#### 重要ポイント

- **原価の更新**：LLM プロバイダーの料金変更時に更新
- **利益率の確保**：`chk_price_above_cost`制約で保証
- **履歴管理**：`is_active`で過去の料金も保持（監査用）

---

### 2. users（既存テーブルの拡張）

**目的**：Stripe Customer と Subscription の ID を保存

```sql
-- 既存のusersテーブルに以下のカラムを追加
ALTER TABLE users
    -- Stripe Customer ID
    ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE,

    -- Stripe Subscription ID（現在アクティブなサブスク）
    ADD COLUMN stripe_subscription_id VARCHAR(255),

    -- Stripe Price ID（現在のプラン）
    ADD COLUMN stripe_price_id VARCHAR(255);

-- インデックス
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_users_stripe_subscription ON users(stripe_subscription_id);

-- コメント
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe Customer ID（顧客の一意識別子）';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Stripe Subscription ID（現在アクティブなサブスク）';
COMMENT ON COLUMN users.stripe_price_id IS 'Stripe Price ID（現在のプラン料金）';
```

#### 重要ポイント

- **単一の真実の情報源**：Stripe が契約状態の真実を持つ
- **キャッシュ**：頻繁な Stripe API 呼び出しを避けるため、ID をキャッシュ
- **同期**：Webhook で常に最新状態に保つ

---

### 3. token_usage（トークン使用量追跡）

**目的**：ユーザーの期間ごとのトークン使用量を記録

```sql
CREATE TABLE token_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ユーザー
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Stripe Subscription ID（どのサブスク期間か）
    stripe_subscription_id VARCHAR(255) NOT NULL,

    -- サブスク期間（Stripeから取得）
    subscription_period_start TIMESTAMP NOT NULL,
    subscription_period_end TIMESTAMP NOT NULL,

    -- トークン使用量
    tokens_used INTEGER DEFAULT 0,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 1ユーザー・1期間につき1レコード
    CONSTRAINT unique_user_period UNIQUE(user_id, subscription_period_start)
);

-- インデックス
CREATE INDEX idx_token_usage_user ON token_usage(user_id);
CREATE INDEX idx_token_usage_subscription ON token_usage(stripe_subscription_id);
CREATE INDEX idx_token_usage_period_end ON token_usage(subscription_period_end);

-- トリガー：updated_at自動更新
CREATE TRIGGER update_token_usage_updated_at
    BEFORE UPDATE ON token_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE token_usage IS 'ユーザーのサブスク期間ごとのトークン使用量';
COMMENT ON COLUMN token_usage.stripe_subscription_id IS 'Stripe SubscriptionのID';
COMMENT ON COLUMN token_usage.subscription_period_start IS 'サブスク期間開始（Stripeから取得）';
COMMENT ON COLUMN token_usage.subscription_period_end IS 'サブスク期間終了（Stripeから取得）';
```

#### 重要ポイント

- **期間追跡**：Stripe のサブスク期間と完全に同期
- **履歴保持**：過去の期間も保持（分析用）
- **シンプル**：トークン数だけを記録（プラン情報は Stripe にある）

---

### 4. ai_chat_sessions（既存テーブルの拡張）

**目的**：AI 処理ごとの原価と販売価格を記録

```sql
-- 既存のai_chat_sessionsテーブルに以下のカラムを追加
ALTER TABLE ai_chat_sessions
    -- 原価（LLM APIに支払う金額、USD）
    ADD COLUMN cost_usd DECIMAL(10, 6),

    -- 販売価格（ユーザーに請求する金額、USD）
    ADD COLUMN price_usd DECIMAL(10, 6),

    -- 使用した料金テーブルのID（履歴追跡用）
    ADD COLUMN pricing_id UUID REFERENCES llm_pricing(id) ON DELETE SET NULL;

-- コメント
COMMENT ON COLUMN ai_chat_sessions.cost_usd IS 'LLM API原価（USD）';
COMMENT ON COLUMN ai_chat_sessions.price_usd IS 'ユーザー課金額（USD）';
COMMENT ON COLUMN ai_chat_sessions.pricing_id IS '適用した料金テーブルのID';
```

#### 既存カラムとの関係

```
ai_chat_sessions（既存）:
├── user_id                      ← 誰が使用したか
├── provider, model              ← どのモデルを使用したか
├── tokens_prompt                ← 入力トークン数
├── tokens_completion            ← 出力トークン数
├── tokens_total                 ← 合計トークン数
│
新規追加:
├── cost_usd                     ← 原価（計算結果）
├── price_usd                    ← 販売価格（計算結果）
└── pricing_id                   ← どの料金テーブルを使用したか
```

#### 重要ポイント

- **詳細な記録**：すべての AI 処理について原価と売上を記録
- **集計可能**：後からコスト分析や利益率計算が可能
- **監査対応**：`pricing_id`で当時の料金設定を追跡可能

---

## Stripe 設定

### Product & Price 作成

#### 1. Free プラン

```javascript
// Stripe Dashboard または API で作成
const freeProduct = await stripe.products.create({
  name: "Free",
  description: "無料で始める - GPT-4o-miniのみ利用可能",
  metadata: {
    plan_code: "free",
    monthly_token_limit: "100000",
    max_ai_agents: "1",
    allowed_providers: "openai",
    allowed_models: "gpt-4o-mini",
    overage_allowed: "false",
  },
});

const freePrice = await stripe.prices.create({
  product: freeProduct.id,
  unit_amount: 0, // 0円
  currency: "jpy",
  recurring: { interval: "month" },
  metadata: {
    plan_code: "free",
  },
});
```

#### 2. Basic プラン

```javascript
const basicProduct = await stripe.products.create({
  name: "Basic",
  description: "個人利用向け - OpenAI系モデル利用可能",
  metadata: {
    plan_code: "basic",
    monthly_token_limit: "1000000",
    max_ai_agents: "3",
    allowed_providers: "openai",
    overage_allowed: "true",
    overage_price_per_1k_tokens: "0.5", // 0.5円/1000トークン
  },
});

const basicPrice = await stripe.prices.create({
  product: basicProduct.id,
  unit_amount: 98000, // 980円
  currency: "jpy",
  recurring: { interval: "month" },
  metadata: {
    plan_code: "basic",
  },
});
```

#### 3. Pro プラン

```javascript
const proProduct = await stripe.products.create({
  name: "Pro",
  description: "ヘビーユーザー向け - すべてのモデル利用可能",
  metadata: {
    plan_code: "pro",
    monthly_token_limit: "5000000",
    max_ai_agents: "10",
    allowed_providers: "openai,anthropic,google",
    overage_allowed: "true",
    overage_price_per_1k_tokens: "0.3", // 0.3円/1000トークン
  },
});

const proPrice = await stripe.prices.create({
  product: proProduct.id,
  unit_amount: 298000, // 2980円
  currency: "jpy",
  recurring: { interval: "month" },
  metadata: {
    plan_code: "pro",
  },
});
```

### 重要ポイント

- **metadata 活用**：プラン固有の設定（トークン制限など）を metadata に保存
- **Price ID を記録**：アプリケーション側で Price ID を環境変数で管理

```bash
# .env
STRIPE_PRICE_FREE=price_xxxxx
STRIPE_PRICE_BASIC=price_xxxxx
STRIPE_PRICE_PRO=price_xxxxx
```

### Webhook 設定

#### 必要なイベント

```
customer.subscription.created      # サブスク開始
customer.subscription.updated      # プラン変更
customer.subscription.deleted      # 解約
invoice.payment_succeeded          # 課金成功
invoice.payment_failed             # 課金失敗
```

#### Webhook URL の設定

```
https://your-api.com/api/v1/webhooks/stripe
```

---

## データフロー

### 1. ユーザー登録時

```
ユーザー登録
    ↓
【Backend-go】
├── 1. usersテーブルに追加
│
├── 2. Stripe Customerを作成
│   └── stripe.customers.create({
│       email: user.email,
│       name: user.display_name,
│       metadata: { user_id: user.id }
│   })
│
├── 3. DB更新（Stripe Customer IDを保存）
│   └── UPDATE users SET stripe_customer_id = ? WHERE id = ?
│
└── 4. Freeプランを自動付与
    ├── stripe.subscriptions.create({
    │   customer: stripe_customer_id,
    │   items: [{ price: STRIPE_PRICE_FREE }]
    │ })
    │
    └── Webhook（customer.subscription.created）が飛んでくる
        ├── users.stripe_subscription_id を更新
        ├── users.stripe_price_id を更新
        └── token_usageレコード作成（tokens_used=0）
```

### 2. サブスク開始時（Webhook: customer.subscription.created）

```
Webhookを受信
    ↓
【Backend-go /api/v1/webhooks/stripe】
├── 1. Webhook署名検証
│   └── stripe.webhooks.constructEvent(payload, signature, secret)
│
├── 2. Subscriptionデータを取得
│   ├── subscription_id
│   ├── customer_id
│   ├── price_id
│   ├── current_period_start
│   ├── current_period_end
│   └── status
│
├── 3. DB更新
│   ├── UPDATE users
│   │   SET stripe_subscription_id = ?,
│   │       stripe_price_id = ?
│   │   WHERE stripe_customer_id = ?
│   │
│   └── INSERT INTO token_usage (
│       user_id,
│       stripe_subscription_id,
│       subscription_period_start,
│       subscription_period_end,
│       tokens_used
│     ) VALUES (?, ?, ?, ?, 0)
│
└── 4. 完了（Stripeが自動課金を続ける）
```

### 3. AI 処理実行時

```
ユーザーがAIにメッセージ送信
    ↓
【Backend-go】
├── 1. ユーザー情報とStripe Subscription IDを取得
│   └── SELECT stripe_subscription_id, stripe_price_id FROM users WHERE id = ?
│
├── 2. Stripe APIでサブスク状態を確認
│   ├── subscription = stripe.subscriptions.retrieve(stripe_subscription_id)
│   └── IF subscription.status != 'active' THEN エラー
│
├── 3. プラン情報を取得（Stripe Priceのmetadata）
│   ├── price = stripe.prices.retrieve(stripe_price_id, { expand: ['product'] })
│   ├── monthly_token_limit = price.product.metadata.monthly_token_limit
│   ├── allowed_providers = price.product.metadata.allowed_providers
│   └── overage_allowed = price.product.metadata.overage_allowed
│
├── 4. 現在のトークン使用量を取得
│   └── SELECT tokens_used FROM token_usage
│       WHERE user_id = ? AND stripe_subscription_id = ?
│
├── 5. トークン制限チェック
│   └── IF tokens_used >= monthly_token_limit AND overage_allowed = 'false' THEN
│       └── エラー：「月間制限に達しました。プランをアップグレードしてください」
│
├── 6. プロバイダー制限チェック
│   └── IF requested_provider NOT IN allowed_providers THEN
│       └── エラー：「このプランでは利用できないプロバイダーです」
│
├── 7. AI処理実行（Backend-pythonへ）
│   └── LLM API呼び出し → トークン数取得
│
├── 8. 料金計算
│   ├── pricing = SELECT * FROM llm_pricing
│   │            WHERE provider = ? AND model = ? AND is_active = true
│   │
│   ├── cost_usd = (tokens_prompt / 1000 * cost_per_1k_prompt_tokens) +
│   │              (tokens_completion / 1000 * cost_per_1k_completion_tokens)
│   │
│   └── price_usd = (tokens_prompt / 1000 * price_per_1k_prompt_tokens) +
│                    (tokens_completion / 1000 * price_per_1k_completion_tokens)
│
├── 9. ai_chat_sessionsに記録
│   └── INSERT INTO ai_chat_sessions (
│       user_id, provider, model,
│       tokens_prompt, tokens_completion, tokens_total,
│       cost_usd, price_usd, pricing_id
│     )
│
└── 10. token_usageを更新
    └── UPDATE token_usage
        SET tokens_used = tokens_used + tokens_total
        WHERE user_id = ? AND stripe_subscription_id = ?
```

### 4. 月次課金成功時（Webhook: invoice.payment_succeeded）

```
Stripeが自動課金を実行（月初）
    ↓
課金成功
    ↓
Webhookを受信
    ↓
【Backend-go /api/v1/webhooks/stripe】
├── 1. Invoiceデータを取得
│   ├── subscription_id
│   ├── customer_id
│   ├── amount_paid
│   ├── period_start（新しい期間）
│   └── period_end（新しい期間）
│
├── 2. 超過料金を計算してStripeに追加請求（必要なら）
│   ├── 前期間のtoken_usageを取得
│   ├── IF tokens_used > monthly_token_limit THEN
│   │   ├── overage_tokens = tokens_used - monthly_token_limit
│   │   ├── overage_cost = overage_tokens / 1000 * overage_price_per_1k_tokens
│   │   └── stripe.invoiceItems.create({
│   │       customer: customer_id,
│   │       amount: overage_cost,
│   │       currency: 'jpy',
│   │       description: '超過トークン料金'
│   │     })
│   └── （次回請求時に自動課金される）
│
└── 3. 新しい期間のtoken_usageレコードを作成
    └── INSERT INTO token_usage (
        user_id,
        stripe_subscription_id,
        subscription_period_start,
        subscription_period_end,
        tokens_used
      ) VALUES (?, ?, ?, ?, 0)
```

### 5. 課金失敗時（Webhook: invoice.payment_failed）

```
Stripeが自動課金を実行
    ↓
課金失敗（カード無効など）
    ↓
Webhookを受信
    ↓
【Backend-go /api/v1/webhooks/stripe】
├── 1. ユーザーに通知メール送信
│   └── 「お支払いが完了しませんでした。カード情報を更新してください」
│
├── 2. サービス制限（オプション）
│   └── 数日後にStripeが自動リトライするので、待つのもあり
│
└── 3. Stripeが自動リトライ（Smart Retry）
    └── 数日間、最適なタイミングで再試行
```

### 6. プラン変更時

```
ユーザーがプラン変更を申請
    ↓
【Backend-go】
├── 1. Stripe Subscriptionを更新
│   └── stripe.subscriptions.update(subscription_id, {
│       items: [{
│         id: subscription_item_id,
│         price: new_price_id  // 新しいプランのPrice ID
│       }],
│       proration_behavior: 'always_invoice'  // 日割り計算
│     })
│
└── 2. Webhook（customer.subscription.updated）が飛んでくる
    ├── users.stripe_price_id を新しいPrice IDに更新
    ├── 現在のtoken_usageはそのまま（引き継ぐ）
    └── 日割り差額はStripeが自動計算・請求
```

### 7. 解約時

```
ユーザーが解約を申請
    ↓
【Backend-go】
├── 1. Stripe Subscriptionをキャンセル
│   └── stripe.subscriptions.update(subscription_id, {
│       cancel_at_period_end: true  // 期間終了まで利用可能
│     })
│
└── 2. Webhook（customer.subscription.updated）が飛んでくる
    └── ステータスが 'active' のまま、cancel_at_period_end = true

期間終了時
    ↓
Webhook（customer.subscription.deleted）が飛んでくる
    ↓
【Backend-go】
├── users.stripe_subscription_id をNULLに
├── users.stripe_price_id をNULLに
└── サービス停止（Freeプランに戻すかは要検討）
```

---

## 重要なクエリ

### 1. ユーザーの現在の使用状況を取得

```sql
SELECT
    u.id as user_id,
    u.email,
    u.display_name,
    u.stripe_customer_id,
    u.stripe_subscription_id,
    u.stripe_price_id,
    tu.tokens_used,
    tu.subscription_period_start,
    tu.subscription_period_end
FROM users u
LEFT JOIN token_usage tu ON u.id = tu.user_id
WHERE
    u.id = $1 AND
    tu.subscription_period_end > CURRENT_TIMESTAMP
ORDER BY tu.subscription_period_start DESC
LIMIT 1;
```

**用途**：ダッシュボードで表示、API レスポンス

**補足**：プラン情報（monthly_token_limit など）は Stripe API から取得

```go
// Goでの実装例
subscription, _ := stripe.subscriptions.retrieve(user.StripeSubscriptionID)
price, _ := stripe.prices.retrieve(subscription.Items.Data[0].Price.ID, &stripe.PriceParams{
    Params: stripe.Params{
        Expand: []*string{stripe.String("product")},
    },
})

monthlyTokenLimit := price.Product.Metadata["monthly_token_limit"]
maxAIAgents := price.Product.Metadata["max_ai_agents"]
```

---

### 2. 制限に近づいているユーザーを抽出（アラート用）

```sql
-- DBから現在のトークン使用量を取得
SELECT
    u.id,
    u.email,
    u.stripe_price_id,
    tu.tokens_used,
    tu.subscription_period_end
FROM users u
JOIN token_usage tu ON u.id = tu.user_id
WHERE
    u.stripe_subscription_id IS NOT NULL AND
    tu.subscription_period_end > CURRENT_TIMESTAMP;
```

その後、アプリケーション層で：

```go
for _, user := range users {
    // Stripe APIからプラン情報取得
    price, _ := stripe.prices.retrieve(user.StripePriceID, ...)
    monthlyTokenLimit := price.Product.Metadata["monthly_token_limit"]

    usagePercent := float64(user.TokensUsed) / float64(monthlyTokenLimit) * 100

    if usagePercent >= 80 {
        // アラート送信
        sendUsageAlert(user, usagePercent)
    }
}
```

**用途**：

- 80%達成時：通知メール送信
- 90%達成時：警告メール送信
- 100%達成時：制限通知

---

### 3. 今月のコスト・売上・利益を集計

```sql
SELECT
    COUNT(*) as request_count,
    SUM(tokens_total) as total_tokens,
    SUM(cost_usd) as total_cost_usd,
    SUM(price_usd) as total_revenue_usd,
    SUM(price_usd - cost_usd) as total_profit_usd,
    ROUND(
        (SUM(price_usd - cost_usd) / NULLIF(SUM(cost_usd), 0) * 100), 2
    ) as profit_margin_percent
FROM ai_chat_sessions
WHERE
    DATE_TRUNC('month', started_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP) AND
    status = 'completed';
```

**用途**：経営ダッシュボード、月次レポート

**変更なし**：このクエリはそのまま使える

---

### 4. モデル別のコストと利益を分析

```sql
SELECT
    provider,
    model,
    COUNT(*) as request_count,
    SUM(tokens_total) as total_tokens,
    ROUND(SUM(cost_usd)::NUMERIC, 4) as total_cost_usd,
    ROUND(SUM(price_usd)::NUMERIC, 4) as total_revenue_usd,
    ROUND(SUM(price_usd - cost_usd)::NUMERIC, 4) as total_profit_usd,
    ROUND(
        (SUM(price_usd - cost_usd) / NULLIF(SUM(cost_usd), 0) * 100)::NUMERIC, 2
    ) as profit_margin_percent
FROM ai_chat_sessions
WHERE
    DATE_TRUNC('month', started_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP) AND
    status = 'completed'
GROUP BY provider, model
ORDER BY total_profit_usd DESC;
```

**用途**：どのモデルが利益率が高いかを分析

**変更なし**：このクエリもそのまま使える

---

### 5. ユーザーごとの月間コスト（上位 100 人）

```sql
SELECT
    u.email,
    u.stripe_price_id,
    COUNT(s.id) as request_count,
    SUM(s.tokens_total) as total_tokens,
    ROUND(SUM(s.cost_usd)::NUMERIC, 4) as total_cost_usd,
    ROUND(SUM(s.price_usd)::NUMERIC, 4) as total_revenue_usd,
    ROUND(SUM(s.price_usd - s.cost_usd)::NUMERIC, 4) as total_profit_usd
FROM ai_chat_sessions s
JOIN users u ON s.user_id = u.id
WHERE
    DATE_TRUNC('month', s.started_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP) AND
    s.status = 'completed' AND
    u.stripe_subscription_id IS NOT NULL
GROUP BY u.id, u.email, u.stripe_price_id
ORDER BY total_cost_usd DESC
LIMIT 100;
```

**用途**：コストがかかっているユーザーの特定、プラン提案

**補足**：プラン名は Stripe API から取得

---

### 6. 期限切れ間近のサブスクリプションを検出（通知用）

```sql
-- 3日以内に期限が切れるサブスク
SELECT
    u.id,
    u.email,
    u.stripe_subscription_id,
    tu.subscription_period_end,
    tu.tokens_used
FROM users u
JOIN token_usage tu ON u.id = tu.user_id
WHERE
    u.stripe_subscription_id IS NOT NULL AND
    tu.subscription_period_end BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '3 days'
ORDER BY tu.subscription_period_end;
```

**用途**：更新前の通知メール送信

**補足**：実際の課金は Stripe が自動で行うため、バッチ処理は**不要**

---

## 実装ガイド

### フェーズ 1：環境準備

#### 1-1. Stripe アカウントのセットアップ

```bash
# 1. Stripeダッシュボードでアカウント作成
https://dashboard.stripe.com/register

# 2. APIキーを取得
https://dashboard.stripe.com/test/apikeys
```

#### 1-2. 環境変数の設定

```bash
# backend-go/.env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_FREE=price_xxxxx
STRIPE_PRICE_BASIC=price_xxxxx
STRIPE_PRICE_PRO=price_xxxxx
```

#### 1-3. Stripe CLI のインストール（開発用）

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe
```

---

### フェーズ 2：テーブル作成

#### 2-1. マイグレーションファイルの作成

```bash
# backend-go/migrations/ に作成
touch 000010_create_billing_tables.up.sql
touch 000010_create_billing_tables.down.sql
```

#### 2-2. up.sql の内容

```sql
-- llm_pricing テーブル作成
CREATE TABLE llm_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    cost_per_1k_prompt_tokens DECIMAL(10, 6) NOT NULL,
    cost_per_1k_completion_tokens DECIMAL(10, 6) NOT NULL,
    price_per_1k_prompt_tokens DECIMAL(10, 6) NOT NULL,
    price_per_1k_completion_tokens DECIMAL(10, 6) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_price_above_cost CHECK (
        price_per_1k_prompt_tokens >= cost_per_1k_prompt_tokens AND
        price_per_1k_completion_tokens >= cost_per_1k_completion_tokens
    ),
    CONSTRAINT unique_active_model UNIQUE(provider, model) WHERE is_active = true
);

-- usersテーブルにStripe IDを追加
ALTER TABLE users
    ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE,
    ADD COLUMN stripe_subscription_id VARCHAR(255),
    ADD COLUMN stripe_price_id VARCHAR(255);

CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_users_stripe_subscription ON users(stripe_subscription_id);

-- token_usage テーブル作成
CREATE TABLE token_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) NOT NULL,
    subscription_period_start TIMESTAMP NOT NULL,
    subscription_period_end TIMESTAMP NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_period UNIQUE(user_id, subscription_period_start)
);

CREATE INDEX idx_token_usage_user ON token_usage(user_id);
CREATE INDEX idx_token_usage_subscription ON token_usage(stripe_subscription_id);

-- ai_chat_sessions の拡張
ALTER TABLE ai_chat_sessions
    ADD COLUMN cost_usd DECIMAL(10, 6),
    ADD COLUMN price_usd DECIMAL(10, 6),
    ADD COLUMN pricing_id UUID REFERENCES llm_pricing(id) ON DELETE SET NULL;

-- 初期データ投入
INSERT INTO llm_pricing (provider, model, cost_per_1k_prompt_tokens, cost_per_1k_completion_tokens, price_per_1k_prompt_tokens, price_per_1k_completion_tokens)
VALUES
('openai', 'gpt-4o', 0.0025, 0.010, 0.00325, 0.013),
('openai', 'gpt-4o-mini', 0.00015, 0.0006, 0.000195, 0.00078),
('anthropic', 'claude-3-5-sonnet', 0.003, 0.015, 0.0039, 0.0195),
('google', 'gemini-pro', 0.00025, 0.0005, 0.000325, 0.00065);
```

#### 2-3. down.sql の内容

```sql
ALTER TABLE ai_chat_sessions
    DROP COLUMN pricing_id,
    DROP COLUMN price_usd,
    DROP COLUMN cost_usd;

DROP TABLE IF EXISTS token_usage CASCADE;

ALTER TABLE users
    DROP COLUMN stripe_price_id,
    DROP COLUMN stripe_subscription_id,
    DROP COLUMN stripe_customer_id;

DROP TABLE IF EXISTS llm_pricing CASCADE;
```

---

### フェーズ 3：Stripe Product/Price 作成

#### 3-1. 管理スクリプトの作成

```go
// cmd/stripe-setup/main.go
package main

import (
    "github.com/stripe/stripe-go/v76"
    "github.com/stripe/stripe-go/v76/product"
    "github.com/stripe/stripe-go/v76/price"
)

func main() {
    stripe.Key = os.Getenv("STRIPE_SECRET_KEY")

    // Freeプラン作成
    freeProduct, _ := product.New(&stripe.ProductParams{
        Name: stripe.String("Free"),
        Description: stripe.String("無料で始める"),
        Metadata: map[string]string{
            "plan_code": "free",
            "monthly_token_limit": "100000",
            "max_ai_agents": "1",
            "allowed_providers": "openai",
            "allowed_models": "gpt-4o-mini",
            "overage_allowed": "false",
        },
    })

    freePrice, _ := price.New(&stripe.PriceParams{
        Product: stripe.String(freeProduct.ID),
        UnitAmount: stripe.Int64(0),
        Currency: stripe.String(string(stripe.CurrencyJPY)),
        Recurring: &stripe.PriceRecurringParams{
            Interval: stripe.String(string(stripe.PriceRecurringIntervalMonth)),
        },
    })

    fmt.Printf("Free Price ID: %s\n", freePrice.ID)
    // 同様にBasic、Proも作成...
}
```

---

### フェーズ 4：Backend-go 実装

#### 4-1. Stripe クライアントの初期化

```go
// pkg/stripe/client.go
package stripe

import (
    "github.com/stripe/stripe-go/v76"
    "github.com/stripe/stripe-go/v76/customer"
    "github.com/stripe/stripe-go/v76/sub"
)

type Client struct {
    apiKey string
}

func NewClient(apiKey string) *Client {
    stripe.Key = apiKey
    return &Client{apiKey: apiKey}
}

func (c *Client) CreateCustomer(email, name string, metadata map[string]string) (*stripe.Customer, error) {
    params := &stripe.CustomerParams{
        Email: stripe.String(email),
        Name: stripe.String(name),
    }
    params.AddMetadata("user_id", metadata["user_id"])

    return customer.New(params)
}

func (c *Client) CreateSubscription(customerID, priceID string) (*stripe.Subscription, error) {
    params := &stripe.SubscriptionParams{
        Customer: stripe.String(customerID),
        Items: []*stripe.SubscriptionItemsParams{
            {Price: stripe.String(priceID)},
        },
    }

    return sub.New(params)
}
```

#### 4-2. Webhook ハンドラー

```go
// internal/handler/http/webhook_handler.go
package http

func (h *WebhookHandler) HandleStripeWebhook(c *gin.Context) {
    payload, _ := ioutil.ReadAll(c.Request.Body)
    signature := c.GetHeader("Stripe-Signature")

    event, err := webhook.ConstructEvent(payload, signature, webhookSecret)
    if err != nil {
        c.JSON(400, gin.H{"error": "Invalid signature"})
        return
    }

    switch event.Type {
    case "customer.subscription.created":
        h.handleSubscriptionCreated(event)
    case "customer.subscription.updated":
        h.handleSubscriptionUpdated(event)
    case "customer.subscription.deleted":
        h.handleSubscriptionDeleted(event)
    case "invoice.payment_succeeded":
        h.handlePaymentSucceeded(event)
    case "invoice.payment_failed":
        h.handlePaymentFailed(event)
    }

    c.JSON(200, gin.H{"status": "success"})
}

func (h *WebhookHandler) handleSubscriptionCreated(event stripe.Event) {
    var subscription stripe.Subscription
    json.Unmarshal(event.Data.Raw, &subscription)

    // 1. DBのusersテーブルを更新
    h.userRepo.UpdateStripeInfo(
        subscription.Customer.ID,
        subscription.ID,
        subscription.Items.Data[0].Price.ID,
    )

    // 2. token_usageレコードを作成
    h.billingRepo.CreateTokenUsage(&domain.TokenUsage{
        StripeSubscriptionID: subscription.ID,
        PeriodStart: time.Unix(subscription.CurrentPeriodStart, 0),
        PeriodEnd: time.Unix(subscription.CurrentPeriodEnd, 0),
        TokensUsed: 0,
    })
}
```

#### 4-3. AI 処理時の制限チェック

```go
// internal/usecase/ai/ai_usecase.go
func (u *AIUsecase) ProcessMessage(ctx context.Context, userID uuid.UUID, message string) error {
    // 1. ユーザー情報取得
    user, _ := u.userRepo.GetByID(ctx, userID)

    // 2. Stripeでサブスク状態確認
    subscription, _ := u.stripeClient.GetSubscription(user.StripeSubscriptionID)
    if subscription.Status != "active" {
        return errors.New("サブスクリプションが無効です")
    }

    // 3. プラン情報取得（metadata）
    price, _ := u.stripeClient.GetPrice(user.StripePriceID)
    monthlyTokenLimit := price.Product.Metadata["monthly_token_limit"]

    // 4. 現在のトークン使用量取得
    usage, _ := u.billingRepo.GetCurrentTokenUsage(ctx, userID)

    // 5. 制限チェック
    if usage.TokensUsed >= monthlyTokenLimit {
        return errors.New("月間トークン制限に達しました")
    }

    // 6. AI処理実行...
    // 7. トークン使用量更新...
}
```

---

### フェーズ 5：Frontend 実装

#### 5-1. Stripe Checkout 統合

```typescript
// lib/actions/billing.ts
export async function createCheckoutSession(priceId: string) {
  const res = await fetch("/api/v1/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ price_id: priceId }),
  });

  const { session_url } = await res.json();
  window.location.href = session_url;
}
```

````go
// Backend-go側
func (h *BillingHandler) CreateCheckoutSession(c *gin.Context) {
    userID := c.GetString("user_id")
    priceID := c.PostForm("price_id")

    user, _ := h.userRepo.GetByID(ctx, userID)

    session, _ := h.stripeClient.CreateCheckoutSession(&stripe.CheckoutSessionParams{
        Customer: stripe.String(user.StripeCustomerID),
        LineItems: []*stripe.CheckoutSessionLineItemParams{
            {Price: stripe.String(priceID), Quantity: stripe.Int64(1)},
        },
        Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
        SuccessURL: stripe.String("https://your-app.com/success"),
        CancelURL: stripe.String("https://your-app.com/cancel"),
    })

    c.JSON(200, gin.H{"session_url": session.URL})
}

---

## 運用ガイド

### 日次バッチ処理（最小限）

**重要**：Stripeが自動課金を行うため、複雑なバッチ処理は**不要**です。

#### 実行内容（推奨）

```go
// scripts/daily_tasks.go
func main() {
    // 1. 使用量アラートの送信（80%/90%/100%）
    sendUsageAlerts()

    // 2. コスト集計レポートの生成
    generateDailyReport()

    // 3. Stripeとの同期チェック（念のため）
    verifySyncWithStripe()
}
````

**不要なもの**：

- ❌ サブスク期限チェック → Stripe が管理
- ❌ 自動課金処理 → Stripe が実行
- ❌ 決済リトライ → Stripe が自動実行

---

### LLM 料金の更新手順

#### OpenAI が料金を変更した場合

```sql
-- 1. 現在の料金を無効化
UPDATE llm_pricing
SET is_active = false
WHERE provider = 'openai' AND model = 'gpt-4o' AND is_active = true;

-- 2. 新しい料金を追加（利益率30%で計算）
INSERT INTO llm_pricing (
    provider, model,
    cost_per_1k_prompt_tokens, cost_per_1k_completion_tokens,
    price_per_1k_prompt_tokens, price_per_1k_completion_tokens
) VALUES (
    'openai', 'gpt-4o',
    0.0030,  -- 新しい原価
    0.012,   -- 新しい原価
    0.0039,  -- 販売価格（30%増し）
    0.0156   -- 販売価格（30%増し）
);
```

---

### プラン料金の変更手順

#### Stripe Product/Price を更新

```go
// 新しいPriceを作成（既存ユーザーは影響なし）
newPrice, _ := price.New(&stripe.PriceParams{
    Product: stripe.String(productID),
    UnitAmount: stripe.Int64(128000), // 1280円に値上げ
    Currency: stripe.String("jpy"),
    Recurring: &stripe.PriceRecurringParams{
        Interval: stripe.String("month"),
    },
    Metadata: map[string]string{
        "monthly_token_limit": "1500000", // 制限も変更
    },
})

// 環境変数を更新
STRIPE_PRICE_BASIC=price_new_xxxxx
```

**既存ユーザーへの対応**：

1. 既存ユーザーは旧 Price のまま継続
2. 新規ユーザーは新 Price を使用
3. 任意で移行キャンペーンを実施

---

### モニタリング

#### Stripe Dashboard で監視

- MRR（月次経常収益）
- Churn Rate（解約率）
- 決済失敗率
- アクティブサブスク数

#### 自前 DB で監視

1. **全体の利益率**

   ```sql
   SELECT
       SUM(price_usd - cost_usd) / SUM(cost_usd) * 100 as profit_margin
   FROM ai_chat_sessions
   WHERE started_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP);
   ```

   - 目標：30%以上
   - アラート：20%を下回ったら通知

2. **プランごとの収益**

   ```sql
   -- Stripe APIから取得したプラン別収益を分析
   ```

3. **モデル別のコスト**

   - どのモデルが多く使われているか
   - 利益率の低いモデルはないか

4. **ヘビーユーザーの特定**
   - コスト Top100
   - プラン提案の自動化

---

### トラブルシューティング

#### Q: Webhook が届かない

**原因**：

- Webhook URL が間違っている
- 署名検証に失敗している
- サーバーがダウンしている

**対処**：

```bash
# Stripe CLIでローカルテスト
stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe

# Stripe Dashboardでログ確認
https://dashboard.stripe.com/webhooks
```

#### Q: 課金が二重になった

**原因**：Webhook が重複して処理された

**対処**：

```go
// Webhookのべき等性を保証
func (h *WebhookHandler) handlePaymentSucceeded(event stripe.Event) {
    // 1. イベントIDをチェック
    if h.eventRepo.Exists(event.ID) {
        return // 既に処理済み
    }

    // 2. 処理実行
    // ...

    // 3. イベントIDを記録
    h.eventRepo.Save(event.ID)
}
```

---

## FAQ

### Q1: ユーザー登録時に Free プランを自動付与するには？

```go
func CreateUser(ctx context.Context, email, name string) error {
    // 1. ユーザー作成
    user := createUser(email, name)

    // 2. Stripe Customerを作成
    customer, _ := stripeClient.CreateCustomer(email, name, map[string]string{
        "user_id": user.ID.String(),
    })

    // 3. DBに保存
    user.StripeCustomerID = customer.ID
    updateUser(user)

    // 4. Freeプランを自動付与
    subscription, _ := stripeClient.CreateSubscription(customer.ID, STRIPE_PRICE_FREE)

    // 5. Webhook（customer.subscription.created）が自動で飛んでくる
    // → usersテーブルとtoken_usageが自動更新される

    return nil
}
```

---

### Q2: 超過料金はどう計算する？

```go
// Webhook（invoice.payment_succeeded）で実行
func (h *WebhookHandler) handlePaymentSucceeded(event stripe.Event) {
    // 1. 前期間のトークン使用量を取得
    usage := h.billingRepo.GetTokenUsage(subscriptionID)

    // 2. Stripe APIからプラン情報取得
    price, _ := h.stripeClient.GetPrice(priceID)
    monthlyTokenLimit := parseIntメタデータ["monthly_token_limit"])
    overagePricePer1kTokens := parseFloat(metadata["overage_price_per_1k_tokens"])

    // 3. 超過分を計算
    if usage.TokensUsed > monthlyTokenLimit {
        overageTokens := usage.TokensUsed - monthlyTokenLimit
        overageCost := float64(overageTokens) / 1000.0 * overagePricePer1kTokens

        // 4. Stripeに追加課金を作成（次回請求時に自動課金）
        h.stripeClient.CreateInvoiceItem(customerID, int64(overageCost*100), "超過トークン料金")
    }
}
```

---

### Q3: プランのトークン制限を変更するには？

```go
// Stripe Product metadataを更新
product, _ := stripe.products.update(productID, &stripe.ProductParams{
    Metadata: map[string]string{
        "monthly_token_limit": "2000000", // 200万トークンに増やす
    },
})

// 既存サブスクは即座に新制限が適用される
```

---

### Q4: 日割り計算は必要？

**Stripe が自動で処理します**

```go
// プラン変更時
stripe.subscriptions.update(subscriptionID, &stripe.SubscriptionParams{
    Items: []*stripe.SubscriptionItemsParams{
        {Price: stripe.String(newPriceID)},
    },
    ProrationBehavior: stripe.String("always_invoice"), // 自動で日割り計算
})
```

- アップグレード：即座に変更、差額を即座に請求
- ダウングレード：`cancel_at_period_end: true` で期間終了時に変更

---

## まとめ

### 旧設計との比較

| 項目       | 旧設計（独自実装） | 新設計（Stripe 連携）   |
| ---------- | ------------------ | ----------------------- |
| テーブル数 | 3 つ新規           | 1 つ新規（token_usage） |
| バッチ処理 | 必須（複雑）       | ほぼ不要                |
| 実装コスト | 高い               | 低い                    |
| バグリスク | 高い               | 低い                    |
| 保守性     | 低い               | 高い                    |
| 決済処理   | 自前実装           | Stripe 任せ             |
| PCI DSS    | 要対応             | Stripe 準拠             |

### このシステムの強み

✅ **シンプル**：テーブル 2 つ（llm_pricing + token_usage）のみ  
✅ **Stripe 活用**：サブスク管理を完全に任せる  
✅ **バッチレス**：複雑な定期処理が不要  
✅ **利益保証**：DB 制約で販売価格 ≥ 原価を強制  
✅ **透明性**：原価と売上を完全に分離して記録  
✅ **Webhook 駆動**：リアルタイム同期  
✅ **PCI DSS 準拠**：決済は Stripe 任せで安全

### 実装優先度

1. **フェーズ 1（必須）**：Stripe アカウント設定、Product/Price 作成
2. **フェーズ 2（必須）**：テーブル作成、マイグレーション実行
3. **フェーズ 3（必須）**：Webhook 実装、DB 同期
4. **フェーズ 4（必須）**：AI 処理時の制限チェック
5. **フェーズ 5（推奨）**：Frontend 実装、Stripe Checkout 連携

### 関連ドキュメント

- [Stripe Billing 公式ドキュメント](https://stripe.com/docs/billing)
- [Stripe Webhook 公式ドキュメント](https://stripe.com/docs/webhooks)
- [DATABASE_DESIGN.md](../DATABASE_DESIGN.md) - 全体の DB 設計

---

**最終更新**: 2025 年 1 月（Stripe 連携版）  
**作成者**: AI Assistant  
**レビュー**: 上司フィードバック反映済み
