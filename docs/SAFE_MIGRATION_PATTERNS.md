# 安全なマイグレーション設計パターン

## 📋 概要

本ドキュメントは、データベースマイグレーションを安全に設計・実装するためのパターンとベストプラクティスをまとめています。

---

## 🎯 基本原則

### 1. ゼロダウンタイムマイグレーション

本番環境では、サービスを停止せずにマイグレーションを実行する必要があります。

**原則:**

- ✅ マイグレーションは後方互換性を保つ
- ✅ データ損失のリスクを最小化
- ✅ ロールバック可能な設計
- ✅ 段階的な適用

### 2. マイグレーションファイルの構成

```
migrations/
├── 000001_initial_schema.up.sql      # 適用SQL
├── 000001_initial_schema.down.sql    # ロールバックSQL
├── 000002_add_billing_system.up.sql
├── 000002_add_billing_system.down.sql
└── ...
```

**命名規則:**

- `{version}_{description}.{direction}.sql`
- version: 6 桁の連番（例: 000001, 000002）
- description: スネークケース（例: add_user_table, modify_email_unique）
- direction: `up` または `down`

---

## 🚀 マイグレーションファイルの作成

### ローカル環境での作成

```bash
# 新しいマイグレーションファイルを作成
migrate create -ext sql -dir backend-go/migrations -seq add_new_feature

# 作成されるファイル:
# migrations/000008_add_new_feature.up.sql
# migrations/000008_add_new_feature.down.sql
```

### テンプレート

#### up.sql

```sql
-- ============================================
-- Migration: Add new feature
-- Version: 8
-- Description: 新機能のためのテーブル追加
-- Author: Your Name
-- Date: 2024-01-01
-- ============================================

BEGIN;

-- 変更内容をここに記述
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

#### down.sql

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

---

## 🛡️ 安全なマイグレーションパターン

### パターン 1: カラム追加（NULL 許可）

#### ✅ 安全な方法

```sql
-- up.sql
BEGIN;

-- ステップ1: NULL許可でカラム追加
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);

-- インデックスが必要な場合は追加
CREATE INDEX CONCURRENTLY idx_users_phone_number ON users(phone_number);

COMMIT;
```

```sql
-- down.sql
BEGIN;

DROP INDEX IF EXISTS idx_users_phone_number;
ALTER TABLE users DROP COLUMN IF EXISTS phone_number;

COMMIT;
```

**理由:**

- 既存レコードに影響しない
- アプリケーションの変更と独立して実行可能
- ロールバックが容易

### パターン 2: NOT NULL 制約の追加（段階的）

#### ❌ 危険な方法

```sql
-- これは失敗する可能性が高い
ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL;
```

#### ✅ 安全な方法（3 ステップ）

**マイグレーション 1: デフォルト値付きでカラム追加**

```sql
-- 000008_add_email_column.up.sql
BEGIN;

ALTER TABLE users ADD COLUMN email VARCHAR(255) DEFAULT 'temporary@example.com';

COMMIT;
```

**マイグレーション 2: 既存データの移行**

```sql
-- 000009_populate_email.up.sql
BEGIN;

-- 既存ユーザーにメールアドレスを設定
UPDATE users
SET email = cognito_email
WHERE email = 'temporary@example.com' AND cognito_email IS NOT NULL;

COMMIT;
```

**マイグレーション 3: NOT NULL 制約の追加**

```sql
-- 000010_make_email_not_null.up.sql
BEGIN;

-- デフォルト値を削除
ALTER TABLE users ALTER COLUMN email DROP DEFAULT;

-- NOT NULL制約を追加
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

COMMIT;
```

### パターン 3: カラム削除（段階的）

#### ✅ 安全な方法（3 ステップ）

**ステップ 1: アプリケーションからの参照を削除**

- コードをデプロイ（カラムを使用しないバージョン）
- 数日間様子を見る

**ステップ 2: カラムを削除**

```sql
-- 000011_remove_old_column.up.sql
BEGIN;

-- 依存するインデックスやFKを先に削除
DROP INDEX IF EXISTS idx_users_old_column;

