# LLM単価管理・コスト記録統合 実装報告書

作成日: 2026-06-11
対象システム: NeuraKnot（backend-go / frontend）
読者: 本件の経緯を知らないエンジニアリングマネージャ

---

## 0. エグゼクティブサマリ

LLM API のコスト計算が機能ごとにバラバラで、単価のハードコード・過去コストの可変性・課金と表示の数値不一致といった問題を抱えていた。本対応で以下を実現した。

- **単価の正本を DB（`llm_pricing` テーブル）に一本化**し、管理画面から登録・改定できるようにした（コード修正不要）。
- **コストは利用時点の単価で確定してスナップショット保存**し、後から単価を改定しても過去のコストが変わらないようにした（不変性の担保）。
- **トークン/コスト記録の経路を `UsageRecorder` 1本に集約**し、Handler の直書き SQL・ハードコード単価・デッドコードを全廃した。
- **分析・課金・上限判定がすべて同じ確定コストを参照**するようにし、数値の不一致を解消した。

影響範囲: backend-go（domain / usecase / handler / infrastructure / migration）、frontend（管理UI / 分析 / 課金 / チャット上限モーダル）。後方互換のための DB マイグレーション（`000010`）を含む。

---

## 1. 背景（対応前の状態）

| 経路                                   | 単価ソース                              | コスト永続化                         | 問題                             |
| -------------------------------------- | --------------------------------------- | ------------------------------------ | -------------------------------- |
| 1対1 / グループチャット                | なし                                    | `ai_chat_sessions.cost_usd` が常に 0 | 課金・分析に反映されない         |
| 質問候補生成                           | ハードコード `2.50 / 10.0`              | `token_usage`                        | モデル無関係・DB 未参照          |
| Analytics（統計画面）                  | 読み取り時に `llm_pricing` を都度再計算 | なし                                 | **単価変更で過去コストが変わる** |
| `BillingUseCase.RecordTokenUsage`      | `llm_pricing`（正しい）                 | `token_usage`                        | 呼び出し元ゼロ（デッドコード）   |
| `CheckTokenLimit` vs `GetCurrentUsage` | 不一致                                  | 前者は `token_usage` のみ            | 上限判定と表示の数字がズレる     |

要するに「いくら使ったか」が経路ごとに別計算で、しかも過去の数字が後から変わる状態だった。

---

## 2. 確定した要件・設計原則

1. **正本（Single Source of Truth）**: 単価は `llm_pricing`（入力/出力別・有効期間付き）。モデル定義 `llm_models` とは `provider + model` で論理結合し、カラムは統合しない。
2. **不変性（Immutability）**: コストは利用時に確定して `ai_chat_sessions` にスナップショット保存。分析は `SUM(cost_usd)` のみで、読み取り時の再計算をしない。
3. **単一記録経路**: 全トークン/コスト記録は `UsageRecorder`（新規 Usecase）経由。Handler の直書き SQL は禁止。
4. **版管理（Versioning）**: 単価変更はアクティブ行の上書きではなく「旧行を close（`effective_to` 設定＋`is_active=false`）＋新行 insert」。
5. **表示の完全 DB 化**: フロントのハードコード単価を全廃し、API/DB の値のみ表示。為替レートは単一定数を共有。

---

## 3. データモデル

### 3-1. `llm_pricing`（単価マスタ・履歴管理あり / 既存テーブル）

`000002_add_billing_system.up.sql` で定義済み。本件はこのテーブルを正本として活用する。

主なカラムと制約:

- `id UUID PK`
- `provider VARCHAR` / `model VARCHAR`
- `prompt_cost_per_1m DECIMAL(10,4)` / `completion_cost_per_1m DECIMAL(10,4)`（USD / 100万トークン）
- `effective_from TIMESTAMP NOT NULL`（適用開始） / `effective_to TIMESTAMP NULL`（NULL = 現在も有効）
- `is_active BOOLEAN`
- 制約: `UNIQUE(provider, model, effective_from)`、`provider IN ('openai','anthropic','google')`、`prompt/completion >= 0`
- インデックス: `is_active`(部分)、`(effective_from, effective_to)` など

「同一モデルに複数行（版）を持ち、有効期間で切り替える」構造である点が版管理の土台。

### 3-2. `ai_chat_sessions`（チャット1回 = 1行・コストスナップショット）

既存の `cost_usd` / `prompt_cost_per_1m` / `completion_cost_per_1m` に加え、本件で監査用に `pricing_id` を追加（`000010`）。

