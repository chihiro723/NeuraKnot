#!/bin/bash
# SSM経由でプライベートRDSに接続するスクリプト

set -e

# デバッグモード（環境変数DEBUGが設定されている場合に有効）
if [ "${DEBUG}" = "1" ]; then
    set -x
    VERBOSE=1
fi

# 設定
CLUSTER_NAME="neuraKnot-prod-cluster"
SERVICE_NAME="neuraKnot-prod-backend-go"
CONTAINER_NAME="backend-go"
REGION="ap-northeast-1"
LOCAL_PORT="15432"
DB_PORT="5432"

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_debug() {
    if [ "${VERBOSE}" = "1" ]; then
        echo -e "${BLUE}[DEBUG] $1${NC}"
    fi
}

log_info() {
    echo -e "${GREEN}[INFO] $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# ヘルプメッセージ
show_help() {
    echo "使い方: $0 [start|stop|status]"
    echo ""
    echo "コマンド:"
    echo "  start   - 既存のBackend GoタスクでSSMポートフォワーディングを開始"
    echo "  stop    - SSMセッションを終了（タスクは停止しません）"
    echo "  status  - Backend Goタスクの状態を確認"
    echo ""
    echo "接続情報:"
    echo "  Host: localhost"
    echo "  Port: ${LOCAL_PORT}"
    echo "  Database: neuraKnot"
    echo "  Username: postgres"
    echo ""
    echo "デバッグモード:"
    echo "  詳細なログを表示するには、環境変数DEBUGを設定してください"
    echo "  例: DEBUG=1 VERBOSE=1 $0 start"
    echo ""
    echo "注意: 既存のBackend GoタスクにECS Execで接続します"
    echo ""
}

# RDSエンドポイントの取得
get_rds_endpoint() {
    log_info "RDSエンドポイントを取得中..."
    log_debug "DB識別子: neuraKnot-prod-db"
    log_debug "リージョン: ${REGION}"
    
    RDS_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier neuraKnot-prod-db \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text \
        --region ${REGION} 2>&1)
    
    local exit_code=$?
    log_debug "RDS取得結果の終了コード: ${exit_code}"
    log_debug "RDSエンドポイント取得結果: ${RDS_ENDPOINT}"
    
    if [ -z "$RDS_ENDPOINT" ] || [ "$RDS_ENDPOINT" = "None" ]; then
        log_error "RDSインスタンスが見つかりません"
        exit 1
    fi
    
    log_info "✓ RDSエンドポイント: ${RDS_ENDPOINT}"
}

# 既存のBackend Goタスクを取得
start_task() {
    log_info "既存のBackend Goタスクを取得中..."
    log_debug "クラスター: ${CLUSTER_NAME}"
    log_debug "サービス: ${SERVICE_NAME}"
    log_debug "リージョン: ${REGION}"
    
    # 実行中のタスクを取得
    TASK_ARN=$(aws ecs list-tasks \
        --cluster ${CLUSTER_NAME} \
        --service-name ${SERVICE_NAME} \
        --desired-status RUNNING \
        --region ${REGION} \
        --query 'taskArns[0]' \
        --output text 2>&1)
    
    local exit_code=$?
    log_debug "タスク取得の終了コード: ${exit_code}"
    log_debug "タスクARN取得結果: ${TASK_ARN}"
    
    if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" = "None" ]; then
        log_error "実行中のタスクが見つかりません"
        exit 1
    fi
    
    TASK_ID=$(echo $TASK_ARN | cut -d'/' -f3)
    log_debug "タスクID: ${TASK_ID}"
    
    # ECS Execが有効か確認
    log_debug "ECS Exec有効化状況を確認中..."
    EXEC_ENABLED=$(aws ecs describe-tasks \
        --cluster ${CLUSTER_NAME} \
        --tasks ${TASK_ARN} \
        --region ${REGION} \
        --query 'tasks[0].enableExecuteCommand' \
        --output text 2>&1)
    log_debug "enableExecuteCommand: ${EXEC_ENABLED}"
    
    log_info "✓ タスク取得: ${TASK_ID}"
    
    # タスクARNをファイルに保存
    echo ${TASK_ARN} > /tmp/ssm-proxy-task-arn.txt
    log_debug "タスクARNを保存: /tmp/ssm-proxy-task-arn.txt"
    
    get_rds_endpoint
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}ポートフォワーディングを開始します${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    log_info "Backend Goタスク ${TASK_ID} を使用します"
    log_debug "ターゲット: ecs:${CLUSTER_NAME}_${TASK_ID}"
    log_debug "RDSホスト: ${RDS_ENDPOINT}"
    log_debug "リモートポート: ${DB_PORT}"
    log_debug "ローカルポート: ${LOCAL_PORT}"
    echo ""
    
    # リトライロジック付きでSSMセッションを開始
    start_ssm_session_with_retry
}

