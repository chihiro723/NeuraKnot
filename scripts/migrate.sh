#!/bin/bash

# ============================================
# Database Migration Script (Production-Ready)
# ============================================
# 本番環境のデータベースマイグレーションを段階的に実行
# golang-migrateを使用した安全なマイグレーション
# 
# 使い方:
#   ./scripts/migrate.sh [environment] [command] [options]
#
# コマンド:
#   status          - 現在のマイグレーション状態を表示
#   up [N]          - マイグレーションを適用（Nステップ指定可能）
#   down N          - マイグレーションをロールバック（要ステップ数）
#   version         - 現在のバージョン番号を表示
#   force VERSION   - マイグレーションバージョンを強制設定（緊急時のみ）
#   history         - マイグレーション履歴を表示
#
# 例:
#   ./scripts/migrate.sh prod status         # 本番環境の状態確認
#   ./scripts/migrate.sh prod up             # 全ての未適用マイグレーションを実行
#   ./scripts/migrate.sh prod up 1           # 次の1つのマイグレーションのみ実行
#   ./scripts/migrate.sh prod down 1         # 最後の1つのマイグレーションをロールバック
#   ./scripts/migrate.sh prod history        # マイグレーション履歴を表示
#   ./scripts/migrate.sh dev up              # 開発環境で全マイグレーション実行
# ============================================

set -eo pipefail

# 色付きログ
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_critical() {
    echo -e "${RED}${BOLD}[CRITICAL]${NC} $1"
}

log_step() {
    echo -e "${CYAN}${BOLD}[STEP]${NC} $1"
}

# ヘルプメッセージ
show_help() {
    echo ""
    echo "Usage: $0 [environment] [command] [options]"
    echo ""
    echo "Environments:"
    echo "  prod    - 本番環境"
    echo "  dev     - 開発環境"
    echo ""
    echo "Commands:"
    echo "  status          - 現在のマイグレーション状態を表示"
    echo "  up [N]          - マイグレーションを適用（Nステップ指定可能）"
    echo "  down N          - マイグレーションをロールバック（要ステップ数）"
    echo "  version         - 現在のバージョン番号を表示"
    echo "  force VERSION   - マイグレーションバージョンを強制設定（緊急時のみ）"
    echo "  history         - マイグレーション履歴を表示"
    echo ""
    echo "Examples:"
    echo "  $0 prod status         # 状態確認"
    echo "  $0 prod up             # 全マイグレーション実行"
    echo "  $0 prod up 1           # 1ステップのみ実行"
    echo "  $0 prod down 1         # 1ステップロールバック"
    echo ""
    exit 1
}

