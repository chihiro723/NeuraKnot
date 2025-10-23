# GitHub Actions OIDC 認証設定ガイド

このドキュメントでは、GitHub Actions で AWS OIDC 認証を使用したデプロイ設定の手順を説明します。

## 概要

従来のアクセスキー認証から OIDC（OpenID Connect）認証に移行することで、以下のセキュリティ上の利点があります：

- **一時的な認証情報**: 短期間のみ有効なトークンを使用
- **最小権限の原則**: 必要な権限のみを付与
- **条件付きアクセス**: main ブランチからのみアクセス可能
- **監査ログ**: CloudTrail で詳細な追跡が可能
- **自動ローテーション**: 認証情報の手動管理が不要

## アーキテクチャ

```
GitHub Actions (mainブランチ)
  ↓ OIDC Token
AWS IAM Identity Provider (token.actions.githubusercontent.com)
  ↓ AssumeRoleWithWebIdentity
IAM Role (neuraKnot-prod-github-actions-role)
  ↓ 権限ポリシー
  ├─ ECR: イメージのプッシュ・プル
  └─ ECS: サービスの更新・状態確認
```

## 実装内容

### 1. Terraform で作成されるリソース

#### OIDC Identity Provider

- **URL**: `https://token.actions.githubusercontent.com`
- **Audience**: `sts.amazonaws.com`
- **Thumbprint**: `6938fd4d98bab03faadb97b34396831e3780aea1`

#### IAM Role

- **名前**: `neuraKnot-prod-github-actions-role`
- **Trust Policy**: GitHub リポジトリ `chihiro723/NeuraKnot` の main ブランチからのみアクセス可能

#### IAM Policies

1. **ECR Policy**: コンテナイメージの管理

   - `ecr:GetAuthorizationToken` (全リソース)
   - `ecr:BatchCheckLayerAvailability`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`, `ecr:PutImage` (特定リポジトリのみ)

2. **ECS Policy**: サービスのデプロイ
   - `ecs:DescribeServices`, `ecs:ListServices`, `ecs:DescribeClusters` (読み取り)
   - `ecs:UpdateService` (特定サービスのみ)

### 2. GitHub Actions ワークフロー設定

#### 必要な権限

```yaml
permissions:
  id-token: write # OIDC トークンの取得に必要
  contents: read # リポジトリの読み取りに必要
```

#### AWS 認証設定

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
    aws-region: ${{ secrets.AWS_REGION }}
```

## セットアップ手順

### ステップ 1: Terraform で AWS リソースを作成

1. Terraform ディレクトリに移動：

   ```bash
   cd terraform/environments/prod
   ```

2. 変数の確認（必要に応じて調整）：

   - `github_username`: デフォルト `chihiro723`
   - `github_repository`: デフォルト `NeuraKnot`

3. Terraform 初期化（初回のみ）：

   ```bash
   terraform init
   ```

4. 変更内容の確認：

   ```bash
   terraform plan
   ```

5. リソースの作成：

   ```bash
   terraform apply
   ```

6. 作成されたロール ARN を確認：

   ```bash
   terraform output github_actions_role_arn
   ```

   出力例：

   ```
   arn:aws:iam::123456789012:role/neuraKnot-prod-github-actions-role
   ```

### ステップ 2: GitHub Secrets の設定

1. GitHub リポジトリにアクセス：

   ```
   https://github.com/chihiro723/NeuraKnot/settings/secrets/actions
   ```

2. **新しいシークレット `AWS_ROLE_ARN` を追加**（OIDC 認証用）：

   - Name: `AWS_ROLE_ARN`
   - Value: ステップ 1 で取得したロール ARN
   - 例: `arn:aws:iam::528757808906:role/neuraKnot-prod-github-actions-role`

3. 既存のシークレットを確認（以下が設定済みであること）：
   - `AWS_REGION`: `ap-northeast-1`
   - `ECR_REGISTRY`: `528757808906.dkr.ecr.ap-northeast-1.amazonaws.com`
     - 形式: `<AWSアカウントID>.dkr.ecr.<リージョン>.amazonaws.com`
     - 確認方法: `terraform output ecr_repository_urls` の共通部分
   - `ECS_CLUSTER_NAME`: `neuraKnot-prod-cluster`
     - 確認方法: `terraform output ecs_cluster_name`
   - `ECS_SERVICE_NAME_GO`: `neuraKnot-prod-backend-go`
     - 確認方法: `terraform output backend_go_service_name`
   - `ECS_SERVICE_NAME_PYTHON`: `neuraKnot-prod-backend-python`
     - 確認方法: `terraform output backend_python_service_name`

### ステップ 3: テストデプロイの実行

1. GitHub リポジトリの **Actions** タブに移動

2. **Deploy to Production** ワークフローを選択

3. **Run workflow** ボタンをクリックして手動実行

4. ワークフローが成功することを確認

### ステップ 4: 旧認証情報の削除（オプション）

テストデプロイが成功したら、以下のシークレットを削除できます：

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

**注意**: 削除前に必ずテストデプロイが成功していることを確認してください。

## トラブルシューティング

### エラー: "User is not authorized to perform: sts:AssumeRoleWithWebIdentity"

**原因**: IAM ロールの信頼ポリシーが正しく設定されていない

**解決策**:

1. AWS コンソールで IAM ロールを確認
2. 信頼ポリシーの Subject 条件を確認：
   ```json
   "token.actions.githubusercontent.com:sub": "repo:chihiro723/NeuraKnot:ref:refs/heads/main"
   ```
3. リポジトリ名とブランチ名が正しいか確認

### エラー: "Error: ECR repository not found"

**原因**: ECR へのアクセス権限が不足

**解決策**:

1. IAM ポリシーを確認
2. `ecr_repository_arns` に正しい ARN が設定されているか確認

### エラー: "Error: ECS service update failed"

**原因**: ECS サービスへの更新権限が不足

**解決策**:

1. IAM ポリシーを確認
2. `ecs_service_arns` に正しい ARN が設定されているか確認

### main ブランチ以外からデプロイできない

**仕様**: これは意図的な制限です

**理由**: セキュリティのため、本番環境へのデプロイは main ブランチからのみ可能にしています

**解決策**: 開発環境用のブランチ制限を緩和したい場合は、以下のように Trust Policy を変更：

```hcl
"token.actions.githubusercontent.com:sub" = "repo:chihiro723/NeuraKnot:*"
```

## メンテナンス

### 権限の追加

新しい AWS サービスへのアクセスが必要な場合：

1. `terraform/modules/iam/main.tf` のポリシーを編集
2. `terraform apply` を実行
3. ワークフローをテスト

### リポジトリ名の変更

リポジトリ名を変更した場合：

1. `terraform/environments/prod/variables.tf` の `github_repository` を更新
2. `terraform apply` を実行

### ブランチ制限の変更

デプロイ可能なブランチを変更したい場合：

1. `terraform/modules/iam/main.tf` の Trust Policy を編集
2. `terraform apply` を実行

## セキュリティベストプラクティス

1. **最小権限の原則**: 必要最小限の権限のみを付与
2. **条件付きアクセス**: main ブランチからのみアクセス可能に制限
3. **監査ログ**: CloudTrail を有効化してアクセスログを記録
4. **定期的なレビュー**: IAM ポリシーを定期的に見直し
5. **シークレットの管理**: GitHub Secrets は組織レベルで管理を検討

## 参考リンク

- [AWS IAM OIDC Identity Providers](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [GitHub Actions - OIDC with AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials)
