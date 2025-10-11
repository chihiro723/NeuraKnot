# データベースマイグレーション

## 概要

BridgeSpeak のデータベーススキーマを管理するマイグレーションファイルです。

## MVP 構成

### フェーズ 1: 基本機能（必須）

| #      | マイグレーション             | 説明                       |
| ------ | ---------------------------- | -------------------------- |
| 000001 | `create_users_table`         | ユーザー情報（既存）       |
| 000002 | `create_ai_agents_table`     | AI Agent（ペルソナ統合版） |
| 000003 | `create_conversations_table` | 会話（user ↔ ai のみ）     |
| 000004 | `create_messages_table`      | メッセージ                 |

### フェーズ 2: AI 処理履歴（推奨）

| #      | マイグレーション                | 説明                  |
| ------ | ------------------------------- | --------------------- |
| 000005 | `create_ai_chat_sessions_table` | AI 処理セッション履歴 |
| 000006 | `create_ai_tool_usage_table`    | ツール使用履歴        |

### フェーズ 3: MCP 統合（オプション）

後回し。必要に応じて実装。

## マイグレーション実行

### 前提条件

1. PostgreSQL が起動している
2. `golang-migrate` がインストールされている

```bash
# macOS
brew install golang-migrate

# Linux
curl -L https://github.com/golang-migrate/migrate/releases/download/v4.17.0/migrate.linux-amd64.tar.gz | tar xvz
sudo mv migrate /usr/local/bin/
```

### 環境変数設定

```bash
# .envファイルを作成
cp .env.example .env

# DATABASE_URLを設定
export DATABASE_URL="postgresql://backend_go_user:secure_password@localhost:5432/bridgespeak?sslmode=disable"
```

### マイグレーション実行

#### すべてのマイグレーションを適用

```bash
cd backend-go
migrate -database "${DATABASE_URL}" -path migrations up
```

#### 特定のバージョンまで適用

```bash
# フェーズ1のみ（000001-000004）
migrate -database "${DATABASE_URL}" -path migrations up 4

# フェーズ2まで（000001-000006）
migrate -database "${DATABASE_URL}" -path migrations up 6
```

#### マイグレーションの状態確認

```bash
migrate -database "${DATABASE_URL}" -path migrations version
```

#### ロールバック

```bash
# 1つ戻す
migrate -database "${DATABASE_URL}" -path migrations down 1

# すべてロールバック（注意！）
migrate -database "${DATABASE_URL}" -path migrations down
```

### Docker Compose 経由での実行

```bash
# 開発環境を起動（自動でマイグレーション実行）
./dev.sh up

# 手動でマイグレーション実行
docker-compose -f docker-compose/dev.yml exec backend-go migrate -database "${DATABASE_URL}" -path migrations up
```

## マイグレーションファイルの追加

新しいマイグレーションを作成：

```bash
cd backend-go

# 新しいマイグレーションファイルを作成
migrate create -ext sql -dir migrations -seq create_new_table

# 生成されるファイル:
# migrations/000007_create_new_table.up.sql
# migrations/000007_create_new_table.down.sql
```

## テーブル構造

詳細は `docs/DATABASE_DESIGN_MVP.md` を参照。

### 依存関係

```
users (000001)
  ↓
ai_agents (000002)
  ↓
conversations (000003)
  ↓
messages (000004)
  ↓
ai_chat_sessions (000005)
  ↓
ai_tool_usage (000006)
```

## トラブルシューティング

### エラー: "Dirty database version"

マイグレーションが途中で失敗した場合：

```bash
# 現在のバージョンを確認
migrate -database "${DATABASE_URL}" -path migrations version

# 強制的にバージョンを設定（注意！）
migrate -database "${DATABASE_URL}" -path migrations force <version>

# 再実行
migrate -database "${DATABASE_URL}" -path migrations up
```

### エラー: "relation already exists"

既にテーブルが存在する場合、手動で削除：

```sql
-- PostgreSQLに接続
psql -U backend_go_user -d bridgespeak

-- テーブルを確認
\dt

-- 必要に応じて削除（注意！データも消える）
DROP TABLE IF EXISTS ai_tool_usage CASCADE;
DROP TABLE IF EXISTS ai_chat_sessions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS ai_agents CASCADE;
-- usersは削除しない（既存データがある場合）
```

### エラー: "no such file or directory"

migrations ディレクトリが見つからない場合：

```bash
# 正しいディレクトリにいるか確認
pwd
# /Users/xxx/bridgespeak/backend-go であるべき

# migrationsディレクトリを確認
ls -la migrations/
```

## データベースの初期化（クリーンスタート）

開発環境で完全にリセットしたい場合：

```bash
# 1. コンテナを停止・削除
./dev.sh down

# 2. ボリュームも削除（データベースの内容が消える！）
docker volume rm docker-compose_postgres_data

# 3. 再起動（マイグレーションが自動実行される）
./dev.sh up
```

## CI/CD での実行

GitHub Actions などで自動実行する場合：

```yaml
# .github/workflows/migrate.yml
- name: Run migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    cd backend-go
    migrate -database "${DATABASE_URL}" -path migrations up
```

## 参考

- [golang-migrate ドキュメント](https://github.com/golang-migrate/migrate)
- [DATABASE_DESIGN_MVP.md](../../docs/DATABASE_DESIGN_MVP.md) - MVP 版のデータベース設計書
- [DATABASE_DESIGN.md](../../docs/DATABASE_DESIGN.md) - 完全版のデータベース設計書（将来の拡張用）
