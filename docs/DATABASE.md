# データベース設計書

## 概要

NeuraKnot は **PostgreSQL 15** を使用し、**Backend-go のみ**がデータベースにアクセスします。本番環境では AWS RDS (Multi-AZ) を使用し、高可用性と自動バックアップを実現しています。

---

## 目次

- [アーキテクチャ](#アーキテクチャ)
- [テーブル構成](#テーブル構成)
- [詳細スキーマ](#詳細スキーマ)
  - [ユーザー管理](#ユーザー管理)
  - [AI エージェント](#ai-エージェント)
  - [会話管理](#会話管理)
  - [グループチャット](#グループチャット)
  - [AI 処理履歴](#ai-処理履歴)
  - [課金・サブスクリプション](#課金サブスクリプション)
  - [サービス連携](#サービス連携)
- [マイグレーション](#マイグレーション)
- [設計原則](#設計原則)
- [パフォーマンス最適化](#パフォーマンス最適化)
- [セキュリティ](#セキュリティ)
- [実装済み機能と今後の拡張予定](#実装済み機能と今後の拡張予定)

---

## アーキテクチャ

### データアクセス層

```
Frontend (Next.js)
    ↓ HTTPS
Backend Go (REST API)  ←→  Backend Python (AI処理)
    ↓ PostgreSQL接続         ↑ HTTP内部通信のみ
PostgreSQL (RDS)            (DBアクセスなし)
```

**重要**: Backend Python は **データベースにアクセスしません**。全てのデータ操作は Backend Go を経由します。

### 環境別構成

| 環境     | データベース                | アクセス方法                               |
| -------- | --------------------------- | ------------------------------------------ |
| ローカル | Docker (localhost:5432)     | 直接接続                                   |
| 本番     | AWS RDS (Multi-AZ, Private) | ALB → ECS → RDS (Bastion 経由管理アクセス) |

---

## テーブル構成

NeuraKnot は **14 テーブル** で構成されています。

| カテゴリ                | テーブル名              | 説明                                      |
| ----------------------- | ----------------------- | ----------------------------------------- |
| **ユーザー管理**        | `users`                 | ユーザー情報（AWS Cognito 連携）          |
| **AI エージェント**     | `ai_agents`             | AI エージェント設定とペルソナ             |
| **1対1 会話**           | `conversations`         | ユーザーと AI Agent 間の 1 対 1 会話      |
|                         | `messages`              | 1対1 チャットメッセージ                   |
| **グループチャット**    | `group_chats`           | グループチャット情報                      |
|                         | `group_chat_members`    | グループチャットメンバー                  |
|                         | `group_messages`        | グループチャットメッセージ                |
|                         | `message_mentions`      | メンション管理                            |
| **AI 処理履歴**         | `ai_chat_sessions`      | AI 処理セッション履歴（分析・デバッグ用） |
|                         | `ai_tool_usage`         | AI ツール使用履歴                         |
| **サービス連携**        | `user_service_configs`  | ユーザーのサービス設定（暗号化）          |
|                         | `ai_agent_services`     | AI Agent × サービス紐付け                 |
| **課金・サブスク**      | `llm_pricing`           | LLM モデル別料金マスター                  |
|                         | `token_usage`           | ユーザー別トークン使用量・コスト          |

### ER 図（簡易版）

```
users ────────────────────────┐
  ↓ 1:N                       │
  │                           │ 1:1 (Stripe連携)
  │                           ↓
  │                      [課金情報]
  │                      stripe_customer_id
  │                      subscription_tier
  │                      token_usage (1:N)
  │                      llm_pricing (参照)
  │
  ├─ ai_agents ──────────┐
  │    ↓ 1:N             │ N:M
  │    │                 │ ai_agent_services
  │    │                 │         ↓
  │    │                 │   user_service_configs
  │    │                 │         ↑ 1:N
  │    ├─ conversations  │         │
  │    │    ↓ 1:N        │         │
  │    │  messages ───────────────┘
  │    │                 │
  │    └─ group_chats    │
  │         ↓            │
  │       group_chat_members (N:M with ai_agents)
  │         ↓            │
  │       group_messages │
  │         ↓            │
  │       message_mentions ─────┘
  │
  └─ ai_chat_sessions
       ├─ conversation_id (FK, NULL可)
       ├─ group_chat_id (FK, NULL可)
       └─ ai_tool_usage (1:N)
            ├─ message_id (FK, NULL可)
            └─ group_message_id (FK, NULL可)
```

---

## 詳細スキーマ

### ユーザー管理

#### `users`

ユーザー基本情報を管理します。AWS Cognito と連携し、`cognito_user_id` で識別します。また、Stripe による課金機能にも対応しています。

| カラム名                 | 型           | 制約        | 説明                               |
| ------------------------ | ------------ | ----------- | ---------------------------------- |
| `id`                     | UUID         | PK          | ユーザー ID                        |
| `cognito_user_id`        | VARCHAR(255) | UNIQUE, NN  | AWS Cognito ユーザー識別子         |
| `email`                  | VARCHAR(255) | UNIQUE, NN  | メールアドレス                     |
| `display_name`           | VARCHAR(255) | NN          | 表示名                             |
| `avatar_url`             | TEXT         | NULL        | アバター画像 URL (S3/MinIO)        |
| `status`                 | VARCHAR(50)  | NN, D=active| ユーザーステータス（後述）         |
| `stripe_customer_id`     | VARCHAR(255) | UNIQUE, NULL| Stripe Customer ID                 |
| `subscription_tier`      | VARCHAR(20)  | NN, D=free  | サブスクリプションティア（後述）   |
| `subscription_status`    | VARCHAR(50)  | D=active    | サブスクリプションステータス       |
| `stripe_subscription_id` | VARCHAR(255) | UNIQUE, NULL| Stripe Subscription ID             |
| `current_period_start`   | TIMESTAMP    | NULL        | 現在の課金期間開始日時             |
| `current_period_end`     | TIMESTAMP    | NULL        | 現在の課金期間終了日時             |
| `created_at`             | TIMESTAMP    | NN, D=now() | 作成日時                           |
| `updated_at`             | TIMESTAMP    | NN, D=now() | 更新日時（トリガーで自動更新）     |

**ユーザーステータス (status) - CHECK 制約**:

- `active` - アクティブ（通常利用可能）
- `inactive` - 非アクティブ
- `suspended` - 一時停止
- `deleted` - 削除済み

**サブスクリプションティア (subscription_tier) - CHECK 制約**:

- `free` - 無料プラン
- `basic` - ベーシックプラン
- `pro` - プロプラン

**サブスクリプションステータス (subscription_status) - CHECK 制約**:

- `active` - アクティブ
- `trialing` - トライアル期間中
- `past_due` - 支払い期限超過
- `canceled` - キャンセル済み
- `unpaid` - 未払い
- `incomplete` - 不完全
- `incomplete_expired` - 不完全（期限切れ）
- `paused` - 一時停止

**インデックス**:

- `idx_users_cognito_user_id` (cognito_user_id) - 認証時の検索
- `idx_users_email` (email) - メール検索
- `idx_users_status` (status) - ステータス検索
- `idx_users_created_at` (created_at DESC) - 作成日時順検索
- `idx_users_stripe_customer` (stripe_customer_id) - Stripe 連携検索（WHERE stripe_customer_id IS NOT NULL）
- `idx_users_subscription_tier` (subscription_tier) - ティア別検索
- `idx_users_subscription_status` (subscription_status) - サブスクステータス検索

---

### AI エージェント

#### `ai_agents`

ユーザーが作成する AI エージェントの設定を管理します。

| カラム名           | 型           | 制約         | 説明                                      |
| ------------------ | ------------ | ------------ | ----------------------------------------- |
| `id`               | UUID         | PK           | エージェント ID                           |
| `user_id`          | UUID         | FK→users, NN | 作成者 ID                                 |
| `name`             | VARCHAR(255) | NN           | エージェント名                            |
| `description`      | TEXT         | NULL         | エージェント説明                          |
| `avatar_url`       | TEXT         | NULL         | アバター画像 URL                          |
| `persona_type`     | VARCHAR(50)  | D=''         | ペルソナタイプ（後述）                    |
| `provider`         | VARCHAR(50)  | NN, D=openai | LLM プロバイダー（後述）                  |
| `model`            | VARCHAR(100) | NN, D=gpt-4.1| LLM モデル名                              |
| `temperature`      | DECIMAL(3,2) | NN, D=0.7    | 生成温度（0.0 〜 2.0）                    |
| `max_tokens`       | INTEGER      | NN, D=2000   | 最大トークン数（100 〜 8000）             |
| `system_prompt`    | TEXT         | NULL         | カスタムシステムプロンプト                |
| `tools_enabled`    | BOOLEAN      | D=true       | 基本ツール（日時、計算等）の有効/無効     |
| `streaming_enabled`| BOOLEAN      | D=false      | ストリーミングチャット有効/無効           |
| `is_active`        | BOOLEAN      | D=true       | 有効/無効                                 |
| `message_count`    | INTEGER      | D=0          | 総メッセージ数（トリガーで自動更新）      |
| `last_chat_at`     | TIMESTAMP    | NULL         | 最終会話日時（トリガーで自動更新）        |
| `created_at`       | TIMESTAMP    | NN, D=now()  | 作成日時                                  |
| `updated_at`       | TIMESTAMP    | NN, D=now()  | 更新日時（トリガーで自動更新）            |

**ペルソナタイプ (persona_type) - CHECK 制約**:

- `''` (空文字) - ペルソナなし（未選択）
- `assistant` - 親切で丁寧なアシスタント
- `creative` - 創造的で発想豊かな対話
- `analytical` - 論理的で分析的な対話
- `concise` - 簡潔で要点を絞った応答

**LLM プロバイダー (provider) - CHECK 制約**:

- `openai` - OpenAI (GPT-4.1 系、o1 系)
- `anthropic` - Anthropic (Claude 3.5 系、4.x 系)
- `google` - Google (Gemini 1.5 系、2.x 系)

**制約**:

- `chk_persona_type` - ペルソナタイプの値チェック
- `chk_provider` - プロバイダーの値チェック
- `chk_temperature` - 温度は 0 〜 2 の範囲
- `chk_max_tokens` - トークン数は 100 〜 8000 の範囲

**インデックス**:

- `idx_ai_agents_user` (user_id, is_active) - ユーザーのエージェント一覧取得
- `idx_ai_agents_active` (is_active) - アクティブエージェント検索（WHERE is_active = true）
- `idx_ai_agents_last_chat` (user_id, last_chat_at DESC NULLS LAST) - 最終会話日時順検索
- `idx_ai_agents_streaming` (streaming_enabled) - ストリーミング有効エージェント検索（WHERE streaming_enabled = true）

---

### 会話管理

#### `conversations`

ユーザーと AI エージェント間の 1 対 1 会話セッションを管理します。

| カラム名          | 型        | 制約             | 説明                                     |
| ----------------- | --------- | ---------------- | ---------------------------------------- |
| `id`              | UUID      | PK               | 会話 ID                                  |
| `user_id`         | UUID      | FK→users, NN     | ユーザー ID                              |
| `ai_agent_id`     | UUID      | FK→ai_agents, NN | AI エージェント ID                       |
| `message_count`   | INTEGER   | D=0              | メッセージ数（トリガーで自動更新）       |
| `last_message_at` | TIMESTAMP | NULL             | 最終メッセージ日時（トリガーで自動更新） |
| `created_at`      | TIMESTAMP | NN, D=now()      | 作成日時                                 |
| `updated_at`      | TIMESTAMP | NN, D=now()      | 更新日時（トリガーで自動更新）           |

**インデックス**:

- `idx_conversations_user` (user_id, last_message_at DESC NULLS LAST) - ユーザーの会話一覧（新しい順）
- `idx_conversations_agent` (ai_agent_id) - エージェント別会話一覧

**ユニーク制約**:

- `unique_user_agent_conversation` (user_id, ai_agent_id) - 1 ユーザー × 1 エージェント = 1 会話

---

#### `messages`

1対1 会話内の個別メッセージを管理します。

| カラム名          | 型          | 制約                 | 説明                                 |
| ----------------- | ----------- | -------------------- | ------------------------------------ |
| `id`              | UUID        | PK                   | メッセージ ID                        |
| `conversation_id` | UUID        | FK→conversations, NN | 会話 ID                              |
| `sender_type`     | VARCHAR(20) | NN, CHECK            | 送信者タイプ（user / ai）            |
| `sender_id`       | UUID        | NN                   | 送信者 ID（user_id または agent_id） |
| `content`         | TEXT        | NN                   | メッセージ本文                       |
| `ai_session_id`   | UUID        | FK→ai_chat_sessions  | AI 処理セッション ID（ai の場合）    |
| `created_at`      | TIMESTAMP   | NN, D=now()          | 作成日時                             |

**sender_type - CHECK 制約**:

- `user` - ユーザーメッセージ
- `ai` - AI エージェントメッセージ

**インデックス**:

- `idx_messages_conversation` (conversation_id, created_at DESC) - 会話内メッセージ取得（新しい順）
- `idx_messages_sender` (sender_type, sender_id) - 送信者別メッセージ検索
- `idx_messages_ai_session` (ai_session_id) - AI セッション別検索（WHERE ai_session_id IS NOT NULL）

---

### グループチャット

#### `group_chats`

ユーザーが作成するグループチャットルームを管理します。複数の AI エージェントとの会話が可能です。

| カラム名          | 型           | 制約        | 説明                                     |
| ----------------- | ------------ | ----------- | ---------------------------------------- |
| `id`              | UUID         | PK          | グループチャット ID                      |
| `user_id`         | UUID         | FK→users, NN| ユーザー ID（作成者）                    |
| `name`            | VARCHAR(255) | NN          | グループ名                               |
| `description`     | TEXT         | NULL        | グループ説明                             |
| `icon_url`        | TEXT         | NULL        | グループアイコン URL                     |
| `system_prompt`   | TEXT         | NULL        | グループ共通のシステムプロンプト         |
| `message_count`   | INTEGER      | D=0         | メッセージ数（トリガーで自動更新）       |
| `last_message_at` | TIMESTAMP    | NULL        | 最終メッセージ日時（トリガーで自動更新） |
| `is_active`       | BOOLEAN      | D=true      | 有効/無効                                |
| `created_at`      | TIMESTAMP    | NN, D=now() | 作成日時                                 |
| `updated_at`      | TIMESTAMP    | NN, D=now() | 更新日時（トリガーで自動更新）           |

**インデックス**:

- `idx_group_chats_user` (user_id, last_message_at DESC) - ユーザーのグループ一覧（新しい順）
- `idx_group_chats_active` (user_id, is_active) - アクティブグループ検索（WHERE is_active = true）

---

#### `group_chat_members`

グループチャットに参加する AI エージェントを管理します。

| カラム名        | 型        | 制約             | 説明                           |
| --------------- | --------- | ---------------- | ------------------------------ |
| `id`            | UUID      | PK               | メンバー ID                    |
| `group_chat_id` | UUID      | FK→group_chats,NN| グループチャット ID            |
| `ai_agent_id`   | UUID      | FK→ai_agents, NN | AI エージェント ID             |
| `display_order` | INTEGER   | NN, D=0          | 表示順序                       |
| `joined_at`     | TIMESTAMP | NN, D=now()      | 参加日時                       |

**インデックス**:

- `idx_group_members_group` (group_chat_id, display_order) - グループ内メンバー一覧（表示順）
- `idx_group_members_agent` (ai_agent_id) - エージェント別グループ検索

**ユニーク制約**:

- `UNIQUE` (group_chat_id, ai_agent_id) - 同じエージェントの重複参加防止

---

#### `group_messages`

グループチャット内のメッセージを管理します。メンション機能とリプライ機能に対応しています。

| カラム名             | 型          | 制約             | 説明                                  |
| -------------------- | ----------- | ---------------- | ------------------------------------- |
| `id`                 | UUID        | PK               | メッセージ ID                         |
| `group_chat_id`      | UUID        | FK→group_chats,NN| グループチャット ID                   |
| `sender_type`        | VARCHAR(20) | NN, CHECK        | 送信者タイプ（user / ai）             |
| `sender_id`          | UUID        | NN               | 送信者 ID（user_id または agent_id）  |
| `content`            | TEXT        | NN               | メッセージ本文                        |
| `parent_message_id`  | UUID        | FK→group_messages| 親メッセージ ID（リプライ用）         |
| `ai_session_id`      | UUID        | FK→ai_chat_sessions| AI 処理セッション ID（ai の場合）  |
| `processing_status`  | VARCHAR(50) | D=completed, CHECK| 処理ステータス（後述）              |
| `created_at`         | TIMESTAMP   | NN, D=now()      | 作成日時                              |

**送信者タイプ (sender_type) - CHECK 制約**:

- `user` - ユーザーメッセージ
- `ai` - AI エージェントメッセージ

**処理ステータス (processing_status) - CHECK 制約**:

- `pending` - 処理待ち
- `processing` - 処理中
- `completed` - 完了
- `failed` - 失敗
- `cancelled` - キャンセル

**インデックス**:

- `idx_group_messages_group` (group_chat_id, created_at DESC) - グループ内メッセージ一覧（新しい順）
- `idx_group_messages_sender` (sender_type, sender_id) - 送信者別メッセージ検索
- `idx_group_messages_parent` (parent_message_id) - リプライ検索（WHERE parent_message_id IS NOT NULL）

---

#### `message_mentions`

グループメッセージ内の AI エージェントメンションを管理します。メンションされた順に AI が応答します。

| カラム名              | 型          | 制約             | 説明                                    |
| --------------------- | ----------- | ---------------- | --------------------------------------- |
| `id`                  | UUID        | PK               | メンション ID                           |
| `message_id`          | UUID        | FK→group_messages,NN| メッセージ ID                        |
| `ai_agent_id`         | UUID        | FK→ai_agents, NN | メンションされた AI エージェント ID     |
| `mention_order`       | INTEGER     | NN               | メンション順序（複数メンション時の順番）|
| `status`              | VARCHAR(50) | NN, D=pending, CHECK| 処理ステータス（後述）             |
| `response_message_id` | UUID        | FK→group_messages| 応答メッセージ ID                       |
| `error_message`       | TEXT        | NULL             | エラーメッセージ                        |
| `created_at`          | TIMESTAMP   | NN, D=now()      | 作成日時                                |
| `started_at`          | TIMESTAMP   | NULL             | 処理開始日時                            |
| `completed_at`        | TIMESTAMP   | NULL             | 処理完了日時                            |

**ステータス (status) - CHECK 制約**:

- `pending` - 処理待ち
- `processing` - 処理中
- `completed` - 完了
- `failed` - 失敗
- `cancelled` - キャンセル

**インデックス**:

- `idx_mentions_message` (message_id, mention_order) - メッセージ内のメンション一覧（順序順）
- `idx_mentions_agent` (ai_agent_id) - エージェント別メンション検索
- `idx_mentions_status` (status) - ステータス別検索（WHERE status IN ('pending', 'processing')）

**ユニーク制約**:

- `UNIQUE` (message_id, ai_agent_id) - 同一メッセージ内での重複メンション防止

---

### AI 処理履歴

#### `ai_chat_sessions`

AI 処理の詳細なセッション履歴を記録します（分析・デバッグ・コスト計算用）。1対1 会話とグループチャットの両方に対応しています。

| カラム名                 | 型           | 制約                | 説明                                  |
| ------------------------ | ------------ | ------------------- | ------------------------------------- |
| `id`                     | UUID         | PK                  | セッション ID                         |
| `user_id`                | UUID         | FK→users, NN        | ユーザー ID                           |
| `conversation_id`        | UUID         | FK→conversations    | 会話 ID（1対1 の場合）                |
| `group_chat_id`          | UUID         | FK→group_chats      | グループチャット ID（グループの場合） |
| `ai_agent_id`            | UUID         | FK→ai_agents, NN    | AI エージェント ID                    |
| `message_id`             | UUID         | FK→messages         | メッセージ ID（1対1 の場合）          |
| `provider`               | VARCHAR(50)  | NN                  | 使用 LLM プロバイダー                 |
| `model`                  | VARCHAR(100) | NN                  | 使用 LLM モデル                       |
| `persona`                | VARCHAR(50)  | NN                  | 使用したペルソナ（スナップショット）  |
| `temperature`            | DECIMAL(3,2) | NN                  | 使用した温度設定                      |
| `tokens_prompt`          | INTEGER      | NULL                | プロンプトトークン数                  |
| `tokens_completion`      | INTEGER      | NULL                | 補完トークン数                        |
| `tokens_total`           | INTEGER      | NULL                | 合計トークン数                        |
| `processing_time_ms`     | INTEGER      | NULL                | 処理時間（ミリ秒）                    |
| `tools_used`             | INTEGER      | D=0                 | 使用したツール数                      |
| `status`                 | VARCHAR(50)  | NN, D=processing    | 実行ステータス（後述）                |
| `error_message`          | TEXT         | NULL                | エラーメッセージ                      |
| `cost_usd`               | DECIMAL(10,6)| D=0                 | コスト（USD）                         |
| `cost_jpy`               | DECIMAL(10,2)| D=0                 | コスト（JPY、表示用）                 |
| `prompt_cost_per_1m`     | DECIMAL(10,4)| NULL                | 実行時のプロンプト料金（スナップ）    |
| `completion_cost_per_1m` | DECIMAL(10,4)| NULL                | 実行時の補完料金（スナップショット）  |
| `started_at`             | TIMESTAMP    | NN, D=now()         | 開始日時                              |
| `completed_at`           | TIMESTAMP    | NULL                | 完了日時                              |

**ステータス (status) - CHECK 制約**:

- `processing` - 処理中
- `completed` - 完了
- `failed` - 失敗

**制約**:

- `chk_session_status` - ステータスの値チェック
- `chk_chat_reference` - conversation_id または group_chat_id のいずれか一方が必須（排他的）

**インデックス**:

- `idx_ai_sessions_user` (user_id, started_at DESC) - ユーザー別セッション履歴
- `idx_ai_sessions_conversation` (conversation_id) - 会話別セッション履歴
- `idx_ai_sessions_agent` (ai_agent_id) - エージェント別履歴
- `idx_ai_sessions_status` (status) - 処理中セッション検索（WHERE status = 'processing'）
- `idx_ai_chat_sessions_group_chat_id` (group_chat_id) - グループチャット別セッション履歴
- `idx_ai_sessions_cost` (cost_usd DESC) - コスト別検索（WHERE cost_usd > 0）

---

#### `ai_tool_usage`

AI が使用したツール（外部サービス連携等）の実行履歴を記録します。1対1 会話とグループチャットの両方に対応しています。

| カラム名            | 型           | 制約                    | 説明                                   |
| ------------------- | ------------ | ----------------------- | -------------------------------------- |
| `id`                | UUID         | PK                      | ツール使用 ID                          |
| `session_id`        | UUID         | FK→ai_chat_sessions     | チャットセッション ID（バッチ処理）    |
| `message_id`        | UUID         | FK→messages             | メッセージ ID（1対1 ストリーミング）   |
| `group_message_id`  | UUID         | FK→group_messages       | グループメッセージ ID（グループ用）    |
| `tool_name`         | VARCHAR(255) | NN                      | ツール名                               |
| `tool_category`     | VARCHAR(100) | D=basic                 | ツールカテゴリ（basic / service）      |
| `input_data`        | JSONB        | NN                      | 入力データ（JSON 形式）                |
| `output_data`       | TEXT         | NULL                    | 出力データ                             |
| `status`            | VARCHAR(50)  | NN                      | 実行ステータス（completed / failed）   |
| `error_message`     | TEXT         | NULL                    | エラーメッセージ                       |
| `execution_time_ms` | INTEGER      | NULL                    | 実行時間（ミリ秒）                     |
| `insert_position`   | INTEGER      | NULL                    | メッセージ内挿入位置（文字数）         |
| `executed_at`       | TIMESTAMP    | NN, D=now()             | 実行日時                               |

**ツールカテゴリ (tool_category)**:

- `basic` - 基本ツール（日時、計算など）
- `service` - サービスツール（Slack、Notion など）

**制約**:

- `chk_tool_status` - ステータスは completed または failed
- `chk_tool_reference` - session_id または message_id のいずれかが必須（排他的チェックはなし）
- `ai_tool_usage_message_check` - message_id または group_message_id のいずれか一方が必須（排他的）

**インデックス**:

- `idx_ai_tool_usage_session` (session_id) - セッション別ツール使用履歴（WHERE session_id IS NOT NULL）
- `idx_ai_tool_usage_message` (message_id) - メッセージ別ツール使用履歴（WHERE message_id IS NOT NULL）
- `idx_ai_tool_usage_tool` (tool_name) - ツール別統計
- `idx_ai_tool_usage_executed` (executed_at DESC) - 実行日時順検索
- `idx_ai_tool_usage_input` (input_data) - 入力データ検索（GIN インデックス）
- `idx_ai_tool_usage_group_message` (group_message_id) - グループメッセージ別ツール使用履歴（WHERE group_message_id IS NOT NULL）

---

### 課金・サブスクリプション

#### `llm_pricing`

LLM モデルの料金情報マスターテーブルです。料金履歴管理に対応し、effective_from / effective_to で有効期間を管理します。

| カラム名                 | 型           | 制約        | 説明                                  |
| ------------------------ | ------------ | ----------- | ------------------------------------- |
| `id`                     | UUID         | PK          | 料金 ID                               |
| `provider`               | VARCHAR(50)  | NN          | LLM プロバイダー（後述）              |
| `model`                  | VARCHAR(100) | NN          | LLM モデル名                          |
| `prompt_cost_per_1m`     | DECIMAL(10,4)| NN          | プロンプトトークン料金（USD/1M）      |
| `completion_cost_per_1m` | DECIMAL(10,4)| NN          | 補完トークン料金（USD/1M）            |
| `effective_from`         | TIMESTAMP    | NN, D=now() | 料金適用開始日時                      |
| `effective_to`           | TIMESTAMP    | NULL        | 料金適用終了日時（NULL = 現在も有効） |
| `is_active`              | BOOLEAN      | D=true      | 有効/無効                             |
| `notes`                  | TEXT         | NULL        | 備考                                  |
| `created_at`             | TIMESTAMP    | NN, D=now() | 作成日時                              |
| `updated_at`             | TIMESTAMP    | NN, D=now() | 更新日時（トリガーで自動更新）        |

**LLM プロバイダー (provider) - CHECK 制約**:

- `openai` - OpenAI (GPT-4o, GPT-4.1, o1 系)
- `anthropic` - Anthropic (Claude 3.5, 4.x 系)
- `google` - Google (Gemini 1.5, 2.x 系)

**制約**:

- `unique_provider_model_version` (provider, model, effective_from) - 同一プロバイダー・モデル・開始日時の重複防止
- `chk_pricing_provider` - プロバイダーの値チェック
- `chk_pricing_positive` - 料金は 0 以上

**インデックス**:

- `idx_llm_pricing_provider` (provider) - プロバイダー別検索
- `idx_llm_pricing_model` (model) - モデル別検索
- `idx_llm_pricing_active` (is_active) - アクティブ料金検索（WHERE is_active = true）
- `idx_llm_pricing_effective` (effective_from, effective_to) - 有効期間検索

---

#### `token_usage`

ユーザーごとの課金期間別トークン使用量とコストを管理します。

| カラム名             | 型           | 制約        | 説明                                       |
| -------------------- | ------------ | ----------- | ------------------------------------------ |
| `id`                 | UUID         | PK          | 使用量 ID                                  |
| `user_id`            | UUID         | FK→users, NN| ユーザー ID                                |
| `period_start`       | TIMESTAMP    | NN          | 課金期間開始日時                           |
| `period_end`         | TIMESTAMP    | NN          | 課金期間終了日時                           |
| `tokens_prompt`      | BIGINT       | D=0         | プロンプトトークン数                       |
| `tokens_completion`  | BIGINT       | D=0         | 補完トークン数                             |
| `tokens_total`       | BIGINT       | D=0         | 合計トークン数                             |
| `cost_usd`           | DECIMAL(10,4)| D=0         | コスト（USD）                              |
| `request_count`      | INTEGER      | D=0         | AI 処理リクエスト回数                      |
| `provider_breakdown` | JSONB        | D='{}'      | プロバイダー別内訳（JSON）                 |
| `created_at`         | TIMESTAMP    | NN, D=now() | 作成日時                                   |
| `updated_at`         | TIMESTAMP    | NN, D=now() | 更新日時（トリガーで自動更新）             |

**プロバイダー別内訳 (provider_breakdown) の例**:

```json
{
  "openai": {
    "tokens": 10000,
    "cost": 0.25
  },
  "anthropic": {
    "tokens": 5000,
    "cost": 0.15
  }
}
```

**制約**:

- `unique_user_period` (user_id, period_start, period_end) - 1 ユーザー × 1 期間 = 1 レコード
- `chk_token_usage_period` - period_end > period_start
- `chk_token_usage_positive` - 各数値は 0 以上

**インデックス**:

- `idx_token_usage_user` (user_id) - ユーザー別使用量
- `idx_token_usage_period` (period_start, period_end) - 期間別使用量
- `idx_token_usage_user_period` (user_id, period_start DESC) - ユーザー別期間順検索
- `idx_token_usage_provider_breakdown` (provider_breakdown) - プロバイダー別内訳検索（GIN インデックス）

---

### サービス連携

#### `user_service_configs`

ユーザーが登録した外部サービスの認証情報と設定を管理します。**機密情報は AES-256-GCM で暗号化**されています。

| カラム名           | 型           | 制約         | 説明                           |
| ------------------ | ------------ | ------------ | ------------------------------ |
| `id`               | UUID         | PK           | サービス設定 ID                |
| `user_id`          | UUID         | FK→users, NN | ユーザー ID                    |
| `service_class`    | VARCHAR(255) | NN           | サービスクラス名（後述）       |
| `encrypted_config` | BYTEA        | NULL         | 暗号化された設定情報           |
| `config_nonce`     | BYTEA        | NULL         | 設定暗号化ノンス（AES-GCM 用） |
| `encrypted_auth`   | BYTEA        | NULL         | 暗号化された認証情報           |
| `auth_nonce`       | BYTEA        | NULL         | 認証暗号化ノンス（AES-GCM 用） |
| `is_enabled`       | BOOLEAN      | D=true       | 有効/無効                      |
| `created_at`       | TIMESTAMP    | NN, D=now()  | 作成日時                       |
| `updated_at`       | TIMESTAMP    | NN, D=now()  | 更新日時（トリガーで自動更新） |

**サービスクラス名 (service_class)**:

Python バックエンドのクラス名を指定します。

- `SlackService` - Slack 連携
- `NotionService` - Notion 連携
- `GoogleCalendarService` - Google Calendar 連携
- `OpenWeatherService` - 天気情報（OpenWeather）
- `BraveSearchService` - Web 検索（Brave Search）
- `ExchangeRateService` - 為替レート
- `IPAPIService` - IP 位置情報

**インデックス**:

- `idx_user_service_configs_user` (user_id) - ユーザーのサービス一覧
- `idx_user_service_configs_service` (service_class) - サービス別検索
- `idx_user_service_configs_enabled` (user_id, is_enabled) - アクティブサービス検索

**ユニーク制約**:

- `UNIQUE` (user_id, service_class) - 1 ユーザー × 1 サービスクラス = 1 設定

---

#### `ai_agent_services`

AI エージェントと外部サービスの紐付けを管理します（多対多）。ツール選択モードにより、サービス全体または特定のツールのみを有効化できます。

| カラム名              | 型           | 制約             | 説明                                   |
| --------------------- | ------------ | ---------------- | -------------------------------------- |
| `id`                  | UUID         | PK               | 紐付け ID                              |
| `ai_agent_id`         | UUID         | FK→ai_agents, NN | AI エージェント ID                     |
| `service_class`       | VARCHAR(255) | NN               | サービスクラス名                       |
| `tool_selection_mode` | VARCHAR(50)  | D=all            | ツール選択モード（all / selected）     |
| `selected_tools`      | TEXT[]       | NULL             | 選択されたツール名の配列               |
| `enabled`             | BOOLEAN      | D=true           | このサービスを AI Agent で使用するか   |
| `created_at`          | TIMESTAMP    | NN, D=now()      | 作成日時                               |

**ツール選択モード (tool_selection_mode) - CHECK 制約**:

- `all` - サービスの全ツールを使用可能
- `selected` - selected_tools で指定したツールのみ使用

**インデックス**:

- `idx_ai_agent_services_agent` (ai_agent_id) - エージェントの連携サービス一覧
- `idx_ai_agent_services_service` (service_class) - サービス別エージェント一覧
- `idx_ai_agent_services_enabled` (ai_agent_id, enabled) - 有効サービス検索

**ユニーク制約**:

- `UNIQUE` (ai_agent_id, service_class) - 重複紐付け防止

---

## マイグレーション

### マイグレーション管理

NeuraKnot は **golang-migrate** を使用して、段階的なデータベースマイグレーションを実現しています。

**マイグレーションファイル**: `backend-go/migrations/`

```
000001_initial_schema.up.sql                    # 初期スキーマ（8テーブル作成）
000001_initial_schema.down.sql                  # ロールバック
000002_add_billing_system.up.sql                # 課金システム追加（2テーブル + users拡張）
000002_add_billing_system.down.sql              # ロールバック
000003_seed_llm_pricing.up.sql                  # LLM料金マスターデータ投入
000003_seed_llm_pricing.down.sql                # ロールバック
000004_add_group_chat.up.sql                    # グループチャット機能（4テーブル追加）
000004_add_group_chat.down.sql                  # ロールバック
000005_add_group_chat_to_sessions.up.sql        # ai_chat_sessions にグループチャット対応追加
000005_add_group_chat_to_sessions.down.sql      # ロールバック
000006_add_system_prompt_to_group_chats.up.sql  # group_chats に system_prompt カラム追加
000006_add_system_prompt_to_group_chats.down.sql# ロールバック
000007_add_group_message_to_tool_usage.up.sql   # ai_tool_usage にグループメッセージ対応追加
000007_add_group_message_to_tool_usage.down.sql # ロールバック
```

**マイグレーション履歴**:

| バージョン | 日付       | 内容                                     | テーブル数 |
| ---------- | ---------- | ---------------------------------------- | ---------- |
| 000001     | 初期       | 基本スキーマ（ユーザー、エージェント等） | 8          |
| 000002     | 実装済み   | 課金・サブスクリプションシステム         | +2 (10)    |
| 000003     | 実装済み   | LLM 料金マスターデータ投入               | 10         |
| 000004     | 実装済み   | グループチャット機能                     | +4 (14)    |
| 000005     | 実装済み   | AI セッションのグループチャット対応      | 14         |
| 000006     | 実装済み   | グループチャット共通プロンプト           | 14         |
| 000007     | 実装済み   | ツール使用履歴のグループメッセージ対応   | 14         |

### ローカル環境でのマイグレーション

```bash
# プロジェクトルートから実行

# 全マイグレーション適用
./scripts/migrate-local.sh up

# 1ステップのみ適用
./scripts/migrate-local.sh up 1

# ロールバック
./scripts/migrate-local.sh down 1

# バージョン確認
./scripts/migrate-local.sh version
```

### 本番環境でのマイグレーション

```bash
# ターミナル1: Bastion経由でRDSに接続
./scripts/connect-rds-bastion.sh start

# ターミナル2: マイグレーション実行
./scripts/migrate.sh prod status
./scripts/migrate.sh prod up 1
```

### 詳細ドキュメント

- [マイグレーション詳細](../backend-go/migrations/README.md) - ファイル命名規則、使用方法
- [本番環境マイグレーションガイド](./PRODUCTION_MIGRATION_GUIDE.md) - 安全な本番適用手順
- [安全なマイグレーションパターン](./SAFE_MIGRATION_PATTERNS.md) - ゼロダウンタイム設計

---

## 設計原則

### 1. 単一データアクセスポイント

**Backend-go のみ**が PostgreSQL にアクセスします。Backend Python は HTTP 経由で Backend Go にデータ操作を依頼します。

**メリット**:

- データ整合性の保証
- トランザクション管理の一元化
- セキュリティ境界の明確化
- マイグレーション管理の簡素化

### 2. 段階的な機能拡張

初期リリースは **1 対 1 チャット**（User ↔ AI Agent）からスタートし、その後以下の機能を段階的に追加しています：

- **フェーズ 1（完了）**: 1 対 1 チャット機能（8 テーブル）
- **フェーズ 2（完了）**: 課金・サブスクリプション機能（+2 テーブル）
- **フェーズ 3（完了）**: グループチャット機能（+4 テーブル）

将来的には以下の機能も検討中です：

- 友達機能（ユーザー間のつながり）
- AI エージェントの共有機能
- より高度な分析・レポート機能

### 3. パフォーマンス最適化

- 適切なインデックス配置（検索パターンに基づく）
- トリガーによる集計値の自動更新（`updated_at`, `last_message_at`, `message_count` 等）
- JSONB 型の活用（柔軟なメタデータ保存）

### 4. セキュリティ

- **暗号化**: 機密情報（API キー）は AES-256-GCM で暗号化
- **型安全性**: CHECK 制約による値のバリデーション
- **外部キー制約**: データ整合性の保証
- **最小権限の原則**: Backend Go のデータベースユーザーは必要最小限の権限のみ

---

## パフォーマンス最適化

### インデックス戦略

**検索頻度が高いカラム**:

- `cognito_sub` (users) - 認証時に毎回使用
- `conversation_id` (messages) - メッセージ取得時に使用
- `user_id`, `ai_agent_id` (conversations) - 一覧取得時に使用

**複合インデックス**:

- `(user_id, last_message_at DESC)` (conversations) - ユーザーの会話一覧（新しい順）
- `(user_id, is_active)` (ai_agents) - アクティブなエージェントのみ取得

### トリガーによる自動更新

以下のカラムはトリガーで自動更新されます:

| テーブル        | カラム            | 更新タイミング                                               | トリガー関数                          |
| --------------- | ----------------- | ------------------------------------------------------------ | ------------------------------------- |
| 全テーブル*     | `updated_at`      | UPDATE 時に自動で現在時刻設定                                | `update_updated_at_column()`          |
| `conversations` | `last_message_at` | `messages` テーブルに INSERT 時                              | `update_conversation_on_message()`    |
| `conversations` | `message_count`   | `messages` テーブルに INSERT 時（+1）                        | `update_conversation_on_message()`    |
| `ai_agents`     | `message_count`   | `messages` テーブルに INSERT 時（sender_type='ai' の場合+1） | `update_conversation_on_message()`    |
| `ai_agents`     | `last_chat_at`    | `messages` テーブルに INSERT 時（sender_type='ai' の場合）   | `update_conversation_on_message()`    |
| `group_chats`   | `last_message_at` | `group_messages` テーブルに INSERT 時                        | `update_group_chat_on_message()`      |
| `group_chats`   | `message_count`   | `group_messages` テーブルに INSERT 時（+1）                  | `update_group_chat_on_message()`      |
| `ai_agents`     | `message_count`   | `group_messages` テーブルに INSERT 時（sender_type='ai'）    | `update_group_chat_on_message()`      |
| `ai_agents`     | `last_chat_at`    | `group_messages` テーブルに INSERT 時（sender_type='ai'）    | `update_group_chat_on_message()`      |

\* `updated_at` カラムを持つテーブル: `users`, `ai_agents`, `conversations`, `user_service_configs`, `token_usage`, `llm_pricing`, `group_chats`

**主なトリガー関数**:

1. **update_updated_at_column()**: UPDATE 時に updated_at を自動更新
2. **update_conversation_on_message()**: 1対1 メッセージ挿入時の統計更新
3. **update_group_chat_on_message()**: グループメッセージ挿入時の統計更新

### JSONB の活用

柔軟なメタデータ保存に JSONB 型を使用:

- `messages.metadata` - ツール呼び出し結果等
- `ai_chat_sessions.metadata` - 追加のセッション情報
- `ai_tool_usage.input_parameters` / `output_result` - ツールの入出力データ

**メリット**:

- スキーマ変更なしで新しいメタデータを追加可能
- GIN インデックスによる高速検索（必要に応じて追加可能）
- JSON 関数による柔軟なクエリ

---

## セキュリティ

### 1. 機密情報の暗号化

`user_service_configs` テーブルの API キーは **AES-256-GCM** で暗号化されています。

**暗号化フロー**:

```
APIキー（平文）
   ↓
AES-256-GCM暗号化（32バイトキー）
   ↓
暗号化テキスト + ノンス（12バイト）
   ↓
DB保存（encrypted_key + nonce）
```

**復号化フロー**:

```
DB取得（encrypted_key + nonce）
   ↓
AES-256-GCM復号化（32バイトキー）
   ↓
APIキー（平文）
   ↓
外部サービス呼び出し
```

**セキュリティ特性**:

- **認証付き暗号化**: データの完全性と真正性を保証（改ざん検知）
- **ノンス管理**: 各暗号化で一意のノンスを使用（リプレイ攻撃防止）
- **キー管理**: 暗号化キーは環境変数で管理（AWS Secrets Manager に保存）

詳細は [セキュリティガイド](./SECURITY.md) を参照してください。

### 2. 型安全性と制約

**CHECK 制約** により、不正なデータの挿入を防止:

```sql
-- ペルソナの制約
ALTER TABLE ai_agents ADD CONSTRAINT check_persona
CHECK (persona IN ('assistant', 'creative', 'analytical', 'concise'));

-- LLMプロバイダーの制約
ALTER TABLE ai_agents ADD CONSTRAINT check_llm_provider
CHECK (llm_provider IN ('openai', 'anthropic', 'google'));

-- 送信者タイプの制約
ALTER TABLE messages ADD CONSTRAINT check_sender_type
CHECK (sender_type IN ('user', 'assistant'));
```

### 3. 外部キー制約

全ての参照関係に **FOREIGN KEY 制約** を設定し、データ整合性を保証:

```sql
-- カスケード削除の例
ALTER TABLE conversations
ADD CONSTRAINT fk_conversations_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 削除防止の例
ALTER TABLE ai_agents
ADD CONSTRAINT fk_ai_agents_creator
FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT;
```

### 4. 最小権限の原則

本番環境では、Backend Go のデータベースユーザーは以下の権限のみを持ちます:

- `SELECT`, `INSERT`, `UPDATE`, `DELETE` - アプリケーションテーブルのみ
- `USAGE`, `SELECT` - シーケンスのみ
- **禁止**: `CREATE`, `DROP`, `ALTER` - スキーマ変更は管理者のみ

---

## 実装済み機能と今後の拡張予定

### 実装済み機能 ✅

以下の機能は既に実装されています:

#### 1. グループチャット機能 ✅

**実装済みテーブル**:

- `group_chats` - グループチャット情報
- `group_chat_members` - グループメンバー（AI Agent のみ）
- `group_messages` - グループメッセージ
- `message_mentions` - メンション管理

**主な機能**:

- 複数の AI エージェントとの同時会話
- メンション機能（@エージェント名）
- リプライ機能（親メッセージへの返信）
- グループ共通のシステムプロンプト設定

#### 2. 課金・サブスクリプション機能 ✅

**実装済みテーブル**:

- `llm_pricing` - LLM モデル別料金マスター
- `token_usage` - ユーザー別トークン使用量・コスト

**主な機能**:

- Stripe 連携によるサブスクリプション管理（free / basic / pro）
- トークン使用量の追跡とコスト計算
- LLM モデル別の料金管理（履歴対応）
- プロバイダー別の使用量内訳

参考: [課金システム実装ドキュメント](./BILLING_SYSTEM_IMPLEMENTATION.md)

---

### 今後の拡張予定 🚀

以下の機能は将来のバージョンで追加を検討しています:

#### 1. 友達機能

新規テーブル:

- `friendships` - 友達関係
- `friend_requests` - 友達リクエスト

#### 2. AI エージェント共有機能

新規テーブル:

- `shared_agents` - 共有された AI エージェント
- `agent_sharing_permissions` - 共有権限管理

#### 3. 高度な分析・レポート機能

新規テーブル:

- `usage_analytics` - 詳細な使用状況分析
- `custom_reports` - カスタムレポート設定

---

## 関連ドキュメント

- [Backend Go README](../backend-go/README.md) - API 実装詳細
- [マイグレーション詳細](../backend-go/migrations/README.md) - マイグレーション管理
- [本番環境マイグレーションガイド](./PRODUCTION_MIGRATION_GUIDE.md) - 安全な本番適用
- [セキュリティガイド](./SECURITY.md) - セキュリティ対策詳細
- [SSM 経由 RDS 接続ガイド](./backend/SSM_RDS_CONNECTION_GUIDE.md) - 本番 DB 接続方法
- [pgAdmin セットアップ](./backend/PGADMIN_SETUP.md) - GUI ツール設定

---

**最終更新**: 2026-02-01  
**現在のバージョン**: マイグレーション 000007（14 テーブル）  
**ステータス**: ✅ 課金システム実装済み、✅ グループチャット機能実装済み
