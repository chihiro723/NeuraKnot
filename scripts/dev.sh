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
#   status   - サービス状態を表示
#   urls     - アクセスURL一覧を表示
#   clean    - 全コンテナとボリュームを削除

set -e

# 設定変数
COMPOSE_FILE="docker-compose/dev.yml"

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

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

# ヘルプ表示
show_help() {
    echo "BridgeSpeak 開発環境管理スクリプト"
    echo ""
    echo "使用方法: ./dev.sh [command] [service]"
    echo ""
    echo "コマンド:"
    echo "  start             - 開発環境を起動（既存イメージ使用）"
    echo "  build             - 開発環境を再ビルドして起動（レイヤーキャッシュ使用）"
    echo "  rebuild           - 開発環境を完全再ビルドして起動（キャッシュ無視）"
    echo "  stop              - 開発環境を停止"
    echo "  restart           - 開発環境を再起動"
    echo "  logs              - ログを表示"
    echo "  status            - サービス状態を表示"
    echo "  urls              - アクセスURL一覧を表示"
    echo "  clean             - 全コンテナとボリュームを削除"
    echo "  schema            - 統合スキーマでデータベースを構築"
    echo "  help              - このヘルプを表示"
    echo ""
    echo "利用可能なサービス:"
    echo "  frontend          - Next.jsアプリケーション       (ポート: 3000)"
    echo "  backend-go        - Go APIサーバー                (ポート: 8080)"
    echo "  backend-python    - Python APIサーバー            (ポート: 8001)"
    echo "  postgres          - PostgreSQLデータベース        (ポート: 5432)"
    echo "  redis             - Redisキャッシュ               (ポート: 6379)"
    echo ""
    echo "例:"
    echo "  ./dev.sh start                    # 全サービスを起動"
    echo "  ./dev.sh start frontend           # フロントエンドのみ起動"
    echo "  ./dev.sh logs backend-go          # Go APIのログを表示"
    echo "  ./dev.sh restart backend-python   # Python APIのみ再起動"
    echo "  ./dev.sh stop postgres            # PostgreSQLのみ停止"
    echo "  ./dev.sh build                    # 全サービスを再ビルド"
    echo "  ./dev.sh build frontend           # フロントエンドのみ再ビルド"
    echo "  ./dev.sh schema                   # 統合スキーマでデータベースを構築"
    echo "  ./dev.sh env backend-go           # Go APIの環境変数を表示"
    echo "  ./dev.sh env frontend             # フロントエンドの環境変数を表示"
}

# サービス名の検証
validate_service() {
    local service="$1"
    local valid_services=("frontend" "backend-go" "backend-python" "postgres" "redis")
    
    if [ -n "$service" ]; then
        for valid_service in "${valid_services[@]}"; do
            if [ "$service" = "$valid_service" ]; then
                return 0
            fi
        done
        log_error "無効なサービス名: $service"
        log_info "利用可能なサービス: ${valid_services[*]}"
        exit 1
    fi
}

# Docker Composeコマンドの実行（サービス指定対応）
run_docker_compose() {
    local command="$1"
    local service="$2"
    
    if [ -n "$service" ]; then
        docker compose -f "$COMPOSE_FILE" $command "$service"
    else
        docker compose -f "$COMPOSE_FILE" $command
    fi
}

# アクセスURLを表示
show_access_urls() {
    log_info "アクセスURL:"
    log_info "  - Frontend: http://localhost:3000"
    log_info "  - Python API: http://localhost:8001"
    log_info "  - Python API Swagger: http://localhost:8001/docs"
    log_info "  - Go API: http://localhost:8080"
    log_info "  - Go API Swagger: http://localhost:8080/swagger/index.html"
    log_info "  - PostgreSQL: localhost:5432"
    log_info "  - Redis: localhost:6379"
    log_info ""
    log_info "ファイルを編集すると自動で再起動されます。"
    log_info "ログを確認するには: ./dev.sh logs"
}

# 開発環境を起動（既存イメージ使用）
start_services() {
    local service="$1"
    validate_service "$service"
    
    if [ -n "$service" ]; then
        log_info "$service サービスを起動中（既存イメージ使用）..."
    else
        log_info "開発環境を起動中（既存イメージ使用）..."
    fi
    
    # 既存のコンテナを停止（全サービス指定時のみ）
    if [ -z "$service" ]; then
        run_docker_compose "down" 2>/dev/null || true
    fi
    
    # サービスを起動
    run_docker_compose "up -d" "$service"
    
    # 全サービス起動時はデータベースを完全再構築
    if [ -z "$service" ]; then
        log_info "データベースを完全再構築中..."
        build_schema
    fi
    
    if [ -n "$service" ]; then
        log_info "$service サービス起動完了！"
    else
        log_info "開発環境起動完了！"
        show_access_urls
    fi
}

# 開発環境を停止
stop_services() {
    local service="$1"
    validate_service "$service"
    
    if [ -n "$service" ]; then
        log_info "$service サービスを停止中..."
        run_docker_compose "stop" "$service"
        log_info "$service サービスを停止しました。"
    else
        log_info "開発環境を停止中..."
        run_docker_compose "down"
        log_info "開発環境を停止しました。"
    fi
}

# 開発環境を再起動
restart_services() {
    local service="$1"
    validate_service "$service"
    
    if [ -n "$service" ]; then
        log_info "$service サービスを再起動中..."
        run_docker_compose "restart" "$service"
        log_info "$service サービスを再起動しました。"
    else
        log_info "開発環境を再起動中..."
        run_docker_compose "restart"
        log_info "開発環境を再起動しました。"
        show_access_urls
    fi
}

