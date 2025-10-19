# データベースマイグレーションガイド

## 概要

NeuraKnotプロジェクトのデータベースマイグレーションは、ECSタスクとして実行されます。
開発中は、実行するたびにデータベースをリセット（全テーブル削除）して、クリーンな状態からスキーマを適用します。

## マイグレーションの実行

### 基本的な使い方

```bash
# プロジェクトルートで実行
./scripts/migrate.sh
```

このコマンドは以下を自動的に実行します:

1. Terraformから接続情報を取得
2. マイグレーション用Dockerイメージをビルド
3. ECRにイメージをプッシュ
4. ECSタスクとしてマイグレーションを実行
5. データベースをリセット（全テーブル削除）
6. スキーマを適用
7. 実行ログを表示

### 実行結果

マイグレーションが成功すると、以下のテーブルが作成されます:

- `users` - ユーザー情報
- `ai_agents` - AIエージェント
- `ai_agent_services` - AIエージェントサービス設定
- `ai_chat_sessions` - AIチャットセッション
- `ai_tool_usage` - AIツール使用履歴
- `conversations` - 会話
- `messages` - メッセージ
- `user_service_configs` - ユーザーサービス設定

## アーキテクチャ

### マイグレーションコマンド

`backend-go/cmd/migrate/main.go` - マイグレーション専用のGoコマンド

**オプション:**
- `-create-db`: データベースが存在しない場合は作成
- `-reset`: すべてのテーブルを削除して再作成（開発用）
- `-force`: テーブルが存在してもマイグレーションを強制実行

### マイグレーション実装

`backend-go/internal/infrastructure/database/migration.go`

**主要な関数:**
- `RunMigrations()`: マイグレーションファイルを順番に実行
- `ResetDatabase()`: publicスキーマを削除して再作成
- `CheckTablesExist()`: 必要なテーブルが存在するか確認
- `EnsureDatabase()`: データベースが存在することを確認

### マイグレーションファイル

`backend-go/internal/infrastructure/database/migrations/`

マイグレーションファイルは連番で管理されます:
- `001_initial_schema.sql` - 初期スキーマ
- `002_add_xxx.sql` - 追加のマイグレーション（今後）

### Docker

`backend-go/docker/Dockerfile.migrate` - マイグレーション専用の軽量イメージ

**特徴:**
- マルチステージビルドで最適化
- 非rootユーザーで実行
- linux/amd64プラットフォーム対応

### 実行スクリプト

`scripts/migrate.sh` - マイグレーション実行スクリプト

**処理フロー:**
1. Terraformから以下を取得:
   - クラスター名
   - サブネットID
   - DB接続情報
2. Backend Goサービスから以下を取得:
   - セキュリティグループ
   - IAMロール（Execution Role / Task Role）
3. Dockerイメージをビルド＆プッシュ
4. ECSタスク定義を作成
5. ECSタスクを実行
6. ログを表示

## トラブルシューティング

### マイグレーションが失敗する

**原因:** ネットワーク設定やIAMロールの問題

**解決方法:**
1. CloudWatch Logsでエラーを確認:
   ```bash
   aws logs tail /ecs/neuraKnot-prod-migrate --since 10m --region ap-northeast-1
   ```
2. Backend Goサービスが正常に動作しているか確認
3. RDSのセキュリティグループ設定を確認

### ECRプッシュが失敗する

**原因:** ECRリポジトリが存在しない

**解決方法:**
```bash
aws ecr create-repository \
  --repository-name neuraknot-prod-migrate \
  --region ap-northeast-1 \
  --image-scanning-configuration scanOnPush=true
```

### データベース接続エラー

**原因:** 接続情報が正しくない、またはRDSが起動していない

**解決方法:**
1. RDSの状態を確認:
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier neuraknot-prod-db \
     --region ap-northeast-1 \
     --query 'DBInstances[0].DBInstanceStatus'
   ```
2. `terraform/environments/prod/secrets.tfvars`のパスワードを確認

## 新しいマイグレーションの追加

1. マイグレーションファイルを作成:
   ```bash
   touch backend-go/internal/infrastructure/database/migrations/002_add_new_table.sql
   ```

2. SQLを記述:
   ```sql
   -- 002_add_new_table.sql
   CREATE TABLE new_table (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       name VARCHAR(255) NOT NULL,
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. マイグレーションを実行:
   ```bash
   ./scripts/migrate.sh
   ```

マイグレーションは自動的にファイル名順に実行されます。

## 本番環境での注意事項

現在の設定は開発用です。本番環境では以下の変更が必要です:

1. **`-reset`フラグを削除**
   - `scripts/migrate.sh`の`command`から`"-reset"`を削除
   - データが削除されないようにする

2. **マイグレーションバージョン管理を追加**
   - 実行済みマイグレーションを記録するテーブルを作成
   - 未実行のマイグレーションのみを実行するロジックを追加

3. **ロールバック機能を追加**
   - ダウンマイグレーション用のSQLファイルを作成
   - ロールバックコマンドを実装

## 参考

- [マイグレーションコマンド](../backend-go/cmd/migrate/main.go)
- [マイグレーション実装](../backend-go/internal/infrastructure/database/migration.go)
- [スキーマファイル](../backend-go/schema/schema.sql)
- [Terraform AWS コマンド](./TERRAFORM_AWS_COMMANDS.md)

---

最終更新: 2025-10-20

