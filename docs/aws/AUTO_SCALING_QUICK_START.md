# ECS Auto Scaling クイックスタートガイド

## 概要

このガイドでは、ECS Auto Scalingを本番環境に適用する手順を説明します。
所要時間: 約15分

## 前提条件

- Terraform がインストールされていること
- AWS CLI が設定されていること
- 本番環境へのデプロイ権限があること

## 実装内容

### 設定値

```hcl
Backend Go:
  - 最小タスク数: 1
  - 最大タスク数: 5
  - CPU目標値: 70%
  - メモリ目標値: 80%

Backend Python:
  - 最小タスク数: 1
  - 最大タスク数: 3
  - CPU目標値: 70%
  - メモリ目標値: 80%
```

### 期待される効果

- **コスト削減**: 従来比 25-50% のコスト削減（トラフィックパターンによる）
- **可用性向上**: 自動スケールアウトによる負荷対応
- **運用効率化**: 手動スケール操作が不要

## デプロイ手順

### Step 1: 変更内容の確認

```bash
cd terraform/environments/prod

# 変更内容をプレビュー
terraform plan

# 以下のリソースが作成されることを確認
# - aws_appautoscaling_target (2つ)
# - aws_appautoscaling_policy (4つ)
```

### Step 2: Terraform Apply

```bash
# ピークタイムを避けた時間帯（推奨: 深夜または早朝）に実行
terraform apply

# "yes" を入力して適用
```

### Step 3: 適用結果の確認

```bash
# Backend Go のスケーリングターゲットを確認
aws application-autoscaling describe-scalable-targets \
  --service-namespace ecs \
  --resource-ids service/neuraKnot-prod-cluster/neuraKnot-prod-backend-go

# スケーリングポリシーを確認
aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs \
  --resource-id service/neuraKnot-prod-cluster/neuraKnot-prod-backend-go

# 現在のタスク数を確認
aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --services neuraKnot-prod-backend-go \
  --query 'services[0].{desiredCount:desiredCount,runningCount:runningCount}'
```

### Step 4: 監視設定

CloudWatch ダッシュボードで以下のメトリクスを監視：

```bash
# CloudWatch コンソールへ移動
# または、AWS CLI で確認

# CPU使用率
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=neuraKnot-prod-backend-go \
              Name=ClusterName,Value=neuraKnot-prod-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# メモリ使用率
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=neuraKnot-prod-backend-go \
              Name=ClusterName,Value=neuraKnot-prod-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

## 動作確認

### スケールアウトのテスト（オプション）

```bash
# Backend Go のCPU負荷を人為的に上げる（テスト用）
# 注意: 本番環境では慎重に実行してください

# タスクに接続
aws ecs execute-command \
  --cluster neuraKnot-prod-cluster \
  --task <TASK_ID> \
  --container backend-go \
  --interactive \
  --command "/bin/sh"

# コンテナ内でCPU負荷を生成（テスト用）
# dd if=/dev/zero of=/dev/null &

# 数分後、タスク数が増加することを確認
aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --services neuraKnot-prod-backend-go \
  --query 'services[0].desiredCount'
```

### スケーリングアクティビティの確認

```bash
# スケーリングアクティビティの履歴を確認
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs \
  --resource-id service/neuraKnot-prod-cluster/neuraKnot-prod-backend-go \
  --max-results 10
```

## 監視ポイント

最初の1-2週間は以下の点を重点的に監視してください：

### 1. スケーリング頻度

```bash
# 過去24時間のスケーリングアクティビティ
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs \
  --resource-id service/neuraKnot-prod-cluster/neuraKnot-prod-backend-go \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S)
```

**確認事項：**
- スケールアウト/スケールインが頻繁すぎないか（1時間に5回以上は注意）
- スケールインが遅すぎないか（負荷が下がってから10分以上かかる場合）

### 2. CPU/メモリ使用率

```bash
# CloudWatch Logs Insights クエリ（ECS Container Insights）
# CloudWatch > Logs Insights で実行