# SSMセッション開始（リトライロジック付き）
start_ssm_session_with_retry() {
    local max_retries=60  # 最大60回リトライ（約10分）
    local retry_interval=10  # 10秒ごとにリトライ
    local attempt=1
    
    log_warn "ECS Execの準備を待機中..."
    log_debug "最大リトライ回数: ${max_retries}"
    log_debug "リトライ間隔: ${retry_interval}秒"
    
    while [ $attempt -le $max_retries ]; do
        log_warn "接続試行 ${attempt}/${max_retries}..."
        log_debug "ターゲット: ecs:${CLUSTER_NAME}_${TASK_ID}"
        log_debug "ドキュメント: AWS-StartPortForwardingSessionToRemoteHost"
        
        # エラー出力を一時ファイルに保存
        local error_file=$(mktemp)
        
        # SSMセッションを試行
        if aws ssm start-session \
            --target "ecs:${CLUSTER_NAME}_${TASK_ID}" \
            --document-name AWS-StartPortForwardingSessionToRemoteHost \
            --parameters "{\"host\":[\"${RDS_ENDPOINT}\"],\"portNumber\":[\"${DB_PORT}\"],\"localPortNumber\":[\"${LOCAL_PORT}\"]}" \
            --region ${REGION} 2>"${error_file}"; then
            
            # 成功（ユーザーがCtrl+Cで終了）
            rm -f "${error_file}"
            echo ""
            log_info "✓ セッションが正常に終了しました"
            return 0
        fi
        
        # エラーの場合
        local exit_code=$?
        local error_message=$(cat "${error_file}")
        rm -f "${error_file}"
        
        log_debug "終了コード: ${exit_code}"
        log_debug "エラーメッセージ: ${error_message}"
        
        # エラーメッセージを解析
        if echo "${error_message}" | grep -q "TargetNotConnected"; then
            log_debug "原因: SSM Agentとの接続が確立されていません"
        elif echo "${error_message}" | grep -q "InvalidInstanceId"; then
            log_error "原因: タスクIDが無効です"
            return 1
        elif echo "${error_message}" | grep -q "AccessDeniedException"; then
            log_error "原因: IAM権限が不足しています"
            log_error "${error_message}"
            return 1
        fi
        
        if [ $attempt -lt $max_retries ]; then
            log_warn "まだ準備ができていません。${retry_interval}秒後に再試行..."
            if [ $attempt -eq 1 ]; then
                log_debug "初回接続失敗の一般的な原因:"
                log_debug "  1. VPCエンドポイントが設定されていない"
                log_debug "  2. ECS Execが有効化されていない"
                log_debug "  3. タスクが起動直後でSSM Agentがまだ準備できていない"
            fi
            sleep $retry_interval
            ((attempt++))
        else
            log_error "${max_retries}回試行しましたが接続できませんでした"
            echo ""
            log_error "==== トラブルシューティング ===="
            echo ""
            log_info "1. ECS Exec有効化の確認:"
            echo -e "   ${YELLOW}aws ecs describe-tasks --cluster ${CLUSTER_NAME} --tasks ${TASK_ID} --region ${REGION} --query 'tasks[0].enableExecuteCommand'${NC}"
            echo ""
            log_info "2. VPCエンドポイントの確認:"
            echo -e "   ${YELLOW}aws ec2 describe-vpc-endpoints --filters 'Name=service-name,Values=*ssm*' --region ${REGION} --query 'VpcEndpoints[*].[ServiceName,State]'${NC}"
            echo ""
            log_info "3. タスクログの確認:"
            echo -e "   ${YELLOW}aws logs tail /ecs/neuraKnot-prod-backend-go --follow --region ${REGION}${NC}"
            echo ""
            log_info "4. Session Managerプラグインの確認:"
            echo -e "   ${YELLOW}session-manager-plugin --version${NC}"
            echo ""
            log_error "最後のエラーメッセージ:"
            echo "${error_message}"
            return 1
        fi
    done
}

