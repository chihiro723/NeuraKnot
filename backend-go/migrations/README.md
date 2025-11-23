# Database Migrations

## 📋 概要

このディレクトリには、NeuraKnot のデータベーススキーママイグレーションファイルが含まれています。

**マイグレーションツール**: [golang-migrate](https://github.com/golang-migrate/migrate)

---

## 📂 ファイル構成

```
migrations/
├── 000001_initial_schema.up.sql          # 初期スキーマ作成
├── 000001_initial_schema.down.sql        # 初期スキーマ削除
├── 000002_add_billing_system.up.sql      # 課金システム追加
├── 000002_add_billing_system.down.sql    # 課金システム削除
├── 000003_seed_llm_pricing.up.sql        # LLM料金データ投入
├── 000003_seed_llm_pricing.down.sql      # LLM料金データ削除
└── ...
```

**命名規則:**

- `{version}_{description}.{direction}.sql`
- version: 6 桁の連番（000001, 000002, ...）
- description: スネークケース
- direction: `up` (適用) / `down` (ロールバック)

---

## 🚀 使用方法

### ローカル環境（開発）

**重要**: ローカル環境のマイグレーションは、**プロジェクトルート**から実行してください。

#### 1. マイグレーションの適用

```bash
# プロジェクトルートに移動
cd /path/to/NeuraKnot

# 全てのマイグレーションを適用
./scripts/migrate-local.sh up

# 1ステップのみ適用
./scripts/migrate-local.sh up 1

# 特定バージョンまで適用
./scripts/migrate-local.sh goto 5
```

#### 2. ロールバック

```bash
# 最後の1ステップをロールバック
./scripts/migrate-local.sh down 1

# 全てロールバック
./scripts/migrate-local.sh down
```

#### 3. 現在のバージョン確認

```bash
./scripts/migrate-local.sh version
```

### 本番環境（Production）

```bash
# 状態確認
./scripts/migrate.sh prod status

# 段階的適用（推奨）
./scripts/migrate.sh prod up 1

# 全マイグレーション適用
./scripts/migrate.sh prod up

# ロールバック
./scripts/migrate.sh prod down 1
```

**詳細**: [PRODUCTION_MIGRATION_GUIDE.md](../../docs/PRODUCTION_MIGRATION_GUIDE.md)

---

## 📝 新しいマイグレーションの作成

### 1. マイグレーションファイルの生成

```bash
# migrateコマンドでファイル生成
migrate create -ext sql -dir backend-go/migrations -seq add_new_feature

# 生成されるファイル:
# 000008_add_new_feature.up.sql
# 000008_add_new_feature.down.sql
```

### 2. up.sql の編集

```sql
-- ============================================
-- Migration: Add new feature
-- Version: 8
-- Description: 新機能のためのテーブル追加
-- Author: Your Name
-- Date: 2024-11-15
-- ============================================

BEGIN;

CREATE TABLE new_feature (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_new_feature_user_id ON new_feature(user_id);

COMMIT;
```

### 3. down.sql の編集

```sql
-- ============================================
-- Rollback: Add new feature
-- Version: 8
-- ============================================

BEGIN;

DROP INDEX IF EXISTS idx_new_feature_user_id;
DROP TABLE IF EXISTS new_feature;

COMMIT;
```

### 4. テスト

```bash
# 適用
./scripts/migrate-local.sh up 1

# 確認
psql -h localhost -p 5432 -U postgres -d go_backend -c "\d new_feature"

# ロールバック
./scripts/migrate-local.sh down 1

# 再適用
./scripts/migrate-local.sh up 1
```

---

## 🛡️ 安全なマイグレーション設計

### ✅ DO（推奨）

- ✅ 1 つのマイグレーションで 1 つの変更のみ
- ✅ 必ず down.sql を作成
- ✅ トランザクションで囲む
- ✅ インデックスは`CONCURRENTLY`で作成
- ✅ NOT NULL 制約は段階的に追加
- ✅ カラム削除前にアプリケーションを更新

### ❌ DON'T（非推奨）

- ❌ 複数の大きな変更を 1 つのマイグレーションに含める
- ❌ データ移行なしで NOT NULL 制約を追加
- ❌ トランザクション内で CONCURRENTLY を使用
- ❌ 本番環境で初めてテスト
- ❌ down.sql を省略

**詳細**: [SAFE_MIGRATION_PATTERNS.md](../../docs/SAFE_MIGRATION_PATTERNS.md)

---

## 📊 現在のマイグレーション一覧

| Version | Name                             | Description                                        |
| ------- | -------------------------------- | -------------------------------------------------- |
| 000001  | initial_schema                   | 初期スキーマ（users, ai_agents, conversations 等） |
| 000002  | add_billing_system               | 課金システム（token_usage, llm_pricing 等）        |
| 000003  | seed_llm_pricing                 | LLM 料金マスターデータ                             |
| 000004  | add_group_chat                   | グループチャット機能                               |
| 000005  | add_group_chat_to_sessions       | セッションとグループチャットの紐付け               |
| 000006  | add_system_prompt_to_group_chats | グループチャットにシステムプロンプト追加           |
| 000007  | add_group_message_to_tool_usage  | ツール使用履歴にグループメッセージ紐付け           |

---

## 🔧 トラブルシューティング

### Dirty State になった場合

```
error: Dirty database version 3. Fix and force version.
```

**対処法:**

1. データベースの状態を確認:

   ```sql
   SELECT * FROM schema_migrations;
   ```

2. 手動で問題を修正後、バージョンを強制設定:

   ```bash
   # ローカル
   ./scripts/migrate-local.sh force 3

   # 本番
   ./scripts/migrate.sh prod force 3
   ```

### 接続エラー

```
Error: dial tcp: connection refused
```

**確認事項:**

- PostgreSQL が起動しているか
- `.env.local`の接続情報が正しいか
- 本番環境の場合、Bastion 経由のポートフォワーディングが有効か

---

## 📚 関連ドキュメント

- [PRODUCTION_MIGRATION_GUIDE.md](../../docs/PRODUCTION_MIGRATION_GUIDE.md) - 本番環境実行ガイド
- [SAFE_MIGRATION_PATTERNS.md](../../docs/SAFE_MIGRATION_PATTERNS.md) - 安全な設計パターン
- [DATABASE_MIGRATION.md](../../docs/DATABASE_MIGRATION.md) - マイグレーションシステム概要

---

## 🔗 参考リンク

- [golang-migrate](https://github.com/golang-migrate/migrate)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Strong Migrations](https://github.com/ankane/strong_migrations)

---

最終更新: 2024 年 11 月