fields @timestamp, ServiceName, TaskId, CpuUtilized, MemoryUtilized
| filter ServiceName = "neuraKnot-prod-backend-go"
| stats avg(CpuUtilized) as AvgCPU, max(CpuUtilized) as MaxCPU by bin(5m)
| sort @timestamp desc
```

**確認事項：**
- 平均CPU使用率が70%前後で安定しているか
- 最大タスク数に頻繁に到達していないか

### 3. コスト

```bash
# Cost Explorer で確認
# Services: Amazon Elastic Container Service
# Filters: 
#   - Cluster: neuraKnot-prod-cluster
# Granularity: Daily
```

**確認事項：**
- 1日あたりのコストが予想範囲内か
- 週末や深夜の時間帯でコストが削減されているか

## カスタマイズ

### CPU目標値の変更

現在のスケールアウトが早すぎる、または遅すぎる場合：

```bash
# terraform/environments/prod/terraform.tfvars を編集
echo 'backend_go_cpu_target_value = 80' >> terraform.tfvars

# 適用
terraform apply
```

**推奨値：**
- 保守的（早めにスケール）: 60-65%
- 標準: 70-75%
- 積極的（遅めにスケール）: 80-85%

### 最大タスク数の変更

負荷が予想以上に高い場合：

```bash
# terraform/environments/prod/terraform.tfvars を編集
echo 'backend_go_autoscaling_max_capacity = 10' >> terraform.tfvars

# 適用
terraform apply
```

### クールダウン時間の調整

頻繁にスケールする場合、クールダウン時間を延長：

```hcl
# terraform/modules/ecs/main.tf を編集
# scale_in_cooldown = 300 → 600 (10分)
# scale_out_cooldown = 60 → 120 (2分)
```

## トラブルシューティング

### 問題: スケールアウトしない

**原因1: 最大タスク数に到達**
```bash
# 確認
aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --services neuraKnot-prod-backend-go \
  --query 'services[0].desiredCount'

# 対処: 最大タスク数を増やす
```

**原因2: CPU/メモリが閾値に到達していない**
```bash
# CloudWatch でメトリクスを確認
# CPU使用率が70%を超えているか確認
```

### 問題: スケールインが遅い

**対処:**
- クールダウン時間（300秒）待機中の可能性
- 意図的に保守的に設定されているため、問題ない場合が多い

### 問題: 頻繁にスケールする（フラッピング）

**対処:**
```bash
# CPU目標値を調整
echo 'backend_go_cpu_target_value = 75' >> terraform.tfvars

# スケールインのクールダウンを延長
# main.tf で scale_in_cooldown = 600 (10分) に変更
```

### 問題: エラーが発生して適用できない

**確認事項:**
```bash
# Terraform のロックを確認
terraform force-unlock <LOCK_ID>

# IAM権限を確認
aws sts get-caller-identity

# サービスリンクロールの存在を確認
aws iam get-role \
  --role-name AWSServiceRoleForApplicationAutoScaling_ECSService
```

## ロールバック手順

Auto Scalingを無効化して元の固定タスク数に戻す場合：

```bash
cd terraform/environments/prod

# terraform.tfvars を編集
echo 'enable_autoscaling = false' >> terraform.tfvars
echo 'backend_go_desired_count = 2' >> terraform.tfvars

# 適用
terraform apply
```

## 次のステップ

1. **1週間の監視**
   - スケーリングパターンを記録
   - コストの変化を確認
   - パフォーマンスメトリクスを収集

2. **閾値の最適化**
   - 収集したデータを基に目標値を調整
   - 最適なバランスを見つける

3. **アラート設定**
   - 最大タスク数到達アラート
   - スケーリング失敗アラート
   - コスト異常アラート

4. **カスタムメトリクスの検討**
   - ALB リクエスト数ベースのスケーリング
   - レスポンスタイムベースのスケーリング
   - カスタムビジネスメトリクス

## 参考資料

- [ECS Auto Scaling 詳細ガイド](./ECS_AUTO_SCALING.md)
- [AWS公式: ECS Auto Scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
- [AWS公式: Target Tracking Scaling](https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-target-tracking.html)

## サポート

質問や問題がある場合は、以下を参照してください：

- GitHub Issues: [NeuraKnot Issues](https://github.com/YOUR_USERNAME/NeuraKnot/issues)
- 詳細ドキュメント: [docs/aws/](./README.md)