- `cost_usd`: このセッションの確定コスト（USD）
- `prompt_cost_per_1m` / `completion_cost_per_1m`: **利用時点の単価のスナップショット**
- `pricing_id UUID REFERENCES llm_pricing(id)`: どの単価行で確定したかの監査参照（任意・NULL可）

### 3-3. `token_usage`（ユーザー月次集計・補助利用専用）

セッション行を持たない補助利用（質問候補生成など）の月次ロールアップ。`cost_usd` を保持。

**重要な不変条件**: `ai_chat_sessions`（セッション）と `token_usage`（補助）は**データソースとして重複しない**。よって両者を合算しても二重計上は発生しない。

---

## 4. 記録ロジック（書き込み系の中核）

### 4-1. `UsageRecorder`（新規 Usecase）

ファイル: `backend-go/internal/usecase/usage/recorder.go`

依存: `LLMPricingRepository` / `ChatSessionRepository` / `TokenUsageRepository`

#### (a) `RecordSessionUsage(ctx, *ChatSession)` — チャット用

処理仕様:

1. `pricingRepo.FindEffectiveAt(provider, model, session.StartedAt)` で**`started_at` 時点に有効な単価**を取得。
   - `FindEffectiveAt` の SQL は `is_active = true AND effective_from <= at AND (effective_to IS NULL OR effective_to > at)` を `effective_from DESC LIMIT 1`。
   - **`started_at` 基準にすることで、未来の単価改定が過去の処理に誤適用されない**。

2. 単価が取れたら `session.ApplyPricing(pricingID, prompt, completion)` でコストを確定。
   - `CostUSD = TokensPrompt/1e6 * promptCost + TokensCompletion/1e6 * completionCost`
   - 単価とコストをセッションに焼き込む（スナップショット）。

3. `chatSessionRepo.Save(ctx, session)` で保存。

エラー方針（重要）:

- 単価が未登録、または取得時に DB エラーが出た場合でも、**トークン情報を失わないよう cost=0 のままセッションを保存し WARN ログを出す**（best-effort）。記録自体は止めない。

#### (b) `RecordAuxiliaryUsage(ctx, AuxiliaryUsageInput)` — 補助利用用

入力: `UserID / Provider / Model / Prompt / Completion`

処理仕様:

1. `FindEffectiveAt(provider, model, now)`（補助利用は「現時点」の単価）で `cost = pricing.CalculateCost(prompt, completion)` を計算。未登録時は cost=0＋WARN。
2. 当月の期間 `[月初(UTC), 翌月初)` で `token_usage` を検索。
3. 行が無ければ `NewTokenUsage` → `AddUsage` → `Create`、あれば `AddUsage` → `Update`（当月行に加算）。

### 4-2. 配線（全実行経路）