-- カラム削除
ALTER TABLE users DROP COLUMN IF EXISTS old_column;

COMMIT;
```

```sql
-- 000011_remove_old_column.down.sql
BEGIN;

-- 復元（データは失われる）
ALTER TABLE users ADD COLUMN old_column VARCHAR(255);
CREATE INDEX idx_users_old_column ON users(old_column);

-- 警告: データの復元は不可能
COMMIT;
```

### パターン 4: テーブル名の変更

#### ✅ 安全な方法（ビューを使用）

```sql
-- 000012_rename_table_with_view.up.sql
BEGIN;

-- 新しいテーブルを作成
CREATE TABLE new_table_name (LIKE old_table_name INCLUDING ALL);

-- データをコピー
INSERT INTO new_table_name SELECT * FROM old_table_name;

-- 古いテーブル名でビューを作成（後方互換性）
CREATE VIEW old_table_name AS SELECT * FROM new_table_name;

COMMIT;
```

**段階的に移行:**

1. アプリケーションを新しいテーブル名に対応させる
2. デプロイ
3. ビューを削除

### パターン 5: インデックスの追加

#### ✅ 安全な方法（CONCURRENTLY）

```sql
-- 000013_add_index.up.sql
-- ロックを取得しないインデックス作成
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at
ON users(created_at);
```

```sql
-- 000013_add_index.down.sql
DROP INDEX CONCURRENTLY IF EXISTS idx_users_created_at;
```

**重要:**

- `CONCURRENTLY`オプションを使用
- トランザクション内では実行できない（BEGIN なし）
- 失敗時は手動でクリーンアップが必要

### パターン 6: 外部キー制約の追加

#### ✅ 安全な方法

```sql
-- 000014_add_foreign_key.up.sql
BEGIN;

-- ステップ1: NOT VALIDで制約を追加（既存データをチェックしない）
ALTER TABLE orders
ADD CONSTRAINT fk_orders_user_id
FOREIGN KEY (user_id) REFERENCES users(id)
NOT VALID;

COMMIT;

-- ステップ2: 別のトランザクションでVALIDATEを実行
-- これはロックを取得するが、短時間で済む
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_user_id;
```

### パターン 7: 大量データの更新

#### ❌ 危険な方法

```sql
-- 一度に全レコードを更新（ロックが長時間）
UPDATE users SET status = 'active';
```

#### ✅ 安全な方法（バッチ処理）

```sql
-- 000015_update_user_status.up.sql
DO $$
DECLARE
    batch_size INT := 1000;
    updated_count INT;
    total_updated INT := 0;
BEGIN
    LOOP
        -- バッチごとに更新
        UPDATE users
        SET status = 'active', updated_at = NOW()
        WHERE id IN (
            SELECT id FROM users
            WHERE status IS NULL
            LIMIT batch_size
        );

        GET DIAGNOSTICS updated_count = ROW_COUNT;
        total_updated := total_updated + updated_count;

        -- ログ出力
        RAISE NOTICE 'Updated % rows (total: %)', updated_count, total_updated;

        -- 全て更新したら終了
        EXIT WHEN updated_count = 0;

        -- 短い待機（他のクエリに譲る）
        PERFORM pg_sleep(0.1);
    END LOOP;

    RAISE NOTICE 'Total updated: % rows', total_updated;
END $$;
```

### パターン 8: ENUM 型の変更

#### ✅ 安全な方法

```sql
-- 000016_add_enum_value.up.sql
BEGIN;

-- 新しい値を追加
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'enterprise';

COMMIT;
```

**注意:**

- ENUM からの値の削除は非常に困難
- 新しい ENUM 型を作成して移行する方が安全

---

## 🔄 ロールバック設計

### 原則

1. **データ損失を最小化**

   - 削除ではなく論理削除（`is_active`フラグ）
   - カラム削除前にバックアップテーブルを作成

2. **down.sql は必ず作成**

   - 全てのマイグレーションにロールバック手順を用意
   - データ損失が避けられない場合は明示的にコメント

3. **テスト**
   - up → down → up のサイクルをテスト
   - 開発環境で必ず確認

### ロールバック不可能な場合の対処

```sql
-- down.sql
BEGIN;