# 引数チェック
if [ $# -lt 2 ]; then
    log_error "引数が不足しています"
    show_help
fi

ENVIRONMENT=$1
COMMAND=$2
OPTION=${3:-}
REGION="ap-northeast-1"

# AWS Profileを設定
export AWS_PROFILE=admin

echo ""
echo "=========================================="
echo "  Database Migration - ${ENVIRONMENT}"
echo "=========================================="
echo ""

log_info "Environment: ${ENVIRONMENT}"
log_info "Command: ${COMMAND}"
if [ -n "$OPTION" ]; then
    log_info "Option: ${OPTION}"
fi
log_info "Region: ${REGION}"
echo ""

# 本番環境の場合、追加の確認
if [ "$ENVIRONMENT" = "prod" ]; then
    if [ "$COMMAND" = "down" ] || [ "$COMMAND" = "force" ]; then
        log_critical "⚠️  WARNING: DESTRUCTIVE OPERATION ON PRODUCTION ⚠️"
        echo ""
        echo -e "${RED}${BOLD}Are you sure you want to perform '$COMMAND' on PRODUCTION database?${NC}"
        read -p "Type 'YES' in capital letters to continue: " -r
        if [ "$REPLY" != "YES" ]; then
            log_info "Operation cancelled"
            exit 0
        fi
    fi
    
    # バックアップの推奨
    if [ "$COMMAND" = "up" ] || [ "$COMMAND" = "down" ]; then
        log_warning "📋 IMPORTANT: データベースバックアップの推奨"
        echo ""
        echo "マイグレーション実行前に、RDSスナップショットを取得することを強く推奨します。"
        echo ""
        echo "バックアップコマンド:"
        echo "  aws rds create-db-snapshot \\"
        echo "    --db-instance-identifier neuraknot-${ENVIRONMENT}-db \\"
        echo "    --db-snapshot-identifier neuraknot-${ENVIRONMENT}-pre-migration-\$(date +%Y%m%d-%H%M%S) \\"
        echo "    --region ${REGION}"
        echo ""
        read -p "バックアップを取得しましたか？ (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_warning "バックアップを取得してから再度実行してください"
            exit 0
        fi
    fi
fi

# プロジェクトルートに移動
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

log_info "Project root: $PROJECT_ROOT"

# Terraformから情報を取得
cd "$PROJECT_ROOT/terraform/environments/$ENVIRONMENT"

log_step "1/4 Terraformから設定を取得中..."

if [ ! -f "secrets.tfvars" ]; then
    log_error "secrets.tfvars が見つかりません"
    exit 1
fi

DB_HOST=$(terraform output -raw rds_host 2>/dev/null || echo "")
DB_PORT=$(terraform output -raw rds_port 2>/dev/null || echo "5432")
DB_NAME=$(terraform output -raw rds_database_name 2>/dev/null || echo "")
DB_USER=$(terraform output -raw rds_username 2>/dev/null || echo "")
DB_PASSWORD=$(grep 'db_password' secrets.tfvars | cut -d'"' -f2)

if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    log_error "Terraform outputsから必要な情報を取得できませんでした"
    log_info "terraform apply を実行してください"
    exit 1
fi

log_success "設定取得完了"
log_info "DB Host: $DB_HOST"
log_info "DB Name: $DB_NAME"
log_info "DB User: $DB_USER"

cd "$PROJECT_ROOT"

# Bastion経由のポートフォワーディング確認
log_step "2/4 データベース接続の確認..."

if [ "$ENVIRONMENT" = "prod" ]; then
    log_warning "⚠️  本番環境へはBastion経由でアクセスします"
    log_warning "別のターミナルで以下のコマンドを実行してください:"
    echo ""
    echo "  ssh -i ~/.ssh/neuraknot-bastion-key.pem -L 5433:${DB_HOST}:${DB_PORT} ec2-user@<BASTION_PUBLIC_IP> -N"
    echo ""
    echo "または、ECS Exec経由でマイグレーションコンテナから実行することも可能です。"
    echo ""
    read -p "ポートフォワーディングを設定しましたか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "ポートフォワーディングを設定してから再実行してください"
        exit 1
    fi
    
    # 本番環境はポートフォワーディング経由
    DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@localhost:5433/${DB_NAME}?sslmode=require"
else
    # 開発環境は直接接続
    DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
fi

log_success "接続情報構築完了"

# マイグレーションファイルの存在確認
MIGRATIONS_PATH="backend-go/migrations"
if [ ! -d "$MIGRATIONS_PATH" ]; then
    log_error "マイグレーションディレクトリが見つかりません: $MIGRATIONS_PATH"
    exit 1
fi

MIGRATION_COUNT=$(ls -1 "$MIGRATIONS_PATH"/*.up.sql 2>/dev/null | wc -l | tr -d ' ')
log_info "利用可能なマイグレーション: $MIGRATION_COUNT ファイル"

# 現在のバージョンを取得する関数
get_current_version() {
    local version_output
    version_output=$(migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" version 2>&1 || true)
    
    if echo "$version_output" | grep -q "no migration"; then
        echo "0"
    else
        echo "$version_output" | grep -oE '[0-9]+' | head -1 || echo "0"
    fi
}

# マイグレーション状態を表示
show_status() {
    log_step "3/4 現在のマイグレーション状態を確認中..."
    echo ""
    
    local current_version
    current_version=$(get_current_version)
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  📊 Migration Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Current Version: ${BOLD}${current_version}${NC}"
    echo "  Available Migrations: ${MIGRATION_COUNT}"
    echo ""
    
    # 適用済みと未適用を区別
    local applied=0
    local pending=0
    
    if [ "$current_version" = "0" ]; then
        pending=$MIGRATION_COUNT
    else
        applied=$current_version
        pending=$((MIGRATION_COUNT - current_version))
    fi
    
    echo "  ✅ Applied: ${GREEN}${applied}${NC} migrations"
    echo "  📋 Pending: ${YELLOW}${pending}${NC} migrations"
    echo ""
    
    # 利用可能なマイグレーション一覧
    echo "  Available Migrations:"
    for file in "$MIGRATIONS_PATH"/*.up.sql; do
        if [ -f "$file" ]; then
            local basename=$(basename "$file")
            local version=$(echo "$basename" | grep -oE '^[0-9]+')
            local name=$(echo "$basename" | sed -E 's/^[0-9]+_(.*)\.up\.sql$/\1/')
            
            if [ "$version" -le "$current_version" ]; then
                echo "    ${GREEN}✓${NC} ${version}: ${name}"
            else
                echo "    ${YELLOW}○${NC} ${version}: ${name}"
            fi
        fi
    done
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# マイグレーション履歴を表示
show_history() {
    log_step "マイグレーション履歴を取得中..."
    echo ""
    
    # schema_migrationsテーブルから履歴を取得
    PGPASSWORD="$DB_PASSWORD" psql -h "$(echo $DATABASE_URL | grep -oP '(?<=@)[^:]+' || echo 'localhost')" \
        -p "$(echo $DATABASE_URL | grep -oP '(?<=:)[0-9]+(?=/)' || echo '5433')" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "SELECT version, dirty FROM schema_migrations ORDER BY version;" 2>/dev/null || {
        log_warning "マイグレーション履歴テーブルが存在しません（初回マイグレーション前）"
    }
    echo ""
}

# コマンド実行
case "$COMMAND" in
    status)
        show_status
        ;;
    
    version)
        current_version=$(get_current_version)
        echo ""
        echo "Current Migration Version: ${BOLD}${current_version}${NC}"
        echo ""
        ;;
    
    history)
        show_history
        ;;
    
    up)
        show_status
        
        log_step "4/4 マイグレーションを実行中..."
        echo ""
        
        if [ -n "$OPTION" ]; then
            # ステップ数指定
            log_info "実行: ${OPTION} ステップのマイグレーションを適用"
            if ! migrate -path "$MIGRATIONS_PATH" \
                -database "$DATABASE_URL" \
                -verbose \
                up "$OPTION"; then
                log_error "マイグレーション失敗"
                exit 1
            fi
        else
            # 全てのマイグレーション
            log_info "実行: 全ての未適用マイグレーションを適用"
            if ! migrate -path "$MIGRATIONS_PATH" \
                -database "$DATABASE_URL" \
                -verbose \
                up; then
                # ErrNoChange は正常
                if [ $? -eq 0 ]; then
                    log_info "マイグレーション不要（既に最新）"
                else
                    log_error "マイグレーション失敗"
                    exit 1
                fi
            fi
        fi
        
        echo ""
        log_success "✓ マイグレーション完了"
        
        # 最終状態を表示
        current_version=$(get_current_version)
        echo ""
        log_info "最終バージョン: ${BOLD}${current_version}${NC}"
        ;;
    
    down)
        if [ -z "$OPTION" ]; then
            log_error "downコマンドにはステップ数の指定が必要です"
            echo "例: $0 $ENVIRONMENT down 1"
            exit 1
        fi
        
        show_status
        
        log_critical "⚠️  ロールバック実行: ${OPTION} ステップ"
        echo ""
        
        log_step "4/4 ロールバックを実行中..."
        
        if ! migrate -path "$MIGRATIONS_PATH" \
            -database "$DATABASE_URL" \
            -verbose \
            down "$OPTION"; then
            log_error "ロールバック失敗"
            exit 1
        fi
        
        echo ""
        log_success "✓ ロールバック完了"
        
        current_version=$(get_current_version)
        echo ""
        log_info "最終バージョン: ${BOLD}${current_version}${NC}"
        ;;
    
    force)
        if [ -z "$OPTION" ]; then
            log_error "forceコマンドにはバージョン番号の指定が必要です"
            echo "例: $0 $ENVIRONMENT force 3"
            exit 1
        fi
        
        log_critical "⚠️  バージョン強制設定: ${OPTION}"
        log_warning "これはマイグレーションを実行せず、バージョン番号のみを変更します"
        log_warning "通常はdirty stateからの復旧時のみ使用してください"
        echo ""
        
        read -p "本当に実行しますか？ (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "キャンセルしました"
            exit 0
        fi
        
        if ! migrate -path "$MIGRATIONS_PATH" \
            -database "$DATABASE_URL" \
            force "$OPTION"; then
            log_error "バージョン設定失敗"
            exit 1
        fi
        
        log_success "✓ バージョンを ${OPTION} に設定しました"
        ;;
    
    *)
        log_error "不明なコマンド: $COMMAND"
        show_help
        ;;
esac

echo ""
echo "=========================================="
log_success "操作完了"
echo "=========================================="
echo ""

# データベース確認用のコマンドを表示
if [ "$COMMAND" = "up" ] || [ "$COMMAND" = "down" ]; then
    log_info "データベースの確認:"
    echo ""
    if [ "$ENVIRONMENT" = "prod" ]; then
        echo "  PGPASSWORD='${DB_PASSWORD}' psql -h localhost -p 5433 -U ${DB_USER} -d ${DB_NAME}"
    else
        echo "  PGPASSWORD='${DB_PASSWORD}' psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}"
    fi
    echo ""
    echo "  \\dt                            -- テーブル一覧"
    echo "  SELECT * FROM schema_migrations;  -- マイグレーション履歴"
    echo ""
fi