| ファイル                                                                              | 変更                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chat_usecase.go`（`SendMessage` / `relayAndHandleStream` / `SendAgentIntroduction`） | `chatSessionRepo.Save` → `usageRecorder.RecordSessionUsage`                                                                                                                              |
| `group_message_usecase.go`（`processMention`）                                        | 同上                                                                                                                                                                                     |
| `chat_handler.go` / `group_chat_handler.go`（`GenerateSuggestedQuestions`）           | 旧 `recordTokenUsage`（ハードコード単価＋直書きSQL）を削除し `usageRecorder.RecordAuxiliaryUsage` に置換（provider=`openai`, model=`gpt-4.1`、非同期 goroutine＋10秒タイムアウトで記録） |
| `router.go`                                                                           | `usage.NewRecorder(llmPricingRepo, chatSessionRepo, tokenUsageRepo)` を生成し chat/group の usecase・handler に注入                                                                      |

`BillingUseCase.RecordTokenUsage` は `UsageRecorder` に統合のうえ削除済み。

---

## 5. 読み取りロジック（分析・課金）

### 5-1. Analytics（`analytics_repository.go: GetTokenStats`）

**確定済みコストのみを集計**し、読み取り時の再計算はしない。

- セッション側（モデル別）:
  ```sql
  SELECT provider, model,
    SUM(tokens_total), SUM(tokens_prompt), SUM(tokens_completion),
    SUM(cost_usd) AS cost_usd,
    SUM(prompt_cost_per_1m * tokens_prompt) / NULLIF(SUM(tokens_prompt),0)         AS avg_prompt_cost,
    SUM(completion_cost_per_1m * tokens_completion) / NULLIF(SUM(tokens_completion),0) AS avg_completion_cost
  FROM ai_chat_sessions
  WHERE user_id = $1 AND status = 'completed' [AND started_at >= $2]
  GROUP BY provider, model
  ```
  `avg_*_cost` は**スナップショット単価のトークン加重平均**（フロントの表示用。再計算ではなく、保存済み単価の平均）。
- 補助利用側: `token_usage` を `SUM(cost_usd)` などで集計し、provider 内訳は `openai` に集約。
- 合算: `total_cost = セッション cost + 補助 cost`。JPY は `money.ConvertUSDToJPY`（単一定数）で換算。

削除した負債: `domain/analytics/pricing.go`（`PricingService` と `fallbackTable` のハードコード単価）と、それを使った読み取り時再計算。

### 5-2. Billing（`billing_usecase.go`）

- `GetCurrentUsage` → `GetCurrentUsageFromSessions` に委譲。当月の `ai_chat_sessions` と `token_usage` を**両方合算**して `TokensTotal / CostUSD / RequestCount` を返す。
- `CheckTokenLimit` も `GetCurrentUsage` を使用。判定は `remainingBudget = limits.MonthlyBudgetUSD - usage.CostUSD; canSend = remainingBudget > 0`。
  - **コストベース上限**であり、上限判定と画面表示が同一ロジック・同一数値になる。
  - サブスク機能 OFF の場合は常に許可（Max 相当）。

---

## 6. 単価管理 API（CRUD・版管理）

### 6-1. Usecase（`usecase/llmpricing/usecase.go`）

依存: `LLMPricingRepository` / `llmmodel.Repository`

| メソッド                                                             | 仕様                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GetCurrentPricing(provider, model)`                                 | `FindEffectiveAt(now)`。無ければ `ErrPricingNotFound`                                                                                                                                                                        |
| `ListCurrentPricing()`                                               | `ListActive()`（`provider, model, effective_from DESC`）を走査し、各 `provider+model` の**先頭＝最新有効版のみ**を返す                                                                                                       |
| `CreateInitialPricing(provider, model, prompt, completion, notes)`   | ①`llm_models` に存在チェック（無ければ `ErrModelNotRegistered`）→②既に有効単価があれば `ErrPricingAlreadyExists`→③`NewLLMPricing(...)`＋`Create`                                                                             |
| `RevisePricing(currentID, prompt, completion, effectiveFrom, notes)` | ①対象行取得（無ければ `ErrPricingNotFound`）→②旧行 `Deactivate(effectiveFrom)`（`effective_to=effectiveFrom, is_active=false`）＋`Update`→③同 provider/model で新行 `Create`。**アクティブ行の in-place 書き換えは行わない** |
| `ListPricingHistory(provider, model)`                                | `ListAll()` を provider/model で絞り込み                                                                                                                                                                                     |
| `DeactivatePricing(id)`                                              | `Deactivate(now)` ＋ `Update`（論理無効化）                                                                                                                                                                                  |

エラー型: `ErrModelNotRegistered` / `ErrPricingNotFound` / `ErrPricingAlreadyExists`。

ドメイン制約（`domain/billing/llm_pricing.go`）: `NewLLMPricing` は provider/model 必須・コスト非負を検証。`Deactivate` は `effective_to >= effective_from` を検証。

### 6-2. HTTP エンドポイント

ハンドラ: `llm_pricing_handler.go`、エラー→HTTP は `mapPricingErrorStatus`（NotFound=404 / AlreadyExists=409 / NotRegistered=400 / その他=500）。

| メソッド & パス                                          | 権限                   | 用途                           | 主なリクエスト                                                        | 成功時                       |
| -------------------------------------------------------- | ---------------------- | ------------------------------ | --------------------------------------------------------------------- | ---------------------------- |
| `GET /api/v1/llm-pricing`                                | 認証ユーザー           | 現行単価一覧（分析の料金表用） | -                                                                     | 200 `{pricing:[...], total}` |
| `POST /api/v1/admin/llm-pricing`                         | 管理（暫定: 認証のみ） | 初回単価登録                   | `provider, model, prompt_cost_per_1m, completion_cost_per_1m, notes?` | 201 単価                     |
| `POST /api/v1/admin/llm-pricing/:id/revise`              | 管理                   | 単価改定（版追加）             | `prompt_cost_per_1m, completion_cost_per_1m, effective_from?, notes?` | 201 新単価                   |
| `GET /api/v1/admin/llm-pricing/history?provider=&model=` | 管理                   | 履歴参照                       | query                                                                 | 200 一覧                     |
| `PATCH /api/v1/admin/llm-pricing/:id/deactivate`         | 管理                   | 論理無効化                     | -                                                                     | 204                          |

