# Bastion Host 自動管理機能

## 概要

`connect-rds-bastion.sh` スクリプトに Bastion EC2 インスタンスの自動起動・停止機能を追加しました。

これにより、**使用時のみ Bastion を起動し、使用後に停止することで、月額 ~$3.00 のコスト削減**が可能です。

## コスト削減効果

| 状態 | 月額コスト | 削減額 |
|------|-----------|--------|
| **常時起動** | $3.64 (EC2 $3.00 + EBS $0.64) | - |
| **停止中** | $0.64 (EBS のみ) | **$3.00/月** |
| **完全削除** | $0.00 | $3.64/月 |

※ VPC Endpoints ($21.60/月) は ECS と共有のため削減不可

## 使い方

### 1. RDS に接続する（Bastion 自動起動）

```bash
./scripts/connect-rds-bastion.sh start
```

**動作**：
- Bastion が停止している場合、自動的に起動（1-2分）
- SSM Agent の起動を確認
- ポートフォワーディング開始（localhost:15432）

**出力例**：
```
[INFO] === Bastion インスタンスを起動します ===
[INFO] Instance ID: i-0123456789abcdef0
[INFO] Current State: stopped
[INFO] Bastion を起動しています...
[INFO] 起動完了を待機中（通常 1-2 分かかります）...
[INFO] ✓ Bastion が起動しました
[INFO] ✓ SSM Agent がオンラインになりました
[INFO] === RDS ポートフォワーディングを開始します ===
[INFO] ✓ ポートフォワーディングが正常に開始されました！
```

### 2. RDS 接続後の操作

```bash
# psql で接続
psql -h localhost -p 15432 -U postgres -d neuraKnot

# または pgAdmin / DBeaver で接続
Host: localhost
Port: 15432
Database: neuraKnot
Username: postgres
```

### 3. セッションを停止（Bastion は起動したまま）

```bash
./scripts/connect-rds-bastion.sh stop
```

**動作**：
- ポートフォワーディングセッションを終了
- **Bastion は起動したまま**（次回接続が高速）
- コスト: $3.64/月 継続

**おすすめケース**：
- 短時間で再接続する予定がある
- 1日に複数回接続する

### 4. セッションを停止 + Bastion も停止（推奨）

```bash
./scripts/connect-rds-bastion.sh stop --stop-bastion
```

**動作**：
- ポートフォワーディングセッションを終了
- **Bastion も停止**（コスト削減）
- 次回接続時は自動的に起動される

**出力例**：
```
[INFO] === セッションを停止します ===
[INFO] ✓ セッションを停止しました

[INFO] === Bastion インスタンスを停止します ===
[INFO] Instance ID: i-0123456789abcdef0
[INFO] Current State: running
[INFO] Bastion を停止しています...
[INFO] 停止完了を待機中...
[INFO] ✓ Bastion を停止しました
[INFO] 💰 コスト削減: EC2 実行料金 ~$3.00/月 が停止（EBS $0.64/月 は継続）
```

**おすすめケース**：
- 当日はもう接続しない
- 週末や長期間使わない
- コストを最小限に抑えたい

### 5. 状態を確認

```bash
./scripts/connect-rds-bastion.sh status
```

**出力例**：
```
[INFO] === 接続状態 ===

[INFO] Bastion Host:
  ✓ Instance ID: i-0123456789abcdef0
    State: stopped
    Private IP: 10.0.1.123

[INFO] Port Forwarding Session:
  停止中

[INFO] RDS Instance:
  ✓ neuraKnot-prod-db
    Status: available
    Endpoint: neuraknot-prod-db.xxxxx.ap-northeast-1.rds.amazonaws.com
```

## 運用フロー

### パターンA: たまに使う（週1回以下）

```bash
# 1. 接続（Bastion 自動起動）
./scripts/connect-rds-bastion.sh start

# 2. 作業する
psql -h localhost -p 15432 -U postgres -d neuraKnot

# 3. 終了時に Bastion も停止
./scripts/connect-rds-bastion.sh stop --stop-bastion
```

**コスト**: $0.64/月（EBS のみ）

---

### パターンB: 頻繁に使う（毎日）

```bash
# 朝：初回接続時
./scripts/connect-rds-bastion.sh start

# 日中：複数回接続・切断
./scripts/connect-rds-bastion.sh start  # 既に起動していればすぐ接続
./scripts/connect-rds-bastion.sh stop   # セッションのみ停止

# 夜：終業時に Bastion も停止
./scripts/connect-rds-bastion.sh stop --stop-bastion
```

**コスト**: ~$1.50/月（月の半分稼働と仮定）

---

### パターンC: 最大限のコスト削減（完全削除）

長期間使わない場合は Terraform で完全削除：

```bash
# 完全削除
cd terraform/environments/prod
terraform destroy -target=module.bastion

# 必要時に再作成（5分程度）
terraform apply -target=module.bastion
```

**コスト**: $0

## トラブルシューティング

### エラー: Bastion インスタンスが見つかりません

```bash
# Terraform でデプロイ
cd terraform/environments/prod
terraform apply -target=module.bastion
```

### エラー: ポートが既に使用されています

```bash
# 既存のセッションを停止
./scripts/connect-rds-bastion.sh stop

# または、使用中のプロセスを確認
lsof -Pi :15432 -sTCP:LISTEN
```

### SSM Agent がオンラインにならない

Bastion 起動後、SSM Agent が起動するまで最大 60秒待機しますが、稀にタイムアウトすることがあります。

```bash
# 再度接続を試す
./scripts/connect-rds-bastion.sh start

# または、AWS コンソールで SSM Fleet Manager を確認
```

## 技術的詳細

### 自動起動の仕組み

1. `get_bastion_info()` で Bastion の状態を取得（停止中も含む）
2. 状態が `stopped` の場合、`aws ec2 start-instances` で起動
3. `aws ec2 wait instance-running` で起動完了を待機
4. SSM Agent のオンライン状態を確認（最大 60秒）
5. ポートフォワーディング開始

### 停止時の挙動

- **デフォルト**：セッションのみ停止、Bastion は起動したまま
- **`--stop-bastion` フラグ**：セッション + Bastion を停止

### 料金計算

```
t4g.nano (ARM64):
  起動時: $0.0042/時間 × 24時間 × 30日 = $3.024/月
  停止時: $0.00/月

EBS gp3 8GB:
  常時: $0.08/GB/月 × 8GB = $0.64/月
```

## まとめ

✅ **使用時のみ起動**: 自動起動機能で手間なし  
✅ **コスト削減**: 月額 $3.00 の削減（停止時）  
✅ **簡単操作**: `stop --stop-bastion` で停止  
✅ **高速再開**: 停止から起動まで 1-2分  

**推奨運用**: 使用後は必ず `stop --stop-bastion` で停止！

