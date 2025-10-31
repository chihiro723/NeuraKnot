# ECS 最小コスト構成ガイド

## 設定概要

最小コストで ECS を運用するための推奨構成です。

## 最終的な構成（推奨）

### Backend Go

```hcl
# リソース（Fargateの最小値）
CPU: 256 units (0.25 vCPU)
メモリ: 512 MB

# Auto Scaling
最小タスク数: 1
最大タスク数: 5
CPU閾値: 70%
メモリ閾値: 80%
```

### Backend Python

```hcl
# リソース（AI処理を考慮した最小推奨値）
CPU: 512 units (0.5 vCPU)
メモリ: 1024 MB

# Auto Scaling
最小タスク数: 1
最大タスク数: 5
CPU閾値: 70%
メモリ閾値: 80%
```

## コスト試算

### 基本コスト（最小構成時）

**Fargate 料金（東京リージョン）：**

- vCPU: $0.04656 / vCPU / 時間
- メモリ: $0.00511 / GB / 時間

**Backend Go（0.25 vCPU, 0.5 GB）：**

```
時間単価 = (0.25 × $0.04656) + (0.5 × $0.00511)
         = $0.01164 + $0.002555
         = $0.014195 / タスク / 時間

月額 = $0.014195 × 24時間 × 30日 = $10.26
```

**Backend Python（0.5 vCPU, 1 GB）：**

```
時間単価 = (0.5 × $0.04656) + (1 × $0.00511)
         = $0.02328 + $0.00511
         = $0.02839 / タスク / 時間

月額 = $0.02839 × 24時間 × 30日 = $20.48
```

**基本コスト合計: $30.74/月**

### 最大コスト（全タスク稼働時）

```
Backend Go:     5タスク × $10.26 = $51.30
Backend Python: 5タスク × $20.48 = $102.40
───────────────────────────────────────
最大合計: $153.70/月
```

### 実際の運用コスト（予想）

**低トラフィックシナリオ（開発初期）：**

```
Backend Go:
  平常時（24時間）: 1タスク = $10.26
  ピーク時（なし）: 0

Backend Python:
  平常時（24時間）: 1タスク = $20.48
  ピーク時（なし）: 0

月額合計: 約$31/月
```

**中トラフィックシナリオ（通常運用）：**

```
Backend Go:
  平常時（20時間/日）: 1タスク = $8.52
  中負荷（3時間/日）: 2タスク = $2.56
  高負荷（1時間/日）: 3タスク = $1.28
  小計: $12.36

Backend Python:
  平常時（22時間/日）: 1タスク = $18.77
  中負荷（2時間/日）: 2タスク = $2.73
  小計: $21.50

月額合計: 約$34/月
```

## 従来構成との比較

| 項目                    | 従来構成  | 最小構成     | 削減率 |
| ----------------------- | --------- | ------------ | ------ |
| Backend Go タスク数     | 2（固定） | 1〜5（可変） | -      |
| Backend Python タスク数 | 1（固定） | 1〜5（可変） | -      |
| 基本月額コスト          | $40.96    | $30.74       | 25%    |
| 最大月額コスト          | $40.96    | $153.70      | -      |
| 実際の予想コスト        | $40.96    | $34          | 17%    |

## Terraform 設定値

### variables.tf（デフォルト値）

```hcl
# Backend Go リソース（最小構成）
variable "backend_go_cpu" {
  default = 256  # 0.25 vCPU（Fargateの最小）
}

variable "backend_go_memory" {
  default = 512  # 512 MB（Fargateの最小）
}

# Backend Python リソース（AI処理用最小推奨）
variable "backend_python_cpu" {
  default = 512  # 0.5 vCPU
}

variable "backend_python_memory" {
  default = 1024  # 1 GB
}

# Auto Scaling設定（統一）
variable "backend_go_autoscaling_min_capacity" {
  default = 1
}

variable "backend_go_autoscaling_max_capacity" {
  default = 5
}

variable "backend_python_autoscaling_min_capacity" {
  default = 1
}

variable "backend_python_autoscaling_max_capacity" {
  default = 5
}

# スケーリング閾値
variable "backend_go_cpu_target_value" {
  default = 70
}

variable "backend_go_memory_target_value" {
  default = 80
}

variable "backend_python_cpu_target_value" {
  default = 70
}

variable "backend_python_memory_target_value" {
  default = 80
}
```

### terraform.tfvars（本番環境でカスタマイズ不要）

デフォルト値がそのまま使用されるため、追加設定は不要です。