-- ⚠️ WARNING: このロールバックはデータを失います
-- カラム'email'を削除すると、データは復元できません

-- それでもロールバックする場合:
-- ALTER TABLE users DROP COLUMN email;

-- 安全のため、手動実行を推奨
RAISE EXCEPTION 'このマイグレーションはロールバック不可能です。手動で実行してください。';

COMMIT;
```

---

## 🧪 テスト手順

### ローカル環境でのテスト

```bash
# 1. 現在の状態を確認
./scripts/migrate-local.sh version

# 2. マイグレーションを適用
./scripts/migrate-local.sh up 1

# 3. データベースを確認
psql -h localhost -p 5432 -U postgres -d go_backend -c "\d table_name"

# 4. ロールバックをテスト
./scripts/migrate-local.sh down 1

# 5. 再度適用して問題ないか確認
./scripts/migrate-local.sh up 1

# 6. アプリケーションの動作確認
go run cmd/api/main.go
```

### CI/CD での自動テスト

```yaml
# .github/workflows/test-migration.yml
name: Test Migrations

on:
  pull_request:
    paths:
      - "backend-go/migrations/**"

jobs:
  test-migration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Run migrations
        run: |
          migrate -path backend-go/migrations \
                  -database "postgres://postgres:password@localhost:5432/test_db?sslmode=disable" \
                  up

      - name: Test rollback
        run: |
          migrate -path backend-go/migrations \
                  -database "postgres://postgres:password@localhost:5432/test_db?sslmode=disable" \
                  down 1

      - name: Re-apply migration
        run: |
          migrate -path backend-go/migrations \
                  -database "postgres://postgres:password@localhost:5432/test_db?sslmode=disable" \
                  up
```

---

## ⚠️ アンチパターン（避けるべき設計）

### ❌ アンチパターン 1: トランザクション内で CONCURRENTLY

```sql
-- これはエラーになる
BEGIN;
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
COMMIT;
```

### ❌ アンチパターン 2: 複数の大きな変更を 1 つに

```sql
-- 複雑すぎて問題の切り分けが困難
ALTER TABLE users ADD COLUMN email VARCHAR(255);
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
CREATE TABLE orders (...);
INSERT INTO llm_pricing VALUES (...);
```

### ❌ アンチパターン 3: データ移行なしの NOT NULL

```sql
-- 既存レコードがあると失敗する
ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL;
```

### ❌ アンチパターン 4: 本番環境で初めてテスト

```sql
-- 開発環境でテストせずにいきなり本番で実行
-- → 問題発生時のリカバリが困難
```

---

## 📊 マイグレーション実行チェックリスト

### 作成時

- [ ] up.sql と down.sql の両方を作成
- [ ] マイグレーションの目的をコメントで明記
- [ ] トランザクションで囲む（CONCURRENTLY を除く）
- [ ] インデックスは CONCURRENTLY で作成
- [ ] NOT NULL 制約は段階的に追加
- [ ] 大量データ更新はバッチ処理

### テスト時

- [ ] ローカル環境で up 実行
- [ ] データベースの状態確認
- [ ] down 実行してロールバック確認
- [ ] 再度 up 実行して冪等性確認
- [ ] アプリケーションの動作確認
- [ ] パフォーマンステスト（大量データ）

### 本番適用前

- [ ] コードレビュー完了
- [ ] 開発環境で十分にテスト
- [ ] バックアップ計画の確認
- [ ] ロールバック手順の確認
- [ ] メンテナンスウィンドウの確保
- [ ] チームへの通知

---

## 📚 参考資料

### 推奨読み物

- [Strong Migrations](https://github.com/ankane/strong_migrations) - Rails だが一般的なパターンが参考になる
- [PostgreSQL Documentation: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Zero-Downtime Migrations](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)

### 関連ドキュメント

- [PRODUCTION_MIGRATION_GUIDE.md](./PRODUCTION_MIGRATION_GUIDE.md) - 本番環境での実行手順
- [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md) - マイグレーションシステムの概要

---

最終更新: 2024 年 11 月
