# BridgeSpeak 課金システム設計書

## 📋 目次

1. [概要](#概要)
2. [課金モデル](#課金モデル)
3. [テーブル設計](#テーブル設計)
4. [データフロー](#データフロー)
5. [重要なクエリ](#重要なクエリ)
6. [実装ガイド](#実装ガイド)
7. [運用ガイド](#運用ガイド)

---

## 概要

### 課金システムの目的

BridgeSpeak の課金システムは、以下の要件を満たすように設計されています：

- ✅ **利益率の確保**：LLM API の原価を上回る収益を保証
- ✅ **シンプルな運用**：複雑な機能を排除し、保守しやすい設計
- ✅ **ユーザー体験**：明確な料金体系で安心して利用できる
- ✅ **スケーラビリティ**：将来的な機能拡張に対応可能

### 設計方針

1. **既存テーブルの活用**：新規テーブルは最小限に抑える
2. **トークンベース**：すべての課金計算をトークン数で統一
3. **リアルタイム追跡**：使用量をリアルタイムで記録・集計
4. **透明性**：原価と販売価格を明確に分離して記録

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

| モデル           | メリット           | デメリット                 | BridgeSpeak 採用 |
| ---------------- | ------------------ | -------------------------- | ---------------- |
| 完全従量課金     | 公平、参入障壁低い | 収益不安定、ユーザーが躊躇 | ❌               |
| 完全定額         | 収益安定、使い放題 | ヘビーユーザーでコスト圧迫 | ❌               |
| **ハイブリッド** | バランスが良い     | 実装やや複雑               | ✅ **採用**      |
| プリペイド       | 前払いで確実       | ユーザー体験が悪い         | ❌               |

---

## テーブル設計

### アーキテクチャ概要

```
既存テーブル（活用）:
├── users（ユーザー情報）
├── ai_agents（AI分身）
└── ai_chat_sessions（AI処理履歴）← カラム追加

新規テーブル（最小限）:
├── llm_pricing（LLMモデル料金マスタ）
├── subscription_plans（プラン定義）
└── user_subscriptions（ユーザー契約状態）
```

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

### 2. subscription_plans（プラン定義）

**目的**：Free、Basic、Pro の 3 プランを定義

```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- プラン識別子
    plan_code VARCHAR(50) UNIQUE NOT NULL,      -- 'free', 'basic', 'pro'

    -- 表示名
    name VARCHAR(100) NOT NULL,                 -- 'Free', 'Basic', 'Pro'
    description TEXT,                           -- プランの説明

    -- 料金（円）
    monthly_price_jpy INTEGER NOT NULL,         -- 月額料金

    -- トークン制限
    monthly_token_limit INTEGER NOT NULL,       -- 月間トークン上限（-1=無制限）

    -- 超過料金（円/1000トークン、0なら超過不可）
    overage_price_per_1k_tokens DECIMAL(8, 4) DEFAULT 0,

    -- 機能制限
    max_ai_agents INTEGER NOT NULL DEFAULT 1,   -- 作成可能なAI分身数
    allowed_providers TEXT[] NOT NULL DEFAULT ARRAY['openai'],  -- 利用可能なプロバイダー

    -- 有効フラグ
    is_active BOOLEAN DEFAULT true,

    -- 表示順序
    display_order INTEGER DEFAULT 0,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active, display_order);
```

#### 初期データ（3 プラン）

```sql
INSERT INTO subscription_plans (
    plan_code, name, description,
    monthly_price_jpy, monthly_token_limit, overage_price_per_1k_tokens,
    max_ai_agents, allowed_providers, display_order
) VALUES
-- Freeプラン
('free', 'Free', '無料で始める',
 0, 100000, 0,  -- 超過不可
 1, ARRAY['openai'], 1),

-- Basicプラン
('basic', 'Basic', '個人利用向け',
 980, 1000000, 0.5,  -- 超過時：1000トークン=0.5円
 3, ARRAY['openai'], 2),

-- Proプラン
('pro', 'Pro', 'ヘビーユーザー向け',
 2980, 5000000, 0.3,  -- 超過時：1000トークン=0.3円
 10, ARRAY['openai', 'anthropic', 'google'], 3);
```

#### 重要ポイント

- **シンプル**：3 プランのみで管理しやすい
- **拡張性**：後から Enterprise プランを追加可能
- **制限管理**：プランごとに機能制限を柔軟に設定

---

### 3. user_subscriptions（ユーザー契約状態）

**目的**：各ユーザーの現在の契約とトークン使用量を追跡

```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ユーザー
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- プラン
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),

    -- ステータス
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    -- 'active': 利用中
    -- 'cancelled': 解約済み（期間終了まで利用可能）
    -- 'expired': 期限切れ

    -- 契約期間
    period_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    period_end TIMESTAMP NOT NULL,              -- この日時に次期間へ更新

    -- 今期の使用量（トークン数）
    tokens_used_current_period INTEGER DEFAULT 0,

    -- 解約情報
    cancelled_at TIMESTAMP,

    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_subscription_status CHECK (
        status IN ('active', 'cancelled', 'expired')
    )
);

-- インデックス
CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id, status);
CREATE INDEX idx_user_subscriptions_period_end ON user_subscriptions(period_end)
    WHERE status = 'active';

-- 1ユーザー1アクティブサブスクリプション
CREATE UNIQUE INDEX unique_active_subscription ON user_subscriptions(user_id)
    WHERE status = 'active';

-- トリガー：updated_at自動更新
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 重要ポイント

- **リアルタイム使用量**：`tokens_used_current_period`で現在の使用量を追跡
- **期間管理**：`period_end`で自動更新のタイミングを管理
- **制約**：1 ユーザーは 1 つのアクティブサブスクリプションのみ

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

## データフロー

### 1. ユーザー登録時

```
ユーザー登録
    ↓
usersテーブルに追加
    ↓
user_subscriptionsにFreeプランを自動作成
    ├── plan_id: Free プランのID
    ├── status: 'active'
    ├── period_start: 現在時刻
    ├── period_end: 1ヶ月後
    └── tokens_used_current_period: 0
```

### 2. AI 処理実行時

```
ユーザーがAIにメッセージ送信
    ↓
【Backend-go】
├── 1. アクティブなサブスクリプションを取得
│   └── user_subscriptions WHERE user_id = ? AND status = 'active'
│
├── 2. トークン制限チェック
│   └── IF tokens_used >= monthly_token_limit THEN
│       ├── overage_price > 0 なら継続（超過課金）
│       └── overage_price = 0 なら制限エラー
│
├── 3. プラン制限チェック
│   └── IF provider NOT IN allowed_providers THEN エラー
│
├── 4. AI処理実行（Backend-pythonへ）
│   └── LLM API呼び出し → トークン数取得
│
├── 5. 料金計算
│   ├── llm_pricing から料金情報取得
│   │   └── WHERE provider = ? AND model = ? AND is_active = true
│   │
│   ├── 原価計算
│   │   └── cost = (tokens_prompt / 1000 * cost_per_1k_prompt_tokens) +
│   │              (tokens_completion / 1000 * cost_per_1k_completion_tokens)
│   │
│   └── 販売価格計算
│       └── price = (tokens_prompt / 1000 * price_per_1k_prompt_tokens) +
│                   (tokens_completion / 1000 * price_per_1k_completion_tokens)
│
├── 6. ai_chat_sessionsに記録
│   ├── tokens_prompt, tokens_completion, tokens_total
│   ├── cost_usd, price_usd
│   └── pricing_id
│
└── 7. user_subscriptionsの使用量更新
    └── UPDATE user_subscriptions
        SET tokens_used_current_period = tokens_used_current_period + tokens_total
        WHERE id = ?
```

### 3. 月次処理（バッチ）

```
【毎日実行するバッチ】

期限切れサブスクリプションの検出
    ↓
WHERE period_end < CURRENT_TIMESTAMP AND status = 'active'
    ↓
各サブスクリプションについて:
    ├── cancelled_at が NULL なら
    │   ├── 次の期間を作成
    │   │   ├── period_start = 旧period_end
    │   │   ├── period_end = period_start + 1ヶ月
    │   │   └── tokens_used_current_period = 0（リセット）
    │   │
    │   └── （決済処理）
    │       ├── 基本料金：monthly_price_jpy
    │       └── 超過料金：tokens_overage * overage_price_per_1k_tokens / 1000
    │
    └── cancelled_at が設定されているなら
        └── status = 'expired' に更新（サービス停止）
```

### 4. プラン変更時

```
ユーザーがプラン変更を申請
    ↓
【アップグレードの場合】
├── 即座に新プランに変更
├── 使用量はそのまま引き継ぐ
└── 差額を日割り計算して請求（オプション）

【ダウングレードの場合】
├── cancelled_at を設定
├── status = 'cancelled'（期間終了まで利用可能）
└── period_end 時に新プランで再作成
```

---

## 重要なクエリ

### 1. ユーザーの現在の使用状況を取得

```sql
SELECT
    u.id as user_id,
    u.email,
    u.display_name,
    sp.name as plan_name,
    sp.monthly_price_jpy,
    sp.monthly_token_limit,
    us.tokens_used_current_period,
    sp.monthly_token_limit - us.tokens_used_current_period as tokens_remaining,
    ROUND(
        (us.tokens_used_current_period::DECIMAL /
         NULLIF(sp.monthly_token_limit, 0) * 100), 2
    ) as usage_percent,
    us.period_start,
    us.period_end,
    us.status
FROM user_subscriptions us
JOIN users u ON us.user_id = u.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE
    us.user_id = $1 AND
    us.status = 'active';
```

**用途**：ダッシュボードで表示、API レスポンス

---

### 2. 制限に近づいているユーザーを抽出（アラート用）

```sql
SELECT
    u.id,
    u.email,
    sp.name as plan_name,
    us.tokens_used_current_period,
    sp.monthly_token_limit,
    ROUND(
        (us.tokens_used_current_period::DECIMAL / sp.monthly_token_limit * 100), 2
    ) as usage_percent
FROM user_subscriptions us
JOIN users u ON us.user_id = u.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE
    us.status = 'active' AND
    sp.monthly_token_limit > 0 AND  -- 無制限プランを除外
    us.tokens_used_current_period >= sp.monthly_token_limit * 0.8  -- 80%以上
ORDER BY usage_percent DESC;
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

---

### 5. ユーザーごとの月間コスト（上位 100 人）

```sql
SELECT
    u.email,
    sp.name as plan_name,
    COUNT(s.id) as request_count,
    SUM(s.tokens_total) as total_tokens,
    ROUND(SUM(s.cost_usd)::NUMERIC, 4) as total_cost_usd,
    ROUND(SUM(s.price_usd)::NUMERIC, 4) as total_revenue_usd,
    ROUND(SUM(s.price_usd - s.cost_usd)::NUMERIC, 4) as total_profit_usd
FROM ai_chat_sessions s
JOIN users u ON s.user_id = u.id
JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE
    DATE_TRUNC('month', s.started_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP) AND
    s.status = 'completed'
GROUP BY u.id, u.email, sp.name
ORDER BY total_cost_usd DESC
LIMIT 100;
```

**用途**：コストがかかっているユーザーの特定、プラン提案

---

### 6. 期限切れサブスクリプションの検出（バッチ用）

```sql
SELECT
    us.id,
    us.user_id,
    u.email,
    us.period_end,
    us.cancelled_at
FROM user_subscriptions us
JOIN users u ON us.user_id = u.id
WHERE
    us.status = 'active' AND
    us.period_end < CURRENT_TIMESTAMP
ORDER BY us.period_end;
```

**用途**：日次バッチで実行、期間更新処理

---

## 実装ガイド

### フェーズ 1：テーブル作成

#### 1-1. マイグレーションファイルの作成

```bash
# backend-go/schema/migrations/ に作成
touch 000010_create_billing_tables.up.sql
touch 000010_create_billing_tables.down.sql
```

#### 1-2. up.sql の内容

```sql
-- llm_pricing テーブル作成
CREATE TABLE llm_pricing (...);

-- subscription_plans テーブル作成
CREATE TABLE subscription_plans (...);

-- user_subscriptions テーブル作成
CREATE TABLE user_subscriptions (...);

-- ai_chat_sessions の拡張
ALTER TABLE ai_chat_sessions
    ADD COLUMN cost_usd DECIMAL(10, 6),
    ADD COLUMN price_usd DECIMAL(10, 6),
    ADD COLUMN pricing_id UUID REFERENCES llm_pricing(id) ON DELETE SET NULL;

-- 初期データ投入
INSERT INTO llm_pricing (...);
INSERT INTO subscription_plans (...);
```

#### 1-3. down.sql の内容（ロールバック用）

```sql
-- 逆順で削除
ALTER TABLE ai_chat_sessions
    DROP COLUMN pricing_id,
    DROP COLUMN price_usd,
    DROP COLUMN cost_usd;

DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS llm_pricing CASCADE;
```

---

### フェーズ 2：Backend-go 実装

#### 2-1. ドメイン層（internal/domain/billing/）

```go
// pricing.go
package billing

type LLMPricing struct {
    ID                            uuid.UUID
    Provider                      string
    Model                         string
    CostPer1kPromptTokens         float64
    CostPer1kCompletionTokens     float64
    PricePer1kPromptTokens        float64
    PricePer1kCompletionTokens    float64
    IsActive                      bool
}

func (p *LLMPricing) CalculateCost(promptTokens, completionTokens int) float64 {
    return (float64(promptTokens) / 1000.0 * p.CostPer1kPromptTokens) +
           (float64(completionTokens) / 1000.0 * p.CostPer1kCompletionTokens)
}

func (p *LLMPricing) CalculatePrice(promptTokens, completionTokens int) float64 {
    return (float64(promptTokens) / 1000.0 * p.PricePer1kPromptTokens) +
           (float64(completionTokens) / 1000.0 * p.PricePer1kCompletionTokens)
}
```

```go
// subscription.go
package billing

type SubscriptionPlan struct {
    ID                        uuid.UUID
    PlanCode                  string
    Name                      string
    MonthlyPriceJPY           int
    MonthlyTokenLimit         int
    OveragePricePer1kTokens   float64
    MaxAIAgents               int
    AllowedProviders          []string
}

type UserSubscription struct {
    ID                       uuid.UUID
    UserID                   uuid.UUID
    PlanID                   uuid.UUID
    Status                   string
    PeriodStart              time.Time
    PeriodEnd                time.Time
    TokensUsedCurrentPeriod  int
    CancelledAt              *time.Time
}

func (s *UserSubscription) IsOverLimit(plan *SubscriptionPlan) bool {
    if plan.MonthlyTokenLimit == -1 {
        return false // 無制限
    }
    return s.TokensUsedCurrentPeriod >= plan.MonthlyTokenLimit
}

func (s *UserSubscription) CanUseProvider(plan *SubscriptionPlan, provider string) bool {
    for _, p := range plan.AllowedProviders {
        if p == provider {
            return true
        }
    }
    return false
}
```

#### 2-2. リポジトリ層（internal/infrastructure/persistence/）

```go
// billing_repository.go
package persistence

type BillingRepository struct {
    db *sql.DB
}

func (r *BillingRepository) GetActivePricing(ctx context.Context, provider, model string) (*billing.LLMPricing, error) {
    // SELECT ... FROM llm_pricing WHERE provider = ? AND model = ? AND is_active = true
}

func (r *BillingRepository) GetActiveSubscription(ctx context.Context, userID uuid.UUID) (*billing.UserSubscription, *billing.SubscriptionPlan, error) {
    // JOIN query to get both subscription and plan
}

func (r *BillingRepository) UpdateTokenUsage(ctx context.Context, subscriptionID uuid.UUID, tokensUsed int) error {
    // UPDATE user_subscriptions SET tokens_used_current_period = tokens_used_current_period + ?
}
```

#### 2-3. ユースケース層（internal/usecase/billing/）

```go
// billing_usecase.go
package billing

type BillingUsecase struct {
    billingRepo BillingRepository
}

// CheckAndRecordUsage AI処理前に制限チェックし、処理後に記録
func (u *BillingUsecase) CheckAndRecordUsage(
    ctx context.Context,
    userID uuid.UUID,
    provider, model string,
    promptTokens, completionTokens int,
) error {
    // 1. サブスクリプション取得
    subscription, plan, err := u.billingRepo.GetActiveSubscription(ctx, userID)
    if err != nil {
        return err
    }

    // 2. プロバイダー制限チェック
    if !subscription.CanUseProvider(plan, provider) {
        return errors.New("このプランでは利用できないプロバイダーです")
    }

    // 3. トークン制限チェック
    totalTokens := promptTokens + completionTokens
    if subscription.IsOverLimit(plan) && plan.OveragePricePer1kTokens == 0 {
        return errors.New("月間トークン制限に達しました")
    }

    // 4. 料金情報取得
    pricing, err := u.billingRepo.GetActivePricing(ctx, provider, model)
    if err != nil {
        return err
    }

    // 5. コスト・価格計算
    cost := pricing.CalculateCost(promptTokens, completionTokens)
    price := pricing.CalculatePrice(promptTokens, completionTokens)

    // 6. ai_chat_sessionsに記録（別のユースケースから呼ばれる想定）
    // 7. user_subscriptionsの使用量更新
    if err := u.billingRepo.UpdateTokenUsage(ctx, subscription.ID, totalTokens); err != nil {
        return err
    }

    return nil
}
```

---

### フェーズ 3：API 実装

#### 3-1. ハンドラー層（internal/handler/http/）

```go
// billing_handler.go
package http

// GET /api/v1/billing/usage/current
func (h *BillingHandler) GetCurrentUsage(c *gin.Context) {
    userID := c.GetString("user_id") // 認証ミドルウェアから取得

    usage, err := h.billingUsecase.GetCurrentUsage(ctx, userID)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }

    c.JSON(200, gin.H{
        "plan_name": usage.PlanName,
        "tokens_used": usage.TokensUsed,
        "tokens_limit": usage.TokensLimit,
        "tokens_remaining": usage.TokensRemaining,
        "usage_percent": usage.UsagePercent,
        "period_end": usage.PeriodEnd,
    })
}

// GET /api/v1/billing/plans
func (h *BillingHandler) GetPlans(c *gin.Context) {
    plans, err := h.billingUsecase.GetAllPlans(ctx)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }

    c.JSON(200, plans)
}

// POST /api/v1/billing/subscription/change
func (h *BillingHandler) ChangePlan(c *gin.Context) {
    var req struct {
        PlanCode string `json:"plan_code"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    userID := c.GetString("user_id")

    if err := h.billingUsecase.ChangePlan(ctx, userID, req.PlanCode); err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }

    c.JSON(200, gin.H{"message": "プランを変更しました"})
}
```

---

### フェーズ 4：Frontend 実装

#### 4-1. 使用量表示コンポーネント

```typescript
// components/billing/UsageDisplay.tsx
interface UsageData {
  planName: string;
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
  usagePercent: number;
  periodEnd: string;
}

export function UsageDisplay() {
  const { data } = useSWR<UsageData>("/api/v1/billing/usage/current");

  return (
    <div>
      <h3>今月の使用量</h3>
      <p>プラン: {data?.planName}</p>
      <ProgressBar value={data?.usagePercent} />
      <p>
        {data?.tokensUsed.toLocaleString()} /{" "}
        {data?.tokensLimit.toLocaleString()} トークン
      </p>
      <p>残り: {data?.tokensRemaining.toLocaleString()} トークン</p>
      <p>更新日: {new Date(data?.periodEnd).toLocaleDateString()}</p>
    </div>
  );
}
```

---

## 運用ガイド

### 日次バッチ処理

#### 実行内容

1. **期限切れサブスクリプションの更新**
2. **使用量アラートの送信**
3. **コスト集計レポートの生成**

#### 実装例

```go
// scripts/daily_billing_batch.go
func main() {
    // 1. 期限切れサブスクリプションを取得
    expiredSubs := getExpiredSubscriptions()

    for _, sub := range expiredSubs {
        if sub.CancelledAt == nil {
            // 自動更新
            renewSubscription(sub)
        } else {
            // 解約済み → expired に変更
            expireSubscription(sub)
        }
    }

    // 2. 使用量アラート
    highUsageUsers := getUsersNearLimit()
    for _, user := range highUsageUsers {
        sendUsageAlert(user)
    }

    // 3. 日次レポート生成
    generateDailyReport()
}
```

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

### プラン料金の変更手順

#### 既存ユーザーへの影響を考慮

```sql
-- 1. 新しいプランを作成（別のplan_codeで）
INSERT INTO subscription_plans (
    plan_code, name, description,
    monthly_price_jpy, monthly_token_limit, overage_price_per_1k_tokens,
    max_ai_agents, allowed_providers, display_order
) VALUES (
    'basic_v2', 'Basic', '個人利用向け（新料金）',
    1280, 1000000, 0.5,
    3, ARRAY['openai'], 2
);

-- 2. 旧プランを非表示に（既存ユーザーは継続可能）
UPDATE subscription_plans
SET is_visible = false
WHERE plan_code = 'basic';

-- 3. 既存ユーザーは次回更新時に新プランへ移行
```

### モニタリング

#### 監視すべき指標

1. **全体の利益率**

   - 目標：30%以上
   - アラート：20%を下回ったら通知

2. **プランごとの収益**

   - Free ユーザーのコスト
   - 有料プランの収益

3. **モデル別のコスト**

   - どのモデルが多く使われているか
   - 利益率の低いモデルはないか

4. **ヘビーユーザーの特定**
   - コスト Top100
   - プラン提案の自動化

---

## FAQ

### Q1: ユーザー登録時に Free プランを自動作成するには？

```go
// ユーザー作成時にトリガーまたはアプリケーション層で実行
func CreateUserWithFreeSubscription(ctx context.Context, user *User) error {
    tx, _ := db.BeginTx(ctx, nil)
    defer tx.Rollback()

    // 1. ユーザー作成
    if err := createUser(tx, user); err != nil {
        return err
    }

    // 2. Freeプランを取得
    freePlan, err := getPlanByCode(tx, "free")
    if err != nil {
        return err
    }

    // 3. サブスクリプション作成
    subscription := &UserSubscription{
        UserID:      user.ID,
        PlanID:      freePlan.ID,
        Status:      "active",
        PeriodStart: time.Now(),
        PeriodEnd:   time.Now().AddDate(0, 1, 0), // 1ヶ月後
        TokensUsedCurrentPeriod: 0,
    }

    if err := createSubscription(tx, subscription); err != nil {
        return err
    }

    return tx.Commit()
}
```

### Q2: 超過料金はどう計算する？

```go
func CalculateOverageCost(
    plan *SubscriptionPlan,
    tokensUsed int,
) float64 {
    if plan.MonthlyTokenLimit == -1 {
        return 0 // 無制限
    }

    overageTokens := tokensUsed - plan.MonthlyTokenLimit
    if overageTokens <= 0 {
        return 0 // 制限内
    }

    // 超過料金 = (超過トークン数 / 1000) * 超過単価
    return float64(overageTokens) / 1000.0 * plan.OveragePricePer1kTokens
}
```

### Q3: 利益率が低いモデルの使用を制限するには？

```sql
-- Freeプランでは低コストモデルのみ許可
UPDATE subscription_plans
SET allowed_providers = ARRAY['openai']
WHERE plan_code = 'free';

-- アプリケーション層でさらに細かく制御
-- allowed_models: ['gpt-4o-mini'] のようなカラムを追加
```

### Q4: 日割り計算は必要？

**推奨：シンプルにするため日割り計算は不要**

- アップグレード：即座に反映、差額は次回請求時に調整
- ダウングレード：期間終了時に変更

日割りが必要な場合：

```go
func CalculateProration(
    oldPrice, newPrice int,
    periodStart, changeDate, periodEnd time.Time,
) int {
    totalDays := periodEnd.Sub(periodStart).Hours() / 24
    remainingDays := periodEnd.Sub(changeDate).Hours() / 24

    oldRefund := int(float64(oldPrice) * (remainingDays / totalDays))
    newCharge := int(float64(newPrice) * (remainingDays / totalDays))

    return newCharge - oldRefund
}
```

---

## まとめ

### このシステムの強み

✅ **シンプル**：テーブル 3 つ追加、既存 1 つ拡張のみ  
✅ **利益保証**：DB 制約で販売価格 ≥ 原価を強制  
✅ **透明性**：原価と売上を完全に分離して記録  
✅ **拡張性**：後から機能追加が容易  
✅ **運用容易**：3 プランのみで管理しやすい

### 実装優先度

1. **フェーズ 1（必須）**：テーブル作成、初期データ投入
2. **フェーズ 2（必須）**：Backend-go のドメイン・リポジトリ層
3. **フェーズ 3（必須）**：使用量チェック・記録ロジック
4. **フェーズ 4（推奨）**：Frontend 実装、ダッシュボード
5. **フェーズ 5（後回し OK）**：バッチ処理、アラート、決済連携

### 関連ドキュメント

- [DATABASE_DESIGN.md](../DATABASE_DESIGN.md) - 全体の DB 設計
- [DATABASE_DESIGN_MVP.md](../DATABASE_DESIGN_MVP.md) - MVP 版 DB 設計
- マイグレーションファイル: `backend-go/schema/migrations/`

---

**最終更新**: 2024 年 12 月  
**作成者**: AI Assistant  
**レビュー**: 要レビュー
