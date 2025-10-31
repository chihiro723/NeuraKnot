#!/bin/bash

# ====================================================
# RDS接続スクリプト (Bastion Host経由)
# ====================================================
# 
# SSM Session Manager を使用して Bastion Host 経由で
# RDS にポートフォワーディング接続します。
#
# 使い方:
#   ./scripts/connect-rds-bastion.sh start                # ポートフォワーディングを開始（Bastion 自動起動）
#   ./scripts/connect-rds-bastion.sh stop                 # セッションを終了（Bastion は起動したまま）
#   ./scripts/connect-rds-bastion.sh stop --stop-bastion  # セッションを終了 + Bastion を停止
#   ./scripts/connect-rds-bastion.sh status               # 状態を確認
#
# 接続後は以下のコマンドでRDSに接続できます:
#   psql -h localhost -p 15432 -U postgres -d neuraKnot
#

set -e

# ====================================================
# 設定
# ====================================================

REGION="ap-northeast-1"
PROJECT_NAME="neuraKnot"
ENVIRONMENT="prod"
LOCAL_PORT="15432"
DB_PORT="5432"
SESSION_INFO_FILE="/tmp/rds-bastion-session.info"

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ====================================================
# 関数
# ====================================================

log_info() {
    echo -e "${GREEN}[INFO] $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Bastion インスタンス情報を取得（停止中も含む）
get_bastion_info() {
    local INSTANCE_INFO=$(aws ec2 describe-instances \
        --filters \
            "Name=tag:Name,Values=${PROJECT_NAME}-${ENVIRONMENT}-bastion" \
        --region ${REGION} \
        --query 'Reservations[0].Instances[0].[InstanceId,State.Name]' \
        --output text 2>/dev/null)
    
    if [ "$INSTANCE_INFO" == "None None" ] || [ -z "$INSTANCE_INFO" ]; then
        return 1
    fi
    
    echo "$INSTANCE_INFO"
    return 0
}

# Bastion インスタンス ID を取得（running 状態のみ）
get_bastion_instance_id() {
    log_info "Bastion インスタンス ID を取得中..." >&2
    
    local INSTANCE_INFO=$(get_bastion_info)
    if [ $? -ne 0 ]; then
        log_error "Bastion インスタンスが見つかりません" >&2
        log_error "Terraform で Bastion Host をデプロイしてください" >&2
        exit 1
    fi
    
    local INSTANCE_ID=$(echo $INSTANCE_INFO | awk '{print $1}')
    local STATE=$(echo $INSTANCE_INFO | awk '{print $2}')
    
    if [ "$STATE" != "running" ]; then
        log_warn "Bastion は現在 ${STATE} 状態です" >&2
        return 1
    fi
    
    log_info "Bastion Instance ID: ${INSTANCE_ID}" >&2
    echo "$INSTANCE_ID"
    return 0
}

# Bastion インスタンスを起動
start_bastion_instance() {
    log_info "=== Bastion インスタンスを起動します ==="
    
    local INSTANCE_INFO=$(get_bastion_info)
    if [ $? -ne 0 ]; then
        log_error "Bastion インスタンスが見つかりません"
        log_error "Terraform で Bastion Host をデプロイしてください:"
        log_error "  cd terraform/environments/${ENVIRONMENT}"
        log_error "  terraform apply -target=module.bastion"
        exit 1
    fi
    
    local INSTANCE_ID=$(echo $INSTANCE_INFO | awk '{print $1}')
    local STATE=$(echo $INSTANCE_INFO | awk '{print $2}')
    
    log_info "Instance ID: ${INSTANCE_ID}"
    log_info "Current State: ${STATE}"
    
    if [ "$STATE" == "running" ]; then
        log_info "✓ Bastion は既に起動しています"
        return 0
    fi
    
    if [ "$STATE" == "pending" ]; then
        log_info "Bastion は起動中です。完了を待機しています..."
    elif [ "$STATE" == "stopped" ]; then
        log_info "Bastion を起動しています..."
        aws ec2 start-instances --instance-ids "${INSTANCE_ID}" --region ${REGION} > /dev/null
    elif [ "$STATE" == "stopping" ]; then
        log_info "Bastion は停止中です。完了を待機してから起動します..."
        aws ec2 wait instance-stopped --instance-ids "${INSTANCE_ID}" --region ${REGION}
        log_info "停止完了。起動を開始します..."
        aws ec2 start-instances --instance-ids "${INSTANCE_ID}" --region ${REGION} > /dev/null
    else
        log_error "Bastion の状態が不正です: ${STATE}"
        exit 1
    fi
    
    log_info "起動完了を待機中（通常 1-2 分かかります）..."
    aws ec2 wait instance-running --instance-ids "${INSTANCE_ID}" --region ${REGION}
    
    log_info "✓ Bastion が起動しました"
    
    # SSM Agent が起動するまで少し待機
    log_info "SSM Agent の起動を待機中..."
    sleep 10
    
    # SSM 接続が可能か確認
    for i in {1..12}; do
        if aws ssm describe-instance-information \
            --filters "Key=InstanceIds,Values=${INSTANCE_ID}" \
            --region ${REGION} \
            --query 'InstanceInformationList[0].PingStatus' \
            --output text 2>/dev/null | grep -q "Online"; then
            log_info "✓ SSM Agent がオンラインになりました"
            return 0
        fi
        log_info "  SSM Agent の起動を待機中... (${i}/12)"
        sleep 5
    done
    
    log_warn "SSM Agent のオンライン確認がタイムアウトしました"
    log_warn "接続を試みますが、失敗する可能性があります"
    return 0
}

# Bastion インスタンスを停止
stop_bastion_instance() {
    log_info "=== Bastion インスタンスを停止します ==="
    
    local INSTANCE_INFO=$(get_bastion_info)
    if [ $? -ne 0 ]; then
        log_warn "Bastion インスタンスが見つかりません"
        return 0
    fi
    
    local INSTANCE_ID=$(echo $INSTANCE_INFO | awk '{print $1}')
    local STATE=$(echo $INSTANCE_INFO | awk '{print $2}')
    
    log_info "Instance ID: ${INSTANCE_ID}"
    log_info "Current State: ${STATE}"
    
    if [ "$STATE" == "stopped" ]; then
        log_info "✓ Bastion は既に停止しています"
        return 0
    fi
    
    if [ "$STATE" == "running" ]; then
        log_info "Bastion を停止しています..."
        aws ec2 stop-instances --instance-ids "${INSTANCE_ID}" --region ${REGION} > /dev/null
        log_info "停止完了を待機中..."
        aws ec2 wait instance-stopped --instance-ids "${INSTANCE_ID}" --region ${REGION}
        log_info "✓ Bastion を停止しました"
        log_info "💰 コスト削減: EC2 実行料金 ~$3.00/月 が停止（EBS $0.64/月 は継続）"
    else
        log_warn "Bastion の状態: ${STATE}"
        log_warn "停止はスキップします"
    fi
    
    return 0
}

# RDS エンドポイントを取得
get_rds_endpoint() {
    log_info "RDS エンドポイントを取得中..." >&2
    
    local RDS_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier ${PROJECT_NAME}-${ENVIRONMENT}-db \
        --region ${REGION} \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    if [ "$RDS_ENDPOINT" == "None" ] || [ -z "$RDS_ENDPOINT" ]; then
        log_error "RDS インスタンスが見つかりません" >&2
        exit 1
    fi
    
    log_info "RDS Endpoint: ${RDS_ENDPOINT}" >&2
    echo "$RDS_ENDPOINT"
}

# ポートフォワーディングを開始
start_port_forwarding() {
    log_info "=== RDS ポートフォワーディングを開始します ==="
    echo ""
    
    # 既存のセッションをチェック
    if [ -f "$SESSION_INFO_FILE" ]; then
        log_warn "既存のセッションが見つかりました"
        if ps -p $(cat $SESSION_INFO_FILE 2>/dev/null) > /dev/null 2>&1; then
            log_error "セッションが既に実行中です"
            log_info "停止するには: $0 stop"
            exit 1
        else
            log_warn "古いセッション情報をクリーンアップします"
            rm -f $SESSION_INFO_FILE
        fi
    fi
    
    # ポートが既に使用されているかチェック
    if lsof -Pi :${LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        log_error "ポート ${LOCAL_PORT} は既に使用されています"
        log_info "使用中のプロセス:"
        lsof -Pi :${LOCAL_PORT} -sTCP:LISTEN
        exit 1
    fi
    
    # Bastion インスタンスの状態を確認し、必要なら起動
    echo ""
    INSTANCE_ID=$(get_bastion_instance_id)
    if [ $? -ne 0 ]; then
        log_info "Bastion インスタンスが停止しています。起動します..."
        echo ""
        start_bastion_instance
        echo ""
        INSTANCE_ID=$(get_bastion_instance_id)
        if [ $? -ne 0 ]; then
            log_error "Bastion インスタンスの起動に失敗しました"
            exit 1
        fi
    fi
    
    # 必要な情報を取得
    RDS_ENDPOINT=$(get_rds_endpoint)
    
    echo ""
    log_info "接続情報:"
    log_info "  Bastion: ${INSTANCE_ID}"
    log_info "  RDS: ${RDS_ENDPOINT}:${DB_PORT}"
    log_info "  Local: localhost:${LOCAL_PORT}"
    echo ""
    
    log_info "SSM Session Manager でポートフォワーディングを開始します..."
    log_info "停止するには Ctrl+C を押すか、別ターミナルで '$0 stop' を実行してください"
    echo ""
    
    # SSM Session Manager でポートフォワーディングを開始
    aws ssm start-session \
        --target "${INSTANCE_ID}" \
        --document-name AWS-StartPortForwardingSessionToRemoteHost \
        --parameters "{\"host\":[\"${RDS_ENDPOINT}\"],\"portNumber\":[\"${DB_PORT}\"],\"localPortNumber\":[\"${LOCAL_PORT}\"]}" \
        --region ${REGION} &
    
    SSM_PID=$!
    echo $SSM_PID > $SESSION_INFO_FILE
    
    # 接続が確立されるまで待機
    log_info "接続が確立されるまで待機中..."
    sleep 5
    
    # ポートが開いたか確認
    for i in {1..10}; do
        if lsof -Pi :${LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            echo ""
            log_info "✓ ポートフォワーディングが正常に開始されました！"
            echo ""
            log_info "=== 接続方法 ==="
            echo ""
            echo "  psql コマンド:"
            echo -e "    ${BLUE}psql -h localhost -p ${LOCAL_PORT} -U postgres -d neuraKnot${NC}"
            echo ""
            echo "  pgAdmin / DBeaver:"
            echo "    Host: localhost"
            echo "    Port: ${LOCAL_PORT}"
            echo "    Database: neuraKnot"
            echo "    Username: postgres"
            echo ""
            log_info "停止するには: $0 stop"
            echo ""
            
            # フォアグラウンドで実行を続ける
            wait $SSM_PID
            
            # セッション情報をクリーンアップ
            rm -f $SESSION_INFO_FILE
            return 0
        fi
        sleep 2
    done
    
    # タイムアウト
    log_error "ポートフォワーディングの開始に失敗しました"
    kill $SSM_PID 2>/dev/null || true
    rm -f $SESSION_INFO_FILE
    exit 1
}

# セッションを停止
stop_port_forwarding() {
    local STOP_BASTION=false
    
    # --stop-bastion フラグをチェック
    if [ "${2:-}" == "--stop-bastion" ]; then
        STOP_BASTION=true
    fi
    
    log_info "=== セッションを停止します ==="
    
    if [ ! -f "$SESSION_INFO_FILE" ]; then
        log_warn "アクティブなセッションが見つかりません"
    else
        SSM_PID=$(cat $SESSION_INFO_FILE)
        
        if ps -p $SSM_PID > /dev/null 2>&1; then
            log_info "セッション (PID: ${SSM_PID}) を終了しています..."
            kill $SSM_PID 2>/dev/null || true
            sleep 2
            
            if ps -p $SSM_PID > /dev/null 2>&1; then
                log_warn "強制終了します..."
                kill -9 $SSM_PID 2>/dev/null || true
            fi
            
            log_info "✓ セッションを停止しました"
        else
            log_warn "セッションは既に停止しています"
        fi
        
        rm -f $SESSION_INFO_FILE
    fi
    
    # Bastion を停止するかチェック
    if [ "$STOP_BASTION" == true ]; then
        echo ""
        stop_bastion_instance
    else
        echo ""
        log_info "Bastion インスタンスは起動したままです"
        log_info "Bastion も停止する場合: $0 stop --stop-bastion"
        log_info "💡 停止することで月額 ~$3.00 のコスト削減（EBS $0.64/月 は継続）"
    fi
}

# 状態を確認
check_status() {
    log_info "=== 接続状態 ==="
    echo ""
    
    # Bastion インスタンスの状態
    log_info "Bastion Host:"
    INSTANCE_STATE=$(aws ec2 describe-instances \
        --filters \
            "Name=tag:Name,Values=${PROJECT_NAME}-${ENVIRONMENT}-bastion" \
        --region ${REGION} \
        --query 'Reservations[0].Instances[0].[InstanceId,State.Name,PrivateIpAddress]' \
        --output text 2>/dev/null || echo "None None None")
    
    if [ "$INSTANCE_STATE" == "None None None" ]; then
        log_error "  Bastion Host が見つかりません"
    else
        INSTANCE_ID=$(echo $INSTANCE_STATE | awk '{print $1}')
        STATE=$(echo $INSTANCE_STATE | awk '{print $2}')
        PRIVATE_IP=$(echo $INSTANCE_STATE | awk '{print $3}')
        
        if [ "$STATE" == "running" ]; then
            echo -e "  ${GREEN}✓${NC} Instance ID: ${INSTANCE_ID}"
            echo "    State: ${STATE}"
            echo "    Private IP: ${PRIVATE_IP}"
        else
            echo -e "  ${YELLOW}⚠${NC} Instance ID: ${INSTANCE_ID}"
            echo "    State: ${STATE}"
        fi
    fi
    
    echo ""
    
    # セッションの状態
    log_info "Port Forwarding Session:"
    if [ -f "$SESSION_INFO_FILE" ]; then
        SSM_PID=$(cat $SESSION_INFO_FILE)
        if ps -p $SSM_PID > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} アクティブ (PID: ${SSM_PID})"
            
            if lsof -Pi :${LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
                echo -e "  ${GREEN}✓${NC} Port ${LOCAL_PORT} is listening"
            fi
        else
            echo -e "  ${YELLOW}⚠${NC} セッション情報ファイルが存在しますが、プロセスが見つかりません"
        fi
    else
        echo "  停止中"
    fi
    
    echo ""
    
    # RDS の状態
    log_info "RDS Instance:"
    RDS_STATE=$(aws rds describe-db-instances \
        --db-instance-identifier ${PROJECT_NAME}-${ENVIRONMENT}-db \
        --region ${REGION} \
        --query 'DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus,Endpoint.Address]' \
        --output text 2>/dev/null || echo "None None None")
    
    if [ "$RDS_STATE" == "None None None" ]; then
        log_error "  RDS インスタンスが見つかりません"
    else
        DB_ID=$(echo $RDS_STATE | awk '{print $1}')
        DB_STATUS=$(echo $RDS_STATE | awk '{print $2}')
        DB_ENDPOINT=$(echo $RDS_STATE | awk '{print $3}')
        
        if [ "$DB_STATUS" == "available" ]; then
            echo -e "  ${GREEN}✓${NC} ${DB_ID}"
            echo "    Status: ${DB_STATUS}"
            echo "    Endpoint: ${DB_ENDPOINT}"
        else
            echo -e "  ${YELLOW}⚠${NC} ${DB_ID}"
            echo "    Status: ${DB_STATUS}"
        fi
    fi
    
    echo ""
}

# ====================================================
# メイン処理
# ====================================================

case "${1:-}" in
    start)
        start_port_forwarding
        ;;
    stop)
        stop_port_forwarding "$@"
        ;;
    status)
        check_status
        ;;
    *)
        echo "使い方: $0 {start|stop|status}"
        echo ""
        echo "  start                 - ポートフォワーディングを開始（Bastion 自動起動）"
        echo "  stop                  - セッションを停止（Bastion は起動したまま）"
        echo "  stop --stop-bastion   - セッションを停止 + Bastion を停止"
        echo "  status                - 状態を確認"
        echo ""
        echo "接続後のコマンド例:"
        echo "  psql -h localhost -p 15432 -U postgres -d neuraKnot"
        echo ""
        echo "💡 コスト削減のヒント:"
        echo "  使用後に 'stop --stop-bastion' で Bastion を停止すると"
        echo "  月額 ~$3.00 のコスト削減になります（EBS $0.64/月 は継続）"
        exit 1
        ;;
esac

