# 本番環境 DB マイグレーション実行ガイド

## 📋 概要

本ドキュメントは、NeuraKnot の本番環境データベースに対して安全にマイグレーションを実行するための手順をまとめています。

**重要**: 本番環境への変更は慎重に行ってください。必ずバックアップを取得し、メンテナンスウィンドウ内で実行することを推奨します。

---

## 🎯 基本方針

### 破壊的変更からの脱却

以前の方式（完全リセット）から、段階的マイグレーション方式に移行しました：

| 項目               | 旧方式      | 新方式                |
| ------------------ | ----------- | --------------------- |
| **データ保持**     | ❌ 全削除   | ✅ 保持               |
| **ロールバック**   | ❌ 不可     | ✅ 可能               |
| **段階的適用**     | ❌ 一括のみ | ✅ 1 ステップずつ可能 |
| **バージョン管理** | ❌ なし     | ✅ あり               |

---

## 🛠️ 事前準備

### 1. 必要なツールのインストール

```bash
# golang-migrateのインストール
brew install golang-migrate

# バージョン確認
migrate -version
```

### 2. AWS 認証情報の設定

```bash
# AWS CLIの設定確認
aws configure list --profile admin

# Terraformの初期化
cd terraform/environments/prod
terraform init
```

### 3. Bastion ホストへのアクセス確認

```bash
# Bastionの公開IPを取得
cd terraform/environments/prod
terraform output bastion_public_ip

# SSH接続テスト
ssh -i ~/.ssh/neuraknot-bastion-key.pem ec2-user@<BASTION_IP>
```

---

## 📊 マイグレーション状態の確認

### 現在の状態を確認

```bash
./scripts/migrate.sh prod status
```

**出力例:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 Migration Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current Version: 5
  Available Migrations: 7

  ✅ Applied: 5 migrations
  📋 Pending: 2 migrations

  Available Migrations:
    ✓ 1: initial_schema
    ✓ 2: add_billing_system
    ✓ 3: seed_llm_pricing
    ✓ 4: add_group_chat
    ✓ 5: add_group_chat_to_sessions
    ○ 6: add_system_prompt_to_group_chats
    ○ 7: add_group_message_to_tool_usage
```

### マイグレーション履歴の確認

```bash
./scripts/migrate.sh prod history
```

---

## 🚀 マイグレーション実行手順

### ステップ 1: バックアップの取得 (必須)

```bash
# RDSスナップショットの作成
aws rds create-db-snapshot \
  --db-instance-identifier neuraknot-prod-db \
  --db-snapshot-identifier neuraknot-prod-pre-migration-$(date +%Y%m%d-%H%M%S) \
  --region ap-northeast-1 \
  --profile admin

# スナップショット作成状態の確認
aws rds describe-db-snapshots \
  --db-instance-identifier neuraknot-prod-db \
  --region ap-northeast-1 \
  --profile admin \
  --query 'DBSnapshots[0].[DBSnapshotIdentifier,Status,PercentProgress]' \
  --output table
```

**重要**: スナップショットが`available`になるまで待機してください（通常 5-15 分）。

### ステップ 2: Bastion ホスト経由でポートフォワーディング

**別のターミナルウィンドウで実行**:

```bash
# Bastion IPを環境変数に設定
export BASTION_IP=$(cd terraform/environments/prod && terraform output -raw bastion_public_ip)

# ポートフォワーディング開始（このターミナルは開いたままにする）
ssh -i ~/.ssh/neuraknot-bastion-key.pem \
  -L 5433:$(cd terraform/environments/prod && terraform output -raw rds_host):5432 \
  ec2-user@${BASTION_IP} -N
```

**接続確認**:

```bash
# 別のターミナルで接続テスト
PGPASSWORD='your_password' psql -h localhost -p 5433 -U postgres -d neuraknot -c '\l'
```

### ステップ 3: マイグレーション実行

#### パターン A: 段階的マイグレーション（推奨）

次の 1 つのマイグレーションのみを適用:

```bash
./scripts/migrate.sh prod up 1
```

**確認 → 問題なければ次のマイグレーションを実行:**

```bash
./scripts/migrate.sh prod status  # 状態確認
./scripts/migrate.sh prod up 1    # 次のマイグレーション
```

#### パターン B: 全マイグレーション一括実行

全ての未適用マイグレーションを一度に実行:

```bash
./scripts/migrate.sh prod up
```

**注意**: 本番環境では段階的実行（パターン A）を推奨します。

### ステップ 4: 動作確認

```bash
# データベースに接続
PGPASSWORD='your_password' psql -h localhost -p 5433 -U postgres -d neuraknot

# 確認SQLを実行
\dt                                     -- テーブル一覧
\d table_name                           -- テーブル定義確認
SELECT * FROM schema_migrations;        -- マイグレーション履歴
SELECT COUNT(*) FROM users;             -- データ確認（例）
```

### ステップ 5: アプリケーションの動作確認

1. **ECS タスクの再起動**（必要に応じて）:

   ```bash
   aws ecs update-service \
     --cluster neuraknot-prod-cluster \
     --service backend-go-service \
     --force-new-deployment \
     --region ap-northeast-1 \
     --profile admin
   ```

2. **ヘルスチェック**:

   ```bash
   curl https://api.neuraknot.net/health
   ```

3. **CloudWatch ログの確認**:
   ```bash
   aws logs tail /ecs/neuraknot-prod-backend-go \
     --follow \
     --region ap-northeast-1 \
     --profile admin
   ```

---

## 🔄 ロールバック手順

マイグレーション実行後に問題が発生した場合のロールバック手順:

### 1. 即座のロールバック

```bash
# 最後の1つのマイグレーションをロールバック
./scripts/migrate.sh prod down 1

