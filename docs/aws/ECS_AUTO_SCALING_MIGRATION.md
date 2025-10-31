# ECS Auto Scaling 移行ガイド

## 概要

固定タスク数構成から Auto Scaling 構成への移行手順を説明します。

## 移行内容

### Before（従来構成）

```hcl
Backend Go:
  CPU/メモリ: 256/512
  タスク数: 2（固定）
  月額コスト: $20.52

Backend Python:
  CPU/メモリ: 512/1024
  タスク数: 1（固定）
  月額コスト: $20.48

合計: $40.96/月
Auto Scaling: なし
```

### After（新構成）

```hcl
Backend Go:
  CPU/メモリ: 256/512
  タスク数: 1-5（Auto Scaling）
  月額コスト: $10.26-$51.30

Backend Python:
  CPU/メモリ: 256/512（最小化）
  タスク数: 1-5（Auto Scaling）
  月額コスト: $10.26-$51.30

基本コスト: $20.52/月（50%削減）
最大コスト: $102.60/月
Auto Scaling: 有効
  - CPU目標: 70%
  - メモリ目標: 80%
  - スケールアウト: 60秒
  - スケールイン: 300秒
```

## 変更されたファイル

### 1. Terraform モジュール

```
terraform/modules/ecs/
├── variables.tf     ✅ 変更済み
│   ├── リソース設定を最小値に変更
│   ├── Auto Scaling変数を追加
│   └── desired_countを1に変更
│
├── main.tf          ✅ 変更済み
│   ├── lifecycle に desired_count を追加
│   ├── Auto Scaling Target を追加
│   ├── CPU Scaling Policy を追加
│   └── Memory Scaling Policy を追加
│
└── outputs.tf       ✅ 変更済み
    └── Auto Scaling 関連のアウトプットを追加
```

### 2. 環境設定ファイル

```
terraform/environments/prod/
├── variables.tf     ✅ 変更済み
│   ├── CPU/メモリのデフォルト値を更新
│   └── desired_countのデフォルト値を1に変更
│
└── terraform.tfvars ✅ 変更済み
    ├── backend_python_cpu: 512 → 256
    ├── backend_python_memory: 1024 → 512
    └── Auto Scalingに関するコメントを追加
```

### 3. ドキュメント

```
docs/aws/
├── ECS_AUTO_SCALING.md                    ✅ 新規作成
│   └── Auto Scalingの詳細説明
│
├── AUTO_SCALING_QUICK_START.md            ✅ 新規作成
│   └── デプロイ手順とトラブルシューティング
│
├── ECS_MINIMAL_COST_CONFIGURATION.md      ✅ 新規作成
│   └── 最小コスト構成ガイド
│
└── ECS_AUTO_SCALING_MIGRATION.md          ✅ このファイル
    └── 移行手順

README.md                                   ✅ 更新済み
├── インフラストラクチャセクションにAuto Scalingを追加
└── ドキュメントリンクを追加
```

## 移行手順

### Step 1: 変更内容の確認

```bash
cd /Users/chihiro/Desktop/個人開発/NeuraKnot/terraform/environments/prod

# 変更されたリソースを確認
terraform plan

# 期待される変更:
# 1. aws_ecs_task_definition.backend_python の更新
#    - cpu: 512 → 256
#    - memory: 1024 → 512
#
# 2. aws_appautoscaling_target の作成（2つ）
#    - backend_go: 最小1、最大5
#    - backend_python: 最小1、最大5
#
# 3. aws_appautoscaling_policy の作成（4つ）
#    - backend_go: CPU、メモリ
#    - backend_python: CPU、メモリ
```

### Step 2: バックアップの作成

```bash
# Terraform状態ファイルのバックアップ
cp terraform.tfstate terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)

# 現在のタスク数を記録
aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --services neuraKnot-prod-backend-go neuraKnot-prod-backend-python \
  --query 'services[*].{name:serviceName,desired:desiredCount,running:runningCount}' \
  --output table > ecs_services_before_migration.txt
```

### Step 3: 移行の実行

```bash
# ピークタイムを避けて実行（推奨: 深夜または早朝）
terraform apply

# 確認プロンプトで変更内容を再確認
# 問題なければ "yes" を入力
```

### Step 4: 移行直後の確認

```bash
# タスク定義の更新を確認
aws ecs describe-task-definition \
  --task-definition neuraKnot-prod-backend-python \
  --query 'taskDefinition.{cpu:cpu,memory:memory}' \
  --output table

# Auto Scaling設定を確認
aws application-autoscaling describe-scalable-targets \
  --service-namespace ecs \
  --resource-ids \
    service/neuraKnot-prod-cluster/neuraKnot-prod-backend-go \
    service/neuraKnot-prod-cluster/neuraKnot-prod-backend-python

# スケーリングポリシーを確認
aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs \
  --max-results 10

# サービスの状態を確認
aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --services neuraKnot-prod-backend-go neuraKnot-prod-backend-python \
  --query 'services[*].{name:serviceName,desired:desiredCount,running:runningCount,status:status}' \
  --output table
```

### Step 5: 動作確認

```bash
# ヘルスチェック
curl https://api.neuraknot.net/health

# Backend Goのエンドポイント確認
curl -X GET https://api.neuraknot.net/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Backend Pythonのエンドポイント確認（Backend Go経由）
# チャット送信をテスト
```

## 移行後の監視（最初の 24 時間）

### 重点監視項目

