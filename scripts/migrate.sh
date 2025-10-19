#!/bin/bash

# ============================================
# Database Migration Script (Production)
# ============================================
# 本番環境のデータベースマイグレーションを実行
# 
# 警告: このスクリプトはデータベースをリセットします
#       本番データが削除されるため、慎重に実行してください
# 
# 使い方:
#   ./scripts/migrate.sh [environment]
#
# 例:
#   ./scripts/migrate.sh prod
#   ./scripts/migrate.sh dev
# ============================================

set -eo pipefail

# 色付きログ
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 環境を取得（デフォルトはprod）
ENVIRONMENT=${1:-prod}
REGION="ap-northeast-1"
ACCOUNT_ID="528757808906"

# AWS Profileを設定
export AWS_PROFILE=admin

echo ""
echo "=========================================="
echo "  Database Migration - ${ENVIRONMENT}"
echo "=========================================="
echo ""

log_critical "⚠️  WARNING: DATABASE RESET ⚠️"
log_critical "This operation will:"
log_critical "  1. DROP ALL TABLES in the database"
log_critical "  2. DELETE ALL DATA permanently"
log_critical "  3. Recreate the schema from scratch"
echo ""
log_warning "Environment: ${ENVIRONMENT}"
log_warning "Region: ${REGION}"
echo ""

# 本番環境の場合、追加の確認を要求
if [ "$ENVIRONMENT" = "prod" ]; then
    log_critical "🚨 PRODUCTION ENVIRONMENT DETECTED 🚨"
    echo ""
    echo -e "${RED}${BOLD}Are you ABSOLUTELY SURE you want to reset the PRODUCTION database?${NC}"
    read -p "Type 'YES' in capital letters: " -r
    if [ "$REPLY" != "YES" ]; then
        log_info "Migration cancelled"
        exit 0
    fi
    
    echo ""
    echo -e "${RED}${BOLD}Please confirm again by typing the environment name '${ENVIRONMENT}':${NC}"
    read -p "> " -r
    if [ "$REPLY" != "$ENVIRONMENT" ]; then
        log_error "Environment name mismatch. Migration cancelled"
        exit 1
    fi
    
    echo ""
    log_warning "Final confirmation: This will delete ALL production data"
    echo -e "${YELLOW}Type 'DELETE ALL DATA' to proceed:${NC}"
    read -p "> " -r
    if [ "$REPLY" != "DELETE ALL DATA" ]; then
        log_info "Migration cancelled"
        exit 0
    fi
fi

echo ""
log_info "Starting migration process..."

# プロジェクトルートに移動
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo "[INFO] Project root: $PROJECT_ROOT"

# Terraformから情報を取得
cd "$PROJECT_ROOT/terraform/environments/$ENVIRONMENT"

echo "[INFO] Fetching Terraform outputs..."

CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
SUBNET_IDS=$(terraform output -json private_subnet_ids | jq -r 'join(",")')
DB_HOST=$(terraform output -raw rds_host)
DB_PORT=$(terraform output -raw rds_port)
DB_NAME=$(terraform output -raw rds_database_name)
DB_USER=$(terraform output -raw rds_username)
DB_PASSWORD=$(grep 'db_password' secrets.tfvars | cut -d'"' -f2)

echo "[INFO] Getting network configuration from Backend Go service..."

# Backend Goサービスの設定を取得
BACKEND_GO_SERVICE=$(aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services neuraKnot-${ENVIRONMENT}-backend-go \
    --region $REGION \
    --output json)

SECURITY_GROUPS=$(echo $BACKEND_GO_SERVICE | jq -r '.services[0].networkConfiguration.awsvpcConfiguration.securityGroups | join(",")')

# Backend Goのタスク定義からロールを取得
TASK_DEF_ARN=$(echo $BACKEND_GO_SERVICE | jq -r '.services[0].taskDefinition')
TASK_DEF=$(aws ecs describe-task-definition \
    --task-definition $TASK_DEF_ARN \
    --region $REGION \
    --output json)

TASK_EXECUTION_ROLE=$(echo $TASK_DEF | jq -r '.taskDefinition.executionRoleArn')
TASK_ROLE=$(echo $TASK_DEF | jq -r '.taskDefinition.taskRoleArn')

