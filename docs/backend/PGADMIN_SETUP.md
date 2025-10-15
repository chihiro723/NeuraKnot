# pgAdmin セットアップガイド

## 概要
pgAdminは、PostgreSQLデータベースをGUIで管理するためのWebベースの管理ツールです。Docker Composeを使用して簡単にセットアップできます。

## セットアップ

### 1. 開発環境での起動
```bash
# 開発環境でpgAdminを含む全サービスを起動
docker-compose -f docker-compose/dev.yml up -d

# または、pgAdminのみを起動
docker-compose -f docker-compose/dev.yml up -d pgadmin
```

### 2. 本番環境での起動
```bash
# 本番環境でpgAdminを含む全サービスを起動
docker-compose -f docker-compose/prod.yml up -d

# または、pgAdminのみを起動
docker-compose -f docker-compose/prod.yml up -d pgadmin
```

## アクセス方法

### 1. Webブラウザでアクセス
- **URL**: http://localhost:5050
- **ログイン情報**:
  - **Email**: admin@example.com
  - **Password**: admin

### 2. 初回ログイン後の設定
1. pgAdminにログイン後、左側の「Servers」を右クリック
2. 「Register」→「Server...」を選択
3. 「General」タブで以下を設定:
   - **Name**: BridgeSpeak DB (任意の名前)
4. 「Connection」タブで以下を設定:
   - **Host name/address**: postgres
   - **Port**: 5432
   - **Maintenance database**: go_backend
   - **Username**: postgres
   - **Password**: password
5. 「Save」をクリック

## 主要機能

### 1. データベース管理
- テーブルの作成・編集・削除
- インデックスの管理
- 制約の設定
- ビューの作成・管理

### 2. データ操作
- テーブルデータの閲覧・編集
- SQLクエリの実行
- データのエクスポート・インポート
- バックアップ・リストア

### 3. スキーマ管理
- テーブル構造の可視化
- リレーションシップの確認
- データベース設計の検証

## 便利な機能

### 1. SQLクエリエディタ
- シンタックスハイライト
- 自動補完
- クエリ実行履歴
- 結果のエクスポート

### 2. データベース統計
- テーブルサイズの確認
- インデックス使用状況
- クエリパフォーマンス分析

### 3. ユーザー管理
- ユーザーの作成・編集
- 権限の設定
- ロールの管理

## トラブルシューティング

### 1. 接続できない場合
```bash
# コンテナの状態を確認
docker-compose -f docker-compose/dev.yml ps

# ログを確認
docker-compose -f docker-compose/dev.yml logs pgadmin
```

### 2. データベースに接続できない場合
- PostgreSQLコンテナが起動しているか確認
- ネットワーク設定を確認
- 認証情報が正しいか確認

### 3. パフォーマンスが遅い場合
- ブラウザのキャッシュをクリア
- 不要なクエリを停止
- インデックスの最適化を検討

## セキュリティ注意事項

### 1. 本番環境での使用
- デフォルトのパスワードを変更
- 環境変数でパスワードを管理
- アクセス制限を設定

### 2. ネットワーク設定
- 必要に応じてポートを制限
- VPN経由でのアクセスを検討
- ファイアウォール設定を確認

## 参考リンク
- [pgAdmin公式ドキュメント](https://www.pgadmin.org/docs/)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- [Docker Compose公式ドキュメント](https://docs.docker.com/compose/)