```bash
# 1. タスク数の変動を監視（15分ごと）
watch -n 900 'aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --services neuraKnot-prod-backend-go neuraKnot-prod-backend-python \
  --query "services[*].{name:serviceName,desired:desiredCount,running:runningCount}" \
  --output table'

# 2. CPU/メモリ使用率を監視
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=neuraKnot-prod-backend-python \
              Name=ClusterName,Value=neuraKnot-prod-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# 3. スケーリングイベントを確認
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs \
  --resource-id service/neuraKnot-prod-cluster/neuraKnot-prod-backend-python \
  --max-results 20

# 4. エラーログを監視
aws logs tail /ecs/neuraKnot-prod-backend-python --follow --format short
```

### アラートすべき状態

```
⚠️ 警告レベル:
- CPU使用率が80%を超える状態が5分以上継続
- メモリ使用率が85%を超える
- タスクが頻繁に再起動（1時間に3回以上）

🚨 緊急レベル:
- タスクが起動できない（OOM Killerなど）
- Auto Scalingが機能しない
- 最大タスク数（5）に頻繁に到達
- APIエンドポイントがタイムアウト
```

## ロールバック手順

問題が発生した場合のロールバック方法：

### オプション 1: Terraform でロールバック

```bash
cd /Users/chihiro/Desktop/個人開発/NeuraKnot/terraform/environments/prod

# terraform.tfvarsを編集
cat >> terraform.tfvars << EOF

# Rollback to previous configuration
backend_python_cpu = 512
backend_python_memory = 1024
backend_go_desired_count = 2
backend_python_desired_count = 1
EOF

# Auto Scalingを無効化
cat >> terraform.tfvars << EOF
# Disable Auto Scaling
# This variable needs to be added to the module
EOF

# 適用
terraform apply
```

### オプション 2: AWS CLI で緊急対応

```bash
# Backend Pythonのタスク定義を前のリビジョンに戻す
aws ecs update-service \
  --cluster neuraKnot-prod-cluster \
  --service neuraKnot-prod-backend-python \
  --task-definition neuraKnot-prod-backend-python:PREVIOUS_REVISION

# タスク数を手動で増やす
aws ecs update-service \
  --cluster neuraKnot-prod-cluster \
  --service neuraKnot-prod-backend-go \
  --desired-count 2

# Auto Scalingを一時的に無効化
aws application-autoscaling deregister-scalable-target \
  --service-namespace ecs \
  --resource-id service/neuraKnot-prod-cluster/neuraKnot-prod-backend-python \
  --scalable-dimension ecs:service:DesiredCount
```

## よくある問題と対処法

### 問題 1: Backend Python でメモリ不足エラー

```
症状:
- タスクが起動後すぐに停止
- CloudWatch Logsに "Out of Memory" エラー

原因:
- 256 CPU / 512 MB では AI処理に不十分

対処:
terraform.tfvars に以下を追加:
backend_python_cpu = 512
backend_python_memory = 1024

terraform apply
```

### 問題 2: 頻繁にスケールアウトする

```
症状:
- 1時間に5回以上スケーリングイベントが発生

原因:
- CPU閾値が低すぎる
- タスクのリソースが不足

対処:
terraform.tfvars に以下を追加:
# Option 1: 閾値を上げる
backend_python_cpu_target_value = 80

# Option 2: リソースを増やす
backend_python_cpu = 512
backend_python_memory = 1024

terraform apply
```

### 問題 3: タスクが起動しない

```
症状:
- desired count は 1 だが running count が 0

原因:
- コンテナイメージの問題
- リソース不足
- ネットワーク問題

確認:
aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --service neuraKnot-prod-backend-python \
  --query 'services[0].events[0:5]'

aws logs tail /ecs/neuraKnot-prod-backend-python --since 10m
```

## 成功の判断基準

### 移行成功の指標（1 週間後）

```
✅ タスクの安定性
- タスク再起動: 1日1回以下
- CPU使用率: 平均30-70%
- メモリ使用率: 平均50-80%

✅ Auto Scaling の動作
- スケーリングイベント: 1日1-5回
- スケールアウト時間: 2分以内
- スケールイン時間: 5-10分

✅ コスト
- 月額コスト: $20-40の範囲
- 従来比: 25-50%削減

✅ パフォーマンス
- APIレスポンスタイム: 従来と同等以上
- エラー率: 1%未満
- タイムアウト: なし
```

## まとめ

### 移行のメリット

✅ **コスト削減**: 25-50%削減（$40.96 → $20.52-$34/月）
✅ **可用性向上**: Auto Scaling による自動対応
✅ **運用効率化**: 手動スケール操作が不要
✅ **将来性**: トラフィック増加に自動対応

### 次のステップ

1. **1 週間の監視期間**

   - 毎日 CPU/メモリ使用率を確認
   - スケーリングイベントを記録
   - コストを追跡

2. **最適化フェーズ（2 週目以降）**

   - 閾値の調整
   - 最大タスク数の見直し
   - リソース配分の最適化

3. **長期運用（1 ヶ月後）**
   - カスタムメトリクスの追加検討
   - スケジュールベースのスケーリング検討
   - コスト分析と最適化

## サポート

問題が発生した場合：

1. CloudWatch Logs でエラーを確認
2. Auto Scaling アクティビティを確認
3. 必要に応じてロールバック
4. ドキュメントのトラブルシューティングを参照

関連ドキュメント：

- [ECS Auto Scaling 詳細ガイド](./ECS_AUTO_SCALING.md)
- [クイックスタートガイド](./AUTO_SCALING_QUICK_START.md)
- [最小コスト構成ガイド](./ECS_MINIMAL_COST_CONFIGURATION.md)