# タスクの停止
stop_task() {
    echo -e "${YELLOW}セッション情報をクリーンアップ中...${NC}"
    
    if [ -f /tmp/ssm-proxy-task-arn.txt ]; then
        TASK_ARN=$(cat /tmp/ssm-proxy-task-arn.txt)
        TASK_ID=$(echo $TASK_ARN | cut -d'/' -f3)
        rm -f /tmp/ssm-proxy-task-arn.txt
        echo -e "${GREEN}✓ クリーンアップ完了: ${TASK_ID}${NC}"
        echo -e "${YELLOW}注意: Backend Goタスクは継続して実行されています${NC}"
    else
        echo -e "${YELLOW}セッション情報が見つかりませんでした${NC}"
    fi
}

# タスクのステータス確認
check_status() {
    log_info "Backend Goタスクのステータスを確認中..."
    log_debug "クラスター: ${CLUSTER_NAME}"
    log_debug "サービス: ${SERVICE_NAME}"
    
    TASK_ARNS=$(aws ecs list-tasks \
        --cluster ${CLUSTER_NAME} \
        --service-name ${SERVICE_NAME} \
        --region ${REGION} \
        --query 'taskArns' \
        --output text)
    
    if [ -z "$TASK_ARNS" ]; then
        log_warn "実行中のBackend Goタスクはありません"
        exit 0
    fi
    
    log_info "実行中のBackend Goタスク:"
    echo ""
    
    for TASK_ARN in $TASK_ARNS; do
        TASK_INFO=$(aws ecs describe-tasks \
            --cluster ${CLUSTER_NAME} \
            --tasks ${TASK_ARN} \
            --region ${REGION} \
            --query 'tasks[0]' \
            --output json)
        
        TASK_ID=$(echo $TASK_ARN | cut -d'/' -f3)
        STATUS=$(echo $TASK_INFO | jq -r '.lastStatus')
        CREATED=$(echo $TASK_INFO | jq -r '.createdAt')
        EXEC_ENABLED=$(echo $TASK_INFO | jq -r '.enableExecuteCommand')
        
        echo -e "${GREEN}  タスクID: ${TASK_ID}${NC}"
        echo -e "    ステータス: ${STATUS}"
        echo -e "    作成日時: ${CREATED}"
        echo -e "    ECS Exec: ${EXEC_ENABLED}"
        echo ""
        
        log_debug "完全なタスク情報:"
        log_debug "${TASK_INFO}"
    done
    
    # VPCエンドポイント確認
    echo ""
    log_info "VPCエンドポイントの確認:"
    VPC_ENDPOINTS=$(aws ec2 describe-vpc-endpoints \
        --filters "Name=service-name,Values=*ssm*" \
        --region ${REGION} \
        --query 'VpcEndpoints[*].[ServiceName,State]' \
        --output text 2>&1)
    
    if [ -z "$VPC_ENDPOINTS" ]; then
        log_error "  SSM用のVPCエンドポイントが見つかりません"
        log_warn "  ECS Execを使用するには以下のVPCエンドポイントが必要です:"
        log_warn "    - com.amazonaws.${REGION}.ssm"
        log_warn "    - com.amazonaws.${REGION}.ssmmessages"
        log_warn "    - com.amazonaws.${REGION}.ec2messages"
    else
        echo "${VPC_ENDPOINTS}" | while read line; do
            echo -e "  ${GREEN}✓${NC} ${line}"
        done
    fi
}

# メイン処理
case "${1:-}" in
    start)
        start_task
        ;;
    stop)
        stop_task
        ;;
    status)
        check_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}エラー: 無効なコマンド${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