> 注: 現状の管理系は `RequireAuth()` のみ（RBAC は未導入）。本番運用前に管理者制限の追加を推奨（残課題）。

### 6-3. モデル作成との orchestration

`llm_model_handler.go: CreateModel` は任意の初回単価（`initial_prompt_cost_per_1m` / `initial_completion_cost_per_1m`）を受け取り、

1. モデルを作成 → 2. 単価が指定されていれば `CreateInitialPricing` を呼ぶ → 3. **単価作成に失敗したら作成済みモデルを `DeleteModel` でロールバック**（疑似トランザクション）。
   成功時はレスポンスに作成した `current_pricing` を含める。

`ListModels` は `ListCurrentPricing` を JOIN 相当でマージし、各モデルに `current_pricing` を付与して返す（`ToLLMModelsResponseWithPricing`）。

---

## 7. 管理 UI（`frontend/components/admin/LLMModelsAdminModalClient.tsx`）

- 作成/編集モーダルに**入力単価・出力単価**（USD/1Mトークン）フィールドを追加。
- バリデーション（`parsePricing`）: 両方空 = 単価なし（任意）。片方だけ = エラー。負数/非数値 = エラー。
- **作成時**: モデル＋初回単価を1リクエストで保存（バックエンド orchestration）。レスポンスの `current_pricing` を画面状態へ反映。
- **編集時のロジック**:
  - 単価が現行値と異なる場合のみ動作。
  - 既存単価あり → `reviseLLMPricing`（改定前に「過去コストには影響しません」確認ダイアログ）。
  - 既存単価なし → `createLLMPricing`。
  - 同値 → 何もしない。
- カード: 単価未設定モデルに警告バッジ＋「未設定」表示。詳細に現行単価（入力/出力）を表示。

Server Actions（`frontend/lib/actions/llm-models.ts`）: `listLLMPricing` / `createLLMPricing` / `reviseLLMPricing` を追加。`createLLMModel` は `initial_*` を受け付ける。

---

## 8. フロントエンド表示の DB 化

- **`TokenStatsSection.tsx`**: ハードコード `MODEL_PRICING` を全廃。料金表は `GET /api/v1/llm-pricing` から取得し provider 別に表示。モデル別内訳は API の `estimated_cost_usd` と、セッションスナップショット由来の `avg_prompt_cost_per_1m` / `avg_completion_cost_per_1m` を使用。
- **Analytics レスポンス拡張**: `TokensByModelResponse`（`response/analytics.go`）と `TokensByModel`（`types/analytics.ts`）に `avg_prompt_cost_per_1m` / `avg_completion_cost_per_1m` を追加。
- **為替の共通化**: `frontend/lib/utils/currency.ts` に `USD_TO_JPY_RATE = 150` と `convertUsdToJpy()`。`SubscriptionClient.tsx`・`TokenStatsSection.tsx` が参照。バックエンドは `backend-go/pkg/money/exchange.go`（同値 150）。
- **`TokenLimitModal.tsx`**: トークンベース → **コストベース**（¥使用額 / ¥上限、%）に刷新。プラン文言は `getTiers()` の `monthly_budget_usd` / `price_jpy` から動的生成。呼び出し元 `AIChatWindow.tsx` / `GroupChatWindow.tsx` は `check-limit` レスポンスの `cost_usd` / `budget_limit_usd` を渡すよう修正（旧コードは存在しない `tokens_limit` を参照しており実質バグだったため解消）。

---

## 9. データ移行（`migrations/000010_unify_cost_snapshot`）

up:

1. `ai_chat_sessions.pricing_id UUID REFERENCES llm_pricing(id)` を追加＋インデックス。
2. **バックフィル（1回限り）**: `tokens_total > 0 AND COALESCE(cost_usd,0)=0` の行を対象に、`LATERAL` サブクエリで `started_at` 時点に有効な単価を最優先（無ければ最新有効版にフォールバック: `ORDER BY (effective_from <= started_at) DESC, effective_from DESC LIMIT 1`）して `cost_usd` と単価スナップショットと `pricing_id` を埋める。
3. **整合性検証**: `llm_models` にあって有効 `llm_pricing` が無いモデルを `RAISE WARNING` で列挙（移行は失敗させない）。

down: `pricing_id` 列とインデックスを削除。

