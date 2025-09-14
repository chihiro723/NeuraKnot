# 開発ルール

## ブランチ命名規則

```
feature/123-add-chat-function
fix/456-resolve-login-bug
hotfix/789-critical-security-patch
```

- `feature/` - 新機能
- `fix/` - バグ修正
- `hotfix/` - 緊急修正

## コミットメッセージ

```
feat: add message encryption
fix: resolve login redirect issue
docs: update setup instructions
```

### 形式

```
type: description

例:
feat: add message encryption
fix: resolve login redirect issue
docs: update setup instructions
```

### タイプ

- `feat` - 新機能
- `fix` - バグ修正
- `docs` - ドキュメント
- `style` - コードスタイル
- `refactor` - リファクタリング
- `test` - テスト
- `chore` - その他

## プルリクエスト

### タイトル

```
[Feature] Add message encryption to chat
[Fix] Resolve login redirect issue
[Docs] Update setup instructions
```

### 必須チェック

- [ ] テストが通る
- [ ] コードレビュー済み
- [ ] ドキュメント更新済み

### 説明テンプレート

プルリクエスト作成時に自動でテンプレートが表示されます。

詳細は [.github/pull_request_template.md](.github/pull_request_template.md) を参照。