## さらなる最小化オプション（非推奨）

### Backend Python を最小 Fargate 構成にする場合

```hcl
# terraform/environments/prod/terraform.tfvars
backend_python_cpu = 256
backend_python_memory = 512
```

**予想される問題：**

- AI 処理（LangChain、OpenAI API 呼び出し）の遅延
- メモリ不足による OOM（Out of Memory）エラー
- 頻繁なタスク再起動
- 結果的に多くのタスクが必要になりコスト増

**月額コスト削減：**

```
$20.48 → $10.26
削減額: 約$10/月

ただし、パフォーマンス低下により実質的なコスト削減効果は限定的
```

## モニタリングとアラート

### コスト異常検知

CloudWatch Billing Alarms を設定：

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name ECS-Monthly-Cost-Alert \
  --alarm-description "ECS月額コストが$50を超えた場合にアラート" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=AmazonECS
```

### タスク数モニタリング

```bash
# Backend Go のタスク数を確認
aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --services neuraKnot-prod-backend-go \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}'

# Backend Python のタスク数を確認
aws ecs describe-services \
  --cluster neuraKnot-prod-cluster \
  --services neuraKnot-prod-backend-python \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}'
```

## ベストプラクティス

### 1. 段階的な最適化

```
ステップ1: 現在の推奨構成でデプロイ
  └─ 1週間運用してパフォーマンス確認

ステップ2: メトリクス分析
  └─ CPU/メモリ使用率、レスポンスタイムを確認

ステップ3: 必要に応じて調整
  └─ 使用率が常に低ければさらに最小化を検討
```

### 2. パフォーマンステスト

本番環境適用前に負荷テストを実施：

```bash
# Backend Go のエンドポイントに負荷テスト
ab -n 1000 -c 10 https://api.neuraknot.net/health

# Backend Python（AI処理）の負荷テスト
# チャット送信を繰り返し実行
```

### 3. コスト最適化の優先順位

```
1. Auto Scalingの導入 ✅（今回実施）
   → 最も効果的、リスク最小

2. 最小タスク数の調整 ✅（今回実施）
   → 2タスク → 1タスクで25%削減

3. タスクサイズの最小化 ⚠️
   → Backend Pythonは慎重に
   → パフォーマンステスト必須

4. スケジュールベースのスケーリング 🔜
   → 深夜は自動で最小化
   → 将来的な改善として検討
```

## トラブルシューティング

### 問題: Backend Python でメモリ不足エラー

```bash
# CloudWatch Logs で確認
# "Out of Memory" または "Killed" を検索

# 対処: メモリを増やす
echo 'backend_python_memory = 2048' >> terraform.tfvars
terraform apply
```

### 問題: AI 処理が遅い

```bash
# CloudWatch Logs で処理時間を確認

# 対処1: CPUを増やす
echo 'backend_python_cpu = 1024' >> terraform.tfvars

# 対処2: タイムアウト時間を延長
# backend-go/internal/handler/http/ai_handler.go の AI_SERVICE_TIMEOUT を延長
```

### 問題: 頻繁にスケールアウトする

```bash
# スケーリングアクティビティを確認
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs \
  --resource-id service/neuraKnot-prod-cluster/neuraKnot-prod-backend-python

# 対処: CPU閾値を上げる
echo 'backend_python_cpu_target_value = 80' >> terraform.tfvars
terraform apply
```

## まとめ

### 推奨構成のメリット

✅ **コスト削減**: 従来比 25%削減（$40.96 → $30.74）
✅ **Auto Scaling**: 負荷増加時の自動対応
✅ **コスト上限**: 最大$153.70/月で予期しない高額請求を防止
✅ **運用負荷低減**: 手動スケール操作不要

### 注意点

⚠️ **最小 1 タスク**: 1 タスクダウン時はサービス停止のリスク
⚠️ **コールドスタート**: タスク起動に 1-2 分かかる
⚠️ **Backend Python**: AI 処理のため 512 CPU 推奨

### 次のステップ

1. **デプロイ**: `terraform apply` で適用
2. **監視**: 1 週間のメトリクス収集
3. **最適化**: 使用状況に応じて閾値調整
4. **スケジューリング**: 将来的に時間帯別スケーリングを検討

## 参考資料

- [ECS Auto Scaling 詳細ガイド](./ECS_AUTO_SCALING.md)
- [ECS Auto Scaling クイックスタート](./AUTO_SCALING_QUICK_START.md)
- [AWS Fargate 料金](https://aws.amazon.com/fargate/pricing/)
