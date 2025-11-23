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
  - [AI 処理履歴](#ai-処理履歴)
  - [サービス連携](#サービス連携)
- [マイグレーション](#マイグレーション)
- [設計原則](#設計原則)
- [パフォーマンス最適化](#パフォーマンス最適化)
- [セキュリティ](#セキュリティ)

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

| 環境   | データベース                  | アクセス方法                              |
| ------ | ----------------------------- | ----------------------------------------- |
| ローカル | Docker (localhost:5432)       | 直接接続                                  |
| 本番   | AWS RDS (Multi-AZ, Private) | ALB → ECS → RDS (Bastion経由管理アクセス) |

---

## テーブル構成

NeuraKnot は **8 テーブル** で構成されています。

| カテゴリ        | テーブル名             | 説明                                      |
| --------------- | ---------------------- | ----------------------------------------- |
| **ユーザー管理**    | `users`                | ユーザー情報（AWS Cognito 連携）          |
| **AI エージェント** | `ai_agents`            | AI エージェント設定とペルソナ             |
| **会話**            | `conversations`        | ユーザーと AI Agent 間の 1 対 1 会話      |
|                 | `messages`             | チャットメッセージ                        |
| **AI 処理履歴**     | `ai_chat_sessions`     | AI 処理セッション履歴（分析・デバッグ用） |
|                 | `ai_tool_usage`        | AI ツール使用履歴                         |
| **サービス連携**    | `user_service_configs` | ユーザーのサービス設定（暗号化）          |
|                 | `ai_agent_services`    | AI Agent × サービス紐付け                 |

### ER 図（簡易版）

```
users
  ↓ 1:N
ai_agents ─────────┐
  ↓ 1:N            │ N:M
conversations      │ ai_agent_services
  ↓ 1:N            │         ↓
messages           │         ↓
  ↓                │   user_service_configs
  ↓ 1:N            │         ↑ 1:N
ai_chat_sessions ──┘         │
  ↓ 1:N                      │
ai_tool_usage ───────────────┘
```

---

## 詳細スキーマ

### ユーザー管理

#### `users`

ユーザー基本情報を管理します。AWS Cognito と連携し、`cognito_sub` で識別します。

| カラム名         | 型           | 制約        | 説明                           |
| ---------------- | ------------ | ----------- | ------------------------------ |
| `id`             | UUID         | PK          | ユーザー ID                    |
| `cognito_sub`    | VARCHAR(255) | UNIQUE, NN  | AWS Cognito ユーザー識別子     |
| `email`          | VARCHAR(255) | UNIQUE, NN  | メールアドレス                 |
| `display_name`   | VARCHAR(100) | NN          | 表示名                         |
| `avatar_url`     | TEXT         | NULL        | アバター画像 URL (S3/MinIO)    |
| `bio`            | TEXT         | NULL        | 自己紹介                       |
| `is_active`      | BOOLEAN      | NN, D=true  | アカウント有効/無効            |
| `last_active_at` | TIMESTAMPTZ  | NULL        | 最終活動日時                   |
| `created_at`     | TIMESTAMPTZ  | NN, D=now() | 作成日時                       |
| `updated_at`     | TIMESTAMPTZ  | NN, D=now() | 更新日時（トリガーで自動更新） |

**インデックス**:
- `idx_users_cognito_sub` (cognito_sub) - 認証時の検索
- `idx_users_email` (email) - メール検索

---

### AI エージェント

#### `ai_agents`

ユーザーが作成する AI エージェントの設定を管理します。

| カラム名                  | 型                                                       | 制約        | 説明                               |
| ------------------------- | -------------------------------------------------------- | ----------- | ---------------------------------- |
| `id`                      | UUID                                                     | PK          | エージェント ID                    |
| `creator_id`              | UUID                                                     | FK→users, NN | 作成者 ID                          |
| `name`                    | VARCHAR(100)                                             | NN          | エージェント名                     |
| `persona`                 | VARCHAR(50)                                              | NN, CHECK   | ペルソナ（後述）                   |
| `avatar_url`              | TEXT                                                     | NULL        | アバター画像 URL                   |
| `system_prompt`           | TEXT                                                     | NULL        | システムプロンプト（AI の動作指示） |
| `self_introduction`       | TEXT                                                     | NULL        | AI の自己紹介文（LLM 自動生成）    |
| `llm_provider`            | VARCHAR(50)                                              | NN, CHECK   | LLM プロバイダー（後述）           |
| `llm_model`               | VARCHAR(100)                                             | NN          | LLM モデル名                       |
| `temperature`             | DECIMAL(3,2)                                             | NN, D=0.7   | 生成温度（0.0 〜 2.0）             |
| `max_tokens`              | INTEGER                                                  | NULL        | 最大トークン数                     |
| `is_active`               | BOOLEAN                                                  | NN, D=true  | 有効/無効                          |
| `last_conversation_at`    | TIMESTAMPTZ                                              | NULL        | 最終会話日時（トリガーで自動更新） |
| `total_conversations`     | INTEGER                                                  | NN, D=0     | 総会話数（トリガーで自動更新）     |
| `total_messages`          | INTEGER                                                  | NN, D=0     | 総メッセージ数（トリガーで自動更新） |
| `created_at`              | TIMESTAMPTZ                                              | NN, D=now() | 作成日時                           |
| `updated_at`              | TIMESTAMPTZ                                              | NN, D=now() | 更新日時（トリガーで自動更新）     |

**ペルソナ (persona) - CHECK 制約**:
- `assistant` - アシスタント（汎用）
- `creative` - クリエイティブ
- `analytical` - 分析的
- `concise` - 簡潔

**LLM プロバイダー (llm_provider) - CHECK 制約**:
- `openai` - OpenAI (GPT-4.1 系)
- `anthropic` - Anthropic (Claude 4.5 系)
- `google` - Google (Gemini 2.5 系)

**インデックス**:
- `idx_ai_agents_creator` (creator_id) - ユーザーのエージェント一覧取得
- `idx_ai_agents_active` (creator_id, is_active) - アクティブエージェント検索

---

### 会話管理

#### `conversations`

ユーザーと AI エージェント間の 1 対 1 会話セッションを管理します。

| カラム名              | 型          | 制約        | 説明                               |
| --------------------- | ----------- | ----------- | ---------------------------------- |
| `id`                  | UUID        | PK          | 会話 ID                            |
| `user_id`             | UUID        | FK→users, NN | ユーザー ID                        |
| `ai_agent_id`         | UUID        | FK→ai_agents, NN | AI エージェント ID              |
| `title`               | VARCHAR(200)| NULL        | 会話タイトル（未実装、将来用）     |
| `last_message_at`     | TIMESTAMPTZ | NULL        | 最終メッセージ日時（トリガーで自動更新） |
| `message_count`       | INTEGER     | NN, D=0     | メッセージ数（トリガーで自動更新） |
| `is_archived`         | BOOLEAN     | NN, D=false | アーカイブ済み                     |
| `created_at`          | TIMESTAMPTZ | NN, D=now() | 作成日時                           |
| `updated_at`          | TIMESTAMPTZ | NN, D=now() | 更新日時（トリガーで自動更新）     |

**インデックス**:
- `idx_conversations_user` (user_id, last_message_at DESC) - ユーザーの会話一覧（新しい順）
- `idx_conversations_agent` (ai_agent_id) - エージェント別会話一覧
- `idx_conversations_archived` (user_id, is_archived) - アーカイブ除外検索

**ユニーク制約**:
- `uq_user_agent_conversation` (user_id, ai_agent_id) - 1 ユーザー × 1 エージェント = 1 会話

---

#### `messages`

会話内の個別メッセージを管理します。

| カラム名           | 型          | 制約        | 説明                               |
| ------------------ | ----------- | ----------- | ---------------------------------- |
| `id`               | UUID        | PK          | メッセージ ID                      |
| `conversation_id`  | UUID        | FK→conversations, NN | 会話 ID                  |
| `sender_type`      | VARCHAR(20) | NN, CHECK   | 送信者タイプ（user / assistant）   |
| `sender_id`        | UUID        | NN          | 送信者 ID（user_id または agent_id） |
| `content`          | TEXT        | NN          | メッセージ本文                     |
| `metadata`         | JSONB       | NULL        | メタデータ（ツール呼び出し結果等） |
| `sent_at`          | TIMESTAMPTZ | NN, D=now() | 送信日時                           |
| `created_at`       | TIMESTAMPTZ | NN, D=now() | 作成日時                           |

**sender_type - CHECK 制約**:
- `user` - ユーザーメッセージ
- `assistant` - AI エージェントメッセージ

**インデックス**:
- `idx_messages_conversation` (conversation_id, sent_at ASC) - 会話内メッセージ取得（古い順）
- `idx_messages_sender` (sender_id, sender_type) - 送信者別メッセージ検索

---

### AI 処理履歴

#### `ai_chat_sessions`

AI 処理の詳細なセッション履歴を記録します（分析・デバッグ用）。

| カラム名                | 型           | 制約        | 説明                               |
| ----------------------- | ------------ | ----------- | ---------------------------------- |
| `id`                    | UUID         | PK          | セッション ID                      |
| `conversation_id`       | UUID         | FK→conversations, NN | 会話 ID              |
| `ai_agent_id`           | UUID         | FK→ai_agents, NN | AI エージェント ID          |
| `user_message_id`       | UUID         | FK→messages | ユーザーメッセージ ID              |
| `assistant_message_id`  | UUID         | FK→messages, NULL | AI メッセージ ID          |
| `llm_provider`          | VARCHAR(50)  | NN          | 使用 LLM プロバイダー              |
| `llm_model`             | VARCHAR(100) | NN          | 使用 LLM モデル                    |
| `system_prompt`         | TEXT         | NULL        | 使用したシステムプロンプト         |
| `input_tokens`          | INTEGER      | D=0         | 入力トークン数                     |
| `output_tokens`         | INTEGER      | D=0         | 出力トークン数                     |
| `total_tokens`          | INTEGER      | D=0         | 合計トークン数                     |
| `response_time_ms`      | INTEGER      | NULL        | レスポンス時間（ミリ秒）           |
| `temperature`           | DECIMAL(3,2) | NULL        | 使用した温度設定                   |
| `error_message`         | TEXT         | NULL        | エラーメッセージ                   |
| `metadata`              | JSONB        | NULL        | その他メタデータ                   |
| `created_at`            | TIMESTAMPTZ  | NN, D=now() | 作成日時                           |

**インデックス**:
- `idx_ai_chat_sessions_conversation` (conversation_id, created_at DESC) - 会話別セッション履歴
- `idx_ai_chat_sessions_agent` (ai_agent_id, created_at DESC) - エージェント別履歴
- `idx_ai_chat_sessions_model` (llm_provider, llm_model) - モデル別統計

---

#### `ai_tool_usage`

AI が使用したツール（外部サービス連携等）の実行履歴を記録します。

| カラム名            | 型          | 制約        | 説明                               |
| ------------------- | ----------- | ----------- | ---------------------------------- |
| `id`                | UUID        | PK          | ツール使用 ID                      |
| `chat_session_id`   | UUID        | FK→ai_chat_sessions, NN | チャットセッション ID |
| `tool_name`         | VARCHAR(100)| NN          | ツール名                           |
| `service_type`      | VARCHAR(50) | NULL        | サービスタイプ（slack, notion 等） |
| `input_parameters`  | JSONB       | NULL        | 入力パラメータ                     |
| `output_result`     | JSONB       | NULL        | 出力結果                           |
| `execution_time_ms` | INTEGER     | NULL        | 実行時間（ミリ秒）                 |
| `status`            | VARCHAR(20) | NN, CHECK   | 実行ステータス（後述）             |
| `error_message`     | TEXT        | NULL        | エラーメッセージ                   |
| `created_at`        | TIMESTAMPTZ | NN, D=now() | 作成日時                           |

**status - CHECK 制約**:
- `success` - 成功
- `error` - エラー
- `timeout` - タイムアウト

**インデックス**:
- `idx_ai_tool_usage_session` (chat_session_id, created_at DESC) - セッション別ツール使用履歴
- `idx_ai_tool_usage_tool` (tool_name, status) - ツール別統計

---

### サービス連携

#### `user_service_configs`

ユーザーが登録した外部サービスの認証情報を管理します。**機密情報は AES-256-GCM で暗号化**されています。

| カラム名         | 型          | 制約        | 説明                               |
| ---------------- | ----------- | ----------- | ---------------------------------- |
| `id`             | UUID        | PK          | サービス設定 ID                    |
| `user_id`        | UUID        | FK→users, NN | ユーザー ID                        |
| `service_type`   | VARCHAR(50) | NN, CHECK   | サービスタイプ（後述）             |
| `encrypted_key`  | TEXT        | NN          | 暗号化された API キー              |
| `nonce`          | TEXT        | NN          | 暗号化ノンス（AES-GCM 用）         |
| `is_active`      | BOOLEAN     | NN, D=true  | 有効/無効                          |
| `last_used_at`   | TIMESTAMPTZ | NULL        | 最終使用日時                       |
| `created_at`     | TIMESTAMPTZ | NN, D=now() | 作成日時                           |
| `updated_at`     | TIMESTAMPTZ | NN, D=now() | 更新日時（トリガーで自動更新）     |

**service_type - CHECK 制約**:
- `slack` - Slack
- `notion` - Notion
- `github` - GitHub
- `google_calendar` - Google Calendar
- `weather` - 天気情報（OpenWeather）
- `brave_search` - Web 検索（Brave Search）
- `exchange_rate` - 為替レート
- `ip_api` - IP 位置情報

**インデックス**:
- `idx_user_service_configs_user` (user_id, service_type) - ユーザーのサービス一覧
- `idx_user_service_configs_active` (user_id, is_active) - アクティブサービス検索

**ユニーク制約**:
- `uq_user_service_type` (user_id, service_type) - 1 ユーザー × 1 サービスタイプ = 1 設定

---

#### `ai_agent_services`

AI エージェントと外部サービスの紐付けを管理します（多対多）。

| カラム名         | 型          | 制約        | 説明                               |
| ---------------- | ----------- | ----------- | ---------------------------------- |
| `id`             | UUID        | PK          | 紐付け ID                          |
| `ai_agent_id`    | UUID        | FK→ai_agents, NN | AI エージェント ID          |
| `service_config_id` | UUID     | FK→user_service_configs, NN | サービス設定 ID   |
| `created_at`     | TIMESTAMPTZ | NN, D=now() | 作成日時                           |

**インデックス**:
- `idx_ai_agent_services_agent` (ai_agent_id) - エージェントの連携サービス一覧
- `idx_ai_agent_services_service` (service_config_id) - サービスを使用するエージェント一覧

**ユニーク制約**:
- `uq_agent_service` (ai_agent_id, service_config_id) - 重複紐付け防止

---

## マイグレーション

### マイグレーション管理

NeuraKnot は **golang-migrate** を使用して、段階的なデータベースマイグレーションを実現しています。

**マイグレーションファイル**: `backend-go/migrations/`

```
000001_initial_schema.up.sql     # 全8テーブル作成
000001_initial_schema.down.sql   # ロールバック
000002_add_billing_system.up.sql # (将来) 課金機能追加
000002_add_billing_system.down.sql
...
```

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

### 2. MVP に集中

現在は **1 対 1 チャット**（User ↔ AI Agent）のみサポートしています。将来のグループチャット等は別テーブルで拡張予定です。

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

| テーブル        | カラム                  | 更新タイミング                  |
| --------------- | ----------------------- | ------------------------------- |
| 全テーブル      | `updated_at`            | UPDATE 時に自動で現在時刻設定   |
| `conversations` | `last_message_at`       | メッセージ追加時に更新          |
| `conversations` | `message_count`         | メッセージ追加/削除時に更新     |
| `ai_agents`     | `last_conversation_at`  | 会話追加時に更新                |
| `ai_agents`     | `total_conversations`   | 会話追加/削除時に更新           |
| `ai_agents`     | `total_messages`        | メッセージ追加/削除時に更新     |

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

## 今後の拡張予定

以下の機能は将来のバージョンで追加予定です:

### 1. グループチャット機能

新規テーブル:
- `groups` - グループ情報
- `group_members` - グループメンバー（User + AI Agent）
- `group_messages` - グループメッセージ

### 2. 課金・サブスクリプション機能

新規テーブル:
- `subscriptions` - サブスクリプション情報
- `llm_pricing` - LLM モデル別料金マスター
- `usage_records` - 使用量記録（トークン数等）
- `invoices` - 請求書

参考: [課金システム実装ドキュメント](./BILLING_SYSTEM_IMPLEMENTATION.md)

### 3. 友達機能

新規テーブル:
- `friendships` - 友達関係
- `friend_requests` - 友達リクエスト

---

## 関連ドキュメント

- [Backend Go README](../backend-go/README.md) - API 実装詳細
- [マイグレーション詳細](../backend-go/migrations/README.md) - マイグレーション管理
- [本番環境マイグレーションガイド](./PRODUCTION_MIGRATION_GUIDE.md) - 安全な本番適用
- [セキュリティガイド](./SECURITY.md) - セキュリティ対策詳細
- [SSM 経由 RDS 接続ガイド](./backend/SSM_RDS_CONNECTION_GUIDE.md) - 本番 DB 接続方法
- [pgAdmin セットアップ](./backend/PGADMIN_SETUP.md) - GUI ツール設定

---

**最終更新**: 2025-11-15







