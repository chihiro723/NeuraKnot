# CI/CD セットアップガイド

## 概要

このプロジェクトでは GitHub Actions を使用した CI/CD パイプラインを実装しています。

### ワークフロー構成

1. **CI (Continuous Integration)** - PR 時に自動実行
2. **Terraform Plan** - Terraform 変更時に PR へコメント
3. **Deploy (Continuous Deployment)** - main ブランチへの push 時に自動デプロイ

## ワークフローの詳細

### 1. CI ワークフロー (`.github/workflows/ci.yml`)

**トリガー**: Pull Request の作成・更新時

**実行内容**:

- **変更検出**: 変更されたコンポーネントのみテスト実行
- **Frontend CI**:
  - ESLint による静的解析
  - TypeScript 型チェック
  - ビルドチェック
- **Backend Go CI**:
  - golangci-lint による静的解析
  - テスト実行 (race detector 有効)
  - ビルドチェック
- **Backend Python CI**:
  - ruff による静的解析
  - black によるコードフォーマットチェック
  - mypy による型チェック (optional)

### 2. Terraform Plan ワークフロー (`.github/workflows/terraform-plan.yml`)

**トリガー**: `terraform/` ディレクトリに変更がある PR

**実行内容**:

- Terraform フォーマットチェック
- Terraform 初期化
- Terraform バリデーション
- Terraform Plan 実行
- Plan 結果を PR にコメント

**注意事項**:

- 機密情報は `dummy` 値で Plan を実行
- 実際の apply は手動で実行する必要があります

### 3. Deploy ワークフロー (`.github/workflows/deploy.yml`)

**トリガー**: main ブランチへの push（backend-go または backend-python の変更時）

**実行内容**:

#### Backend Go デプロイ

1. Docker イメージのビルド
2. Amazon ECR へのプッシュ (タグ: `<commit-sha>` と `latest`)
3. ECS サービスの更新
4. サービス安定化の待機

#### Backend Python デプロイ

1. Docker イメージのビルド
2. Amazon ECR へのプッシュ (タグ: `<commit-sha>` と `latest`)
3. ECS サービスの更新
4. サービス安定化の待機

**注意事項**:

- Frontend は Vercel の自動デプロイを使用（このワークフローには含まれません）
- 変更検出により、変更されたサービスのみデプロイされます

## GitHub Secrets の設定

### 必須設定

リポジトリの Settings > Secrets and variables > Actions で以下を設定してください：

| Secret 名                 | 説明                          | 例                                                  |
| ------------------------- | ----------------------------- | --------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`       | AWS アクセスキー ID           | `AKIA...`                                           |
| `AWS_SECRET_ACCESS_KEY`   | AWS シークレットアクセスキー  | `wJalr...`                                          |
| `AWS_REGION`              | AWS リージョン                | `ap-northeast-1`                                    |
| `ECR_REGISTRY`            | ECR レジストリ URL            | `528757808906.dkr.ecr.ap-northeast-1.amazonaws.com` |
| `ECS_CLUSTER_NAME`        | ECS クラスタ名                | `neuraknot-prod-cluster`                            |
| `ECS_SERVICE_NAME_GO`     | Backend Go ECS サービス名     | `neuraknot-prod-backend-go`                         |
| `ECS_SERVICE_NAME_PYTHON` | Backend Python ECS サービス名 | `neuraknot-prod-backend-python`                     |

### AWS IAM ポリシー

GitHub Actions 用の IAM ユーザーには以下の権限が必要です：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["ecs:UpdateService", "ecs:DescribeServices"],
      "Resource": [
        "arn:aws:ecs:ap-northeast-1:*:service/neuraknot-prod-cluster/*"
      ]
    }
  ]
}
```

### Secrets 設定手順

1. GitHub リポジトリページを開く
2. `Settings` タブをクリック
3. 左サイドバーの `Secrets and variables` > `Actions` を選択
4. `New repository secret` ボタンをクリック
5. Secret 名と値を入力して保存
6. 上記の全ての Secret について繰り返す

