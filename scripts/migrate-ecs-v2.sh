#!/bin/bash

# ECS Migration Script - Simplified Version

ENVIRONMENT="prod"
REGION="ap-northeast-1"
ACCOUNT_ID="528757808906"

export AWS_PROFILE=admin

echo "[INFO] Environment: $ENVIRONMENT"
echo "[WARNING] This will RESET the database"

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

if [ "$EXIT_CODE" = "0" ]; then
    echo "[SUCCESS] Migration completed successfully!"
else
    echo "[ERROR] Migration failed with exit code: $EXIT_CODE"
    exit 1
fi

echo "[SUCCESS] All done!"