# 確認
./scripts/migrate.sh prod status
```

### 2. スナップショットからの復元（重大な問題の場合）

```bash
# 利用可能なスナップショットを確認
aws rds describe-db-snapshots \
  --db-instance-identifier neuraknot-prod-db \
  --region ap-northeast-1 \
  --profile admin \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]' \
  --output table

# スナップショットから新しいインスタンスを復元
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier neuraknot-prod-db-restored \
  --db-snapshot-identifier neuraknot-prod-pre-migration-YYYYMMDD-HHMMSS \
  --db-subnet-group-name neuraknot-prod-db-subnet-group \
  --publicly-accessible false \
  --region ap-northeast-1 \
  --profile admin
```

**注意**: スナップショットからの復元は最終手段です。データの損失が発生する可能性があります。

---

## ⚠️ トラブルシューティング

### マイグレーションが dirty state になった場合

```
error: Dirty database version 3. Fix and force version.
```

**原因**: マイグレーションが途中で失敗し、不整合な状態になっている。

**対処法**:

1. データベースの状態を確認:

   ```sql
   SELECT * FROM schema_migrations;
   ```

2. 手動でマイグレーションを修正:

   ```sql
   -- 問題のあるマイグレーションを確認して手動で修正
   ```

3. バージョンを強制設定:

   ```bash
   ./scripts/migrate.sh prod force 3
   ```

4. 再度マイグレーション実行:
   ```bash
   ./scripts/migrate.sh prod up 1
   ```

### ポートフォワーディングが切れた場合

```
Error: dial tcp 127.0.0.1:5433: connect: connection refused
```

**対処法**:

1. SSH セッションを確認
2. ポートフォワーディングを再起動
3. マイグレーションを再実行

### タイムアウトエラー

```
Error: pq: canceling statement due to statement timeout
```

**対処法**:

1. マイグレーションファイルを確認（大量データの変更がある場合）
2. メンテナンスウィンドウ内で実行
3. 必要に応じてタイムアウト値を調整

---

## 📝 ベストプラクティス

### 1. マイグレーション実行のタイミング

- ✅ メンテナンスウィンドウ内（深夜など）
- ✅ トラフィックが少ない時間帯
- ✅ チーム全員が対応可能な時間
- ❌ ピーク時間帯
- ❌ 金曜日の夕方

### 2. 事前確認事項

- [ ] 開発環境で正常に動作することを確認済み
- [ ] マイグレーションファイルのレビュー完了
- [ ] ロールバック手順の確認済み
- [ ] バックアップ取得完了
- [ ] チームメンバーへの通知済み
- [ ] メンテナンスモードの準備（必要に応じて）

### 3. マイグレーション作成のルール

- ✅ 1 つのマイグレーションで 1 つの変更のみ
- ✅ down.sql ファイルを必ず作成（ロールバック可能に）
- ✅ 既存データの移行ロジックを含める
- ✅ NOT NULL 制約の追加は段階的に（デフォルト値設定 → NOT NULL 追加）
- ❌ 複数の大きな変更を 1 つのマイグレーションに含めない

### 4. マイグレーション後の確認

- [ ] schema_migrations テーブルの確認
- [ ] 新しいテーブル/カラムの存在確認
- [ ] データの整合性確認
- [ ] アプリケーションの動作確認
- [ ] CloudWatch ログの確認
- [ ] エラーログの確認

---

## 🔐 セキュリティ考慮事項

### 1. 認証情報の管理

- 本番環境の認証情報は**絶対にコミットしない**
- `secrets.tfvars`は`.gitignore`に含まれていることを確認
- AWS Secrets Manager の使用を検討

### 2. アクセス制限

- 本番 DB への直接アクセスは Bastion 経由のみ
- IAM ロールによるアクセス制御
- マイグレーション実行者の記録

### 3. 監査ログ

- マイグレーション実行履歴の記録
- CloudTrail での API 呼び出し記録
- RDS イベントログの確認

---

## 📞 サポート

### 問題が発生した場合

1. **即座に**: マイグレーションを停止
2. **確認**: エラーメッセージとログを確認
3. **判断**: ロールバックまたはスナップショット復元を検討
4. **連絡**: チームメンバーに報告

### ドキュメント

- [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md) - マイグレーション設計
- [BASTION_USAGE.md](../scripts/BASTION_USAGE.md) - Bastion 使用方法
- [SSM_RDS_CONNECTION_GUIDE.md](./backend/SSM_RDS_CONNECTION_GUIDE.md) - RDS 接続方法

---

## ✅ チェックリスト

### マイグレーション実行前

- [ ] バックアップ取得完了
- [ ] Bastion ホスト経由の接続確認
- [ ] 開発環境での動作確認完了
- [ ] マイグレーションファイルのレビュー完了
- [ ] ロールバック手順の理解
- [ ] メンテナンスウィンドウ内での実行
- [ ] チームへの通知完了

### マイグレーション実行後

- [ ] マイグレーション成功確認
- [ ] データベース整合性確認
- [ ] アプリケーション動作確認
- [ ] エラーログの確認
- [ ] パフォーマンスの確認
- [ ] チームへの完了報告

---

最終更新: 2024 年 11 月