## Linter 設定ファイル

### Backend Go (`.golangci.yml`)

golangci-lint の設定ファイル。以下のリンターを有効化：

- gofmt: コードフォーマット
- govet: 静的解析
- staticcheck: 高度な静的解析
- unused: 未使用コードの検出
- errcheck: エラーチェック
- gosimple: コード簡略化の提案
- ineffassign: 無効な代入の検出
- typecheck: 型チェック

### Backend Python (`pyproject.toml`)

ruff と black の設定ファイル：

- **ruff**: 高速な Python linter（pycodestyle, pyflakes, isort 互換）
- **black**: コードフォーマッター
- 行長: 120 文字

## ワークフローの実行確認

### CI ワークフロー

1. 新しいブランチを作成
2. コードを変更して commit
3. Pull Request を作成
4. `Actions` タブでワークフローの実行状態を確認
5. チェックが全て通ることを確認

### Terraform Plan ワークフロー

1. `terraform/` ディレクトリのファイルを変更
2. Pull Request を作成
3. PR のコメントに Terraform Plan の結果が表示される
4. Plan 結果を確認してマージ

### Deploy ワークフロー

1. Pull Request を main ブランチにマージ
2. `Actions` タブで `Deploy to Production` ワークフローを確認
3. デプロイの進行状況を監視
4. デプロイ完了後、ECS コンソールで新しいタスクが起動していることを確認

## トラブルシューティング

### デプロイが失敗する

**症状**: Deploy ワークフローが失敗する

**確認事項**:

1. GitHub Secrets が正しく設定されているか
2. IAM ユーザーに必要な権限があるか
3. ECR リポジトリが存在するか
4. ECS クラスタとサービスが存在するか

**ログの確認方法**:

- GitHub Actions の `Actions` タブから失敗したワークフローを開く
- 失敗したステップのログを確認

### Linter エラーが発生する

**症状**: CI ワークフローで linter エラーが発生

**対処方法**:

**Backend Go**:

```bash
cd backend-go
golangci-lint run --fix
```

**Backend Python**:

```bash
cd backend-python
ruff check --fix .
black .
```

**Frontend**:

```bash
cd frontend
npm run lint -- --fix
```

### ECR 認証エラー

**症状**: `Error response from daemon: Get https://ECR_REGISTRY/v2/: no basic auth credentials`

**対処方法**:

1. AWS 認証情報が正しいか確認
2. IAM ユーザーに ECR 権限があるか確認
3. ECR リポジトリが存在するか確認

### ECS サービス更新が完了しない

**症状**: `aws ecs wait services-stable` がタイムアウト

**対処方法**:

1. ECS コンソールでサービスのイベントログを確認
2. タスクがヘルスチェックを通過しているか確認
3. CloudWatch Logs でコンテナのログを確認

## ベストプラクティス

### コミット前のチェック

ローカルで linter を実行してからコミット：

```bash
# Backend Go
cd backend-go && golangci-lint run

# Backend Python
cd backend-python && ruff check . && black --check .

# Frontend
cd frontend && npm run lint
```

### 段階的なデプロイ

大きな変更の場合：

1. 小さな変更に分割
2. 各変更ごとに PR を作成
3. CI が通ることを確認してマージ
4. デプロイが成功することを確認してから次の変更へ

### ロールバック

問題が発生した場合：

1. GitHub で問題のあるコミットを特定
2. `git revert` で変更を取り消し
3. 新しい PR を作成してマージ
4. 自動デプロイで前のバージョンに戻る

または、AWS コンソールから：

1. ECS サービスの以前のタスク定義を選択
2. サービスを更新

## 参考リンク

- [GitHub Actions Documentation](https://docs.github.com/ja/actions)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ja_jp/ecs/)
- [golangci-lint](https://golangci-lint.run/)
- [Ruff](https://docs.astral.sh/ruff/)
- [Terraform](https://www.terraform.io/docs)