echo "[SUCCESS] Configuration retrieved"
echo "[INFO] Cluster: $CLUSTER_NAME"
echo "[INFO] DB Host: $DB_HOST"

cd "$PROJECT_ROOT"

# ECRにログイン
echo "[INFO] Logging in to ECR..."
aws ecr get-login-password --region $REGION | \
    docker login --username AWS --password-stdin \
    ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Dockerイメージをビルド
echo "[INFO] Building Docker image..."
docker buildx build \
    --platform linux/amd64 \
    -f backend-go/docker/Dockerfile.migrate \
    -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/neuraknot-${ENVIRONMENT}-migrate:latest \
    backend-go/ \
    --push

echo "[SUCCESS] Image pushed to ECR"

# CloudWatch Logsグループを作成
aws logs create-log-group \
    --log-group-name /ecs/neuraKnot-${ENVIRONMENT}-migrate \
    --region $REGION 2>/dev/null || echo "[INFO] Log group already exists"

# タスク定義を作成
echo "[INFO] Creating task definition..."

cat > /tmp/migrate-task.json << EOF
{
  "family": "neuraKnot-${ENVIRONMENT}-migrate",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "${TASK_EXECUTION_ROLE}",
  "taskRoleArn": "${TASK_ROLE}",
  "containerDefinitions": [
    {
      "name": "migrate",
      "image": "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/neuraknot-${ENVIRONMENT}-migrate:latest",
      "essential": true,
      "command": ["-create-db", "-reset"],
      "environment": [
        {"name": "DB_HOST", "value": "${DB_HOST}"},
        {"name": "DB_PORT", "value": "${DB_PORT}"},
        {"name": "DB_NAME", "value": "${DB_NAME}"},
        {"name": "DB_USER", "value": "${DB_USER}"},
        {"name": "DB_PASSWORD", "value": "${DB_PASSWORD}"},
        {"name": "DB_SSLMODE", "value": "require"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/neuraKnot-${ENVIRONMENT}-migrate",
          "awslogs-region": "${REGION}",
          "awslogs-stream-prefix": "migrate"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition \
    --cli-input-json file:///tmp/migrate-task.json \
    --region $REGION > /dev/null

echo "[SUCCESS] Task definition registered"

# タスクを実行
echo "[INFO] Running migration task..."

TASK_ARN=$(aws ecs run-task \
    --cluster $CLUSTER_NAME \
    --task-definition neuraKnot-${ENVIRONMENT}-migrate \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SECURITY_GROUPS}],assignPublicIp=DISABLED}" \
    --region $REGION \
    --query 'tasks[0].taskArn' \
    --output text)

TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
echo "[SUCCESS] Task started: $TASK_ID"

# タスクの完了を待つ
echo "[INFO] Waiting for migration to complete..."

aws ecs wait tasks-stopped \
    --cluster $CLUSTER_NAME \
    --tasks $TASK_ARN \
    --region $REGION

# 終了コードを確認
EXIT_CODE=$(aws ecs describe-tasks \
    --cluster $CLUSTER_NAME \
    --tasks $TASK_ARN \
    --region $REGION \
    --query 'tasks[0].containers[0].exitCode' \
    --output text)

echo "[INFO] Task exit code: $EXIT_CODE"

# ログを表示
echo "=========================================="
echo "Migration logs:"
echo "=========================================="
aws logs tail /ecs/neuraKnot-${ENVIRONMENT}-migrate \
    --since 10m \
    --region $REGION \
    --format short 2>/dev/null || echo "[WARNING] Could not fetch logs"
echo "=========================================="

echo ""
echo "=========================================="

if [ "$EXIT_CODE" = "0" ]; then
    log_success "Migration completed successfully!"
    echo ""
    log_info "Database has been reset and schema applied"
    log_info "All previous data has been deleted"
    echo ""
    log_success "✓ Migration successful"
else
    log_error "Migration failed with exit code: $EXIT_CODE"
    log_error "Please check the logs above for details"
    echo ""
    exit 1
fi

echo "=========================================="
echo ""

