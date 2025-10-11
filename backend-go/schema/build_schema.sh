#!/bin/bash

# ===========================================
# BridgeSpeak Schema Builder v1.0
# 統合スキーマファイルを使用してデータベースを構築
# ===========================================

set -e  # エラー時に停止

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
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

# 設定
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-password}
DB_NAME=${DB_NAME:-go_backend}
DB_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="${SCRIPT_DIR}/schema.sql"
MOCK_DATA_FILE="${SCRIPT_DIR}/mock_data.sql"

# オプション解析
INCLUDE_MOCK_DATA=false
FORCE_RECREATE=false
SKIP_CONFIRMATION=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --with-mock-data)
            INCLUDE_MOCK_DATA=true
            shift
            ;;
        --force)
            FORCE_RECREATE=true
            shift
            ;;
        --yes)
            SKIP_CONFIRMATION=true
            shift
            ;;
        --help)
            echo "BridgeSpeak Schema Builder"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --with-mock-data   モックデータも投入する"
            echo "  --force           既存のデータベースを強制再作成"
            echo "  --yes             確認なしで実行"
            echo "  --help            このヘルプを表示"
            echo ""
            echo "Environment Variables:"
            echo "  DB_HOST          データベースホスト (default: localhost)"
            echo "  DB_PORT          データベースポート (default: 5432)"
            echo "  DB_USER          データベースユーザー (default: postgres)"
            echo "  DB_PASSWORD      データベースパスワード (default: password)"
            echo "  DB_NAME          データベース名 (default: bridgespeak)"
            exit 0
            ;;
        *)
            log_error "不明なオプション: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# ファイル存在確認
if [[ ! -f "$SCHEMA_FILE" ]]; then
    log_error "スキーマファイルが見つかりません: $SCHEMA_FILE"
    exit 1
fi

if [[ "$INCLUDE_MOCK_DATA" == true && ! -f "$MOCK_DATA_FILE" ]]; then
    log_error "モックデータファイルが見つかりません: $MOCK_DATA_FILE"
    exit 1
fi

# 確認メッセージ
log_info "BridgeSpeak データベーススキーマ構築を開始します"
log_info "データベース: $DB_NAME"
log_info "ホスト: $DB_HOST:$DB_PORT"
log_info "ユーザー: $DB_USER"

if [[ "$INCLUDE_MOCK_DATA" == true ]]; then
    log_info "モックデータ: 投入する"
else
    log_info "モックデータ: 投入しない"
fi

if [[ "$FORCE_RECREATE" == true ]]; then
    log_warning "既存のデータベースを強制再作成します"
fi

if [[ "$SKIP_CONFIRMATION" != true ]]; then
    echo ""
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "キャンセルしました"
        exit 0
    fi
fi

# データベース接続確認
log_info "データベース接続を確認中..."
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "データベースサーバーに接続できません"
    log_error "接続情報を確認してください: $DB_HOST:$DB_PORT"
    exit 1
fi
log_success "データベース接続確認完了"

# データベース存在確認と作成/削除
log_info "データベース '$DB_NAME' の状態を確認中..."
DB_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -t -c "SELECT COUNT(*) FROM pg_database WHERE datname = '$DB_NAME';" | tr -d ' ')

if [[ "$DB_EXISTS" == "1" ]]; then
    if [[ "$FORCE_RECREATE" == true ]]; then
        log_warning "既存のデータベース '$DB_NAME' を削除中..."
        # アクティブな接続を終了してからデータベースを削除
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true
        sleep 1
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        log_success "データベース削除完了"
        DB_EXISTS="0"
    else
        log_warning "データベース '$DB_NAME' は既に存在します"
        log_warning "既存のデータベースを使用します（--force オプションで再作成可能）"
    fi
fi

# データベース作成
if [[ "$DB_EXISTS" == "0" ]]; then
    log_info "データベース '$DB_NAME' を作成中..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
    log_success "データベース作成完了"
fi

# スキーマ構築
log_info "スキーマを構築中..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE"; then
    log_success "スキーマ構築完了"
else
    log_error "スキーマ構築に失敗しました"
    exit 1
fi

# モックデータ投入
if [[ "$INCLUDE_MOCK_DATA" == true ]]; then
    log_info "モックデータを投入中..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MOCK_DATA_FILE"; then
        log_success "モックデータ投入完了"
    else
        log_error "モックデータ投入に失敗しました"
        exit 1
    fi
fi

# 構築結果の確認
log_info "構築結果を確認中..."
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [[ "$INCLUDE_MOCK_DATA" == true ]]; then
    USER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
    AGENT_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM ai_agents;" | tr -d ' ')
    MESSAGE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM messages;" | tr -d ' ')
    
    log_success "構築完了！"
    echo ""
    echo "=== 構築結果 ==="
    echo "テーブル数: $TABLE_COUNT"
    echo "ユーザー数: $USER_COUNT"
    echo "AIエージェント数: $AGENT_COUNT"
    echo "メッセージ数: $MESSAGE_COUNT"
else
    log_success "構築完了！"
    echo ""
    echo "=== 構築結果 ==="
    echo "テーブル数: $TABLE_COUNT"
fi

echo ""
log_success "データベース '$DB_NAME' の構築が正常に完了しました！"
log_info "接続文字列: $DB_URL"