移行完了条件: `SELECT COUNT(*) FROM ai_chat_sessions WHERE tokens_total > 0 AND cost_usd = 0` が 0（単価未登録モデルは例外として WARNING で可視化）。

---

## 10. 削除した技術的負債

| 対象                                                   | 場所                                                                                                                                       | 状態                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| ハードコード単価 `2.50 / 10.0`                         | `chat_handler.go`, `group_chat_handler.go`                                                                                                 | 削除済                               |
| Handler 直書き `token_usage` SQL（`recordTokenUsage`） | 同上                                                                                                                                       | 削除済                               |
| `MODEL_PRICING`                                        | `TokenStatsSection.tsx`                                                                                                                    | 削除済                               |
| `fallbackTable` / `PricingService`                     | `domain/analytics/pricing.go`(+test)                                                                                                       | ファイルごと削除                     |
| 読み取り時再計算                                       | `analytics_repository.go`                                                                                                                  | 削除済（`SUM(cost_usd)` へ）         |
| `RecordTokenUsage`（デッドコード）                     | `billing_usecase.go`                                                                                                                       | 削除済                               |
| `PATCH /admin/llm-models/:id/range` 一式               | router / handler / request DTO / usecase `UpdateModelRange` / domain interface・persistence `UpdateRange` / フロント `updateLLMModelRange` | 全削除（全項目編集に統合済みのため） |

---

## 11. テスト

新規ユニットテスト（`go test ./...` 全パス）:

- `usecase/usage/recorder_test.go`:
  - 単価ありでスナップショット適用（100万＋100万トークン×単価2/8 → cost=10.0、`pricing_id` 設定）。
  - 単価なしで cost=0 のまま保存。
  - **`started_at` 基準**で改定前は旧単価・改定後は新単価が適用される。
  - 単価取得が DB エラーでもセッションは保存される。
- `usecase/llmpricing/usecase_test.go`:
  - 未登録モデルは `ErrModelNotRegistered`。
  - 既に有効単価があれば `ErrPricingAlreadyExists`。
  - `RevisePricing` が旧行を `is_active=false`＋`effective_to=effectiveFrom` で close し、新行を作成（provider/model 継承）。
  - 存在しない ID は `ErrPricingNotFound`。

検証結果: backend `go build` / `go test` / `go vet` クリーン。frontend は編集ファイルに型/リントエラーなし（`tsc` の他のエラーは本件と無関係の既存問題）。

---

## 12. 既知の制約・残課題

1. **管理 API の権限**: `/admin/llm-*` は現状 `RequireAuth()` のみで RBAC 未導入。本番前に管理者制限が必要。
2. **モデル作成 + 初回単価の原子性**: DB トランザクションではなく「失敗時にモデルを削除する best-effort ロールバック」。削除自体が失敗すると孤立モデルが残り得る（要監視 or 将来トランザクション化）。
3. **補助利用の provider/model 固定**: 質問候補生成は `openai/gpt-4.1` 固定で記録。実際に使うモデルが変わる場合は引数化が必要。
4. **為替レート 150 固定**: 定数共有はしたが固定値。変動対応は別途。
5. **単価未登録時の方針**: 設計上は「拒否」が理想だが、記録欠落を避けるため現状は cost=0＋WARN で記録継続（移行を優先した暫定）。バックフィル運用が落ち着いたら拒否方針への切替を検討。
6. **手動検証チェックリスト**（アプリ＋DB 起動が必要なため未実行）:
   - 管理画面でモデル作成＋単価設定 → チャット → 分析にコスト反映。
   - 単価改定 → 過去コスト不変・新規チャットのみ新単価。
   - 質問候補生成が DB 単価で記録される。
   - サブスク画面と上限モーダルの数字一致。

7. **ドキュメント同期（未実施）**: `BILLING_SYSTEM_IMPLEMENTATION.md` 追記、Swagger（admin pricing）注釈。

---

## 13. 運用手順（モデル追加 → 課金反映まで）

1. 管理画面「LLMモデル」でモデルを作成し、同画面で入力/出力単価を設定（1保存で `llm_models` ＋ `llm_pricing` が作られる）。
2. エージェントがそのモデルでチャットすると、`UsageRecorder` が `started_at` 時点の単価でコストを確定し `ai_chat_sessions` に保存。
3. 統計・分析画面、サブスク画面、上限モーダルすべてが同じ確定コストを参照。
4. 単価を変えるときは編集モーダルから「改定」（旧行 close ＋ 新行 insert）。過去のセッションコストは不変、以降の新規チャットのみ新単価。

---

（以上）