# 開発環境を再ビルドして起動（レイヤーキャッシュ使用）
build_services() {
    local service="$1"
    validate_service "$service"
    
    if [ -n "$service" ]; then
        log_info "$service サービスを再ビルドして起動中（レイヤーキャッシュ使用）..."
    else
        log_info "開発環境を再ビルドして起動中（レイヤーキャッシュ使用）..."
    fi
    
    # 既存のコンテナを停止（全サービス指定時のみ）
    if [ -z "$service" ]; then
        run_docker_compose "down" 2>/dev/null || true
    fi
    
    # イメージを再ビルド（レイヤーキャッシュ使用）
    run_docker_compose "build" "$service"
    
    # サービスを起動
    run_docker_compose "up -d" "$service"
    
    if [ -n "$service" ]; then
        log_info "$service サービス再ビルド完了！"
    else
        log_info "再ビルド完了！"
        show_access_urls
    fi
}

# 開発環境を完全再ビルドして起動（キャッシュ無視）
rebuild_services() {
    local service="$1"
    validate_service "$service"
    
    if [ -n "$service" ]; then
        log_info "$service サービスを完全再ビルドして起動中（キャッシュ無視）..."
    else
        log_info "開発環境を完全再ビルドして起動中（キャッシュ無視）..."
    fi
    
    # 既存のコンテナを停止・削除（全サービス指定時のみ）
    if [ -z "$service" ]; then
        run_docker_compose "down --volumes --remove-orphans" 2>/dev/null || true
    fi
    
    # イメージを完全再ビルド（キャッシュ無視）
    run_docker_compose "build --no-cache" "$service"
    
    # サービスを起動
    run_docker_compose "up -d" "$service"
    
    if [ -n "$service" ]; then
        log_info "$service サービス完全再ビルド完了！"
    else
        log_info "完全再ビルド完了！"
        show_access_urls
    fi
}

# ログを表示
show_logs() {
    local service="$1"
    validate_service "$service"
    
    if [ -n "$service" ]; then
        log_info "$service サービスのログを表示中..."
        run_docker_compose "logs -f" "$service"
    else
        log_info "サービスログを表示中..."
        run_docker_compose "logs -f"
    fi
}

# サービス状態を表示
show_status() {
    log_info "サービス状態:"
    run_docker_compose "ps"
    
    echo ""
    log_info "リソース使用状況:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# 全コンテナとボリュームを削除
clean_all() {
    log_warn "全コンテナとボリュームを削除します。データは失われます。"
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "クリーンアップ中..."
        run_docker_compose "down --volumes --remove-orphans" 2>/dev/null || true
        docker system prune -f
        log_info "クリーンアップ完了！"
    else
        log_info "クリーンアップをキャンセルしました。"
    fi
}


# 統合スキーマでデータベースを構築（常に完全再構築）
build_schema() {
    log_info "統合スキーマでデータベースを完全再構築中..."
    
    # スキーマ構築スクリプトを実行（強制再作成）
    if [[ -f "backend-go/schema/build_schema.sh" ]]; then
        cd backend-go/schema
        ./build_schema.sh --force --with-mock-data --yes
        cd ../..
        log_success "統合スキーマ完全再構築完了！"
    else
        log_error "スキーマ構築スクリプトが見つかりません: backend-go/schema/build_schema.sh"
        exit 1
    fi
}


# 環境変数表示
show_env_vars() {
    local service="$1"
    
    if [ -z "$service" ]; then
        log_error "サービス名を指定してください。"
        echo ""
        echo "利用可能なサービス:"
        echo "  - backend-go"
        echo "  - backend-python"
        echo "  - frontend"
        echo "  - postgres"
        echo "  - redis"
        echo ""
        echo "使用例: ./dev.sh env backend-go"
        exit 1
    fi
    
    # サービス名を検証
    validate_service "$service"
    
    # コンテナ名を構築
    local container_name="docker-compose-${service}-1"
    
    # コンテナが存在するかチェック
    if ! docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        log_error "サービス '$service' のコンテナが起動していません。"
        echo ""
        echo "まずサービスを起動してください:"
        echo "  ./dev.sh start $service"
        exit 1
    fi
    
    log_info "$service サービスの環境変数を表示中..."
    echo ""
    echo "=== $service サービスの環境変数 ==="
    echo ""
    
    # 環境変数を表示（機密情報はマスク）
    docker exec "$container_name" env | sort | while IFS='=' read -r key value; do
        # 機密情報をマスク
        case "$key" in
            *PASSWORD*|*SECRET*|*KEY*|*TOKEN*)
                echo "$key=***MASKED***"
                ;;
            *)
                echo "$key=$value"
                ;;
        esac
    done
    
    echo ""
    echo "=== 機密情報は ***MASKED*** で表示されています ==="
}

# メイン処理
case "${1:-help}" in
    start)
        start_services "$2"
        ;;
    build)
        build_services "$2"
        ;;
    rebuild)
        rebuild_services "$2"
        ;;
    stop)
        stop_services "$2"
        ;;
    restart)
        restart_services "$2"
        ;;
    logs)
        show_logs "$2"
        ;;
    status)
        show_status
        ;;
    urls)
        show_access_urls
        ;;
    clean)
        clean_all
        ;;
    env)
        show_env_vars "$2"
        ;;
    schema)
        build_schema
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