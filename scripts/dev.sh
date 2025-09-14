#!/bin/bash

# BridgeSpeak - 開発環境セットアップスクリプト
# 使用方法: ./dev.sh [command]
# コマンド:
#   start    - 開発環境を起動（既存イメージ使用）
#   build    - 開発環境を再ビルドして起動（レイヤーキャッシュ使用）
#   rebuild  - 開発環境を完全再ビルドして起動（キャッシュ無視）
#   stop     - 開発環境を停止
#   restart  - 開発環境を再起動
#   logs     - ログを表示
#   clean    - 全コンテナとボリュームを削除
#   status   - サービス状態を表示

set -e

# 色付きログ関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# ヘルプ表示
show_help() {
    echo "BridgeSpeak 開発環境管理スクリプト"
    echo ""
    echo "使用方法: ./dev.sh [command]"
    echo ""
    echo "コマンド:"
    echo "  start    - 開発環境を起動（既存イメージ使用）"
    echo "  build    - 開発環境を再ビルドして起動（レイヤーキャッシュ使用）"
    echo "  rebuild  - 開発環境を完全再ビルドして起動（キャッシュ無視）"
    echo "  stop     - 開発環境を停止"
    echo "  restart  - 開発環境を再起動"
    echo "  logs     - ログを表示"
    echo "  clean    - 全コンテナとボリュームを削除"
    echo "  status   - サービス状態を表示"
    echo "  migrate  - データベースマイグレーションを実行"
    echo "  migrate-rollback - データベースマイグレーションをロールバック"
    echo "  help     - このヘルプを表示"
    echo ""
    echo "例:"
    echo "  ./dev.sh start    # 既存イメージで起動（高速）"
    echo "  ./dev.sh build    # レイヤーキャッシュ使用で再ビルド（推奨）"
    echo "  ./dev.sh rebuild  # 完全再ビルド（問題解決時）"
    echo "  ./dev.sh migrate  # マイグレーションを実行"
    echo "  ./dev.sh logs     # ログを確認"
}

# 環境変数ファイルの確認
check_env_file() {
    if [ ! -f ".env" ]; then
        log_warn ".envファイルが見つかりません。env.exampleからコピーします。"
        if [ -f "env.example" ]; then
            cp env.example .env
            log_info ".envファイルを作成しました。必要に応じて設定を編集してください。"
        else
            log_error "env.exampleファイルも見つかりません。"
            exit 1
        fi
    fi
}

# アクセスURLを表示
show_access_urls() {
    log_info "アクセスURL:"
    log_info "  - Frontend: http://localhost:3000"
    log_info "  - Python API: http://localhost:8000"
    log_info "  - Go API: http://localhost:8080"
    log_info "  - Swagger UI: http://localhost:8080/swagger/index.html"
    log_info "  - PostgreSQL: localhost:5432"
    log_info "  - Redis: localhost:6379"
    log_info ""
    log_info "ファイルを編集すると自動で再起動されます。"
    log_info "ログを確認するには: ./dev.sh logs"
}

# 開発環境を起動（既存イメージ使用）
start_services() {
    log_info "開発環境を起動中（既存イメージ使用）..."
    check_env_file
    
    # 既存のコンテナを停止
    docker-compose -f docker-compose/dev.yml down 2>/dev/null || true
    
    # 開発用サービスを起動
    docker-compose -f docker-compose/dev.yml up -d
    
    log_info "開発環境起動完了！"
    show_access_urls
}

# 開発環境を停止
stop_services() {
    log_info "開発環境を停止中..."
    docker-compose -f docker-compose/dev.yml down
    log_info "開発環境を停止しました。"
}

# 開発環境を再起動
restart_services() {
    log_info "開発環境を再起動中..."
    docker-compose -f docker-compose/dev.yml restart
    log_info "開発環境を再起動しました。"
}

# 開発環境を再ビルドして起動（レイヤーキャッシュ使用）
build_services() {
    log_info "開発環境を再ビルドして起動中（レイヤーキャッシュ使用）..."
    check_env_file
    
    # 既存のコンテナを停止
    docker-compose -f docker-compose/dev.yml down 2>/dev/null || true
    
    # イメージを再ビルド（レイヤーキャッシュ使用）
    docker-compose -f docker-compose/dev.yml build
    
    # サービスを起動
    docker-compose -f docker-compose/dev.yml up -d
    
    log_info "再ビルド完了！"
    show_access_urls
}

# 開発環境を完全再ビルドして起動（キャッシュ無視）
rebuild_services() {
    log_info "開発環境を完全再ビルドして起動中（キャッシュ無視）..."
    check_env_file
    
    # 既存のコンテナを停止・削除
    docker-compose -f docker-compose/dev.yml down --volumes --remove-orphans 2>/dev/null || true
    
    # イメージを完全再ビルド（キャッシュ無視）
    docker-compose -f docker-compose/dev.yml build --no-cache
    
    # サービスを起動
    docker-compose -f docker-compose/dev.yml up -d
    
    log_info "完全再ビルド完了！"
    show_access_urls
}

# ログを表示
show_logs() {
    log_info "サービスログを表示中..."
    docker-compose -f docker-compose/dev.yml logs -f
}

# 全コンテナとボリュームを削除
clean_all() {
    log_warn "全コンテナとボリュームを削除します。データは失われます。"
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "クリーンアップ中..."
        docker-compose -f docker-compose/dev.yml down --volumes --remove-orphans 2>/dev/null || true
        docker system prune -f
        log_info "クリーンアップ完了！"
    else
        log_info "クリーンアップをキャンセルしました。"
    fi
}

# サービス状態を表示
show_status() {
    log_info "サービス状態:"
    docker-compose -f docker-compose/dev.yml ps
    
    echo ""
    log_info "リソース使用状況:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# マイグレーションを実行
run_migrations() {
    log_info "データベースマイグレーションを実行中..."
    
    # データベース接続文字列を構築
    DB_URL="postgres://postgres:${POSTGRES_PASSWORD:-password}@localhost:5432/go_backend?sslmode=disable"
    
    # migrateコマンドを実行
    if command -v migrate &> /dev/null; then
        migrate -path backend-go/migrations -database "$DB_URL" up
        log_info "マイグレーション完了！"
    else
        log_error "migrateコマンドが見つかりません。"
        log_info "インストール方法:"
        log_info "  brew install golang-migrate"
        log_info "  または"
        log_info "  go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
        exit 1
    fi
}

# マイグレーションをロールバック
rollback_migrations() {
    log_warn "データベースマイグレーションをロールバックします。"
    read -p "ロールバックするステップ数を入力してください (デフォルト: 1): " -r
    steps=${REPLY:-1}
    
    # データベース接続文字列を構築
    DB_URL="postgres://postgres:${POSTGRES_PASSWORD:-password}@localhost:5432/go_backend?sslmode=disable"
    
    # migrateコマンドを実行
    if command -v migrate &> /dev/null; then
        migrate -path backend-go/migrations -database "$DB_URL" down "$steps"
        log_info "マイグレーションロールバック完了！"
    else
        log_error "migrateコマンドが見つかりません。"
        exit 1
    fi
}

# メイン処理
case "${1:-help}" in
    start)
        start_services
        ;;
    build)
        build_services
        ;;
    rebuild)
        rebuild_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_all
        ;;
    status)
        show_status
        ;;
    migrate)
        run_migrations
        ;;
    migrate-rollback)
        rollback_migrations
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "不明なコマンド: $1"
        echo ""
        show_help
        exit 2
        ;;
esac