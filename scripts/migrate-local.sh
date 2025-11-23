#!/bin/bash

# ============================================
# Local Database Migration Script
# ============================================
# ローカル開発環境のデータベースマイグレーション用
# golang-migrateを直接使用
#
# 使い方:
#   ./scripts/migrate-local.sh up              # 全マイグレーション適用
#   ./scripts/migrate-local.sh up 1            # 1ステップのみ適用
#   ./scripts/migrate-local.sh down 1          # 1ステップロールバック
#   ./scripts/migrate-local.sh version         # バージョン確認
#   ./scripts/migrate-local.sh force 3         # バージョン強制設定
# ============================================

set -e

# 色付きログ
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# 設定
MIGRATIONS_PATH="backend-go/migrations"
DATABASE_URL="postgres://postgres:password@localhost:5432/go_backend?sslmode=disable"

# マイグレーションファイルの存在確認
if [ ! -d "$MIGRATIONS_PATH" ]; then
    log_warning "マイグレーションディレクトリが見つかりません: $MIGRATIONS_PATH"
    exit 1
fi

# PostgreSQLが起動しているか確認
if ! docker ps --format "table {{.Names}}" | grep -q "postgres"; then
    log_warning "PostgreSQLコンテナが起動していません"
    log_info "サービスを起動してください: ./dev.sh start"
    exit 1
fi

echo ""
log_info "Local Database Migration"
log_info "Database: localhost:5432/go_backend"
log_info "Migrations: $MIGRATIONS_PATH"
echo ""

# migrate コマンドを実行
migrate -path "$MIGRATIONS_PATH" \
    -database "$DATABASE_URL" \
    -verbose \
    "$@"

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    log_success "マイグレーション完了！"
else
    log_warning "マイグレーション実行完了（警告またはエラーあり）"
fi
echo ""

exit $exit_code







