# 認証コードクリーンアップまとめ

## 実施日

2025 年 10 月 11 日

## 概要

認証関連のコードを整理し、統一感を持たせ、不要なコードを削除しました。

---

## 削除したファイル

### ❌ `lib/auth/cognito-actions.ts`

**理由:** 完全に未使用

**詳細:**

- 古い Server Actions の実装
- FormData を使用した古いスタイル
- どのコンポーネントからも参照されていない
- 現在は`lib/actions/auth-actions.ts`を使用

---

## クリーンアップしたファイル

### 1. `lib/actions/auth-actions.ts`

**変更前:**

- 249 行
- `signIn`, `signUp`, `confirmSignUp`, `signOut`, `refreshToken`, `getCurrentUser`の 6 つの関数
- 一部の関数で Server Actions から Cookie 設定を試みていた（動作しない）

**変更後:**

- 95 行（154 行削除）
- `signUp`, `confirmSignUp`, `signOut`の 3 つの関数のみ
- Cookie 設定が不要な操作のみ
- シンプルで明確な責任分離

**削除した関数:**

- `signIn()` → API Route (`/api/auth/signin`) に移行済み
- `refreshToken()` → API Route (`/api/auth/refresh`) に移行済み
- `getCurrentUser()` → API Route (`/api/auth/user`) に移行済み

---

### 2. `lib/auth/cognito.ts`

**変更前:**

- 170 行
- `API_BASE_URL`が未定義なのに使用
- `updateUser`, `forgotPassword`, `confirmForgotPassword`が実装されていない

**変更後:**

- 158 行（12 行削除）
- 詳細なドキュメントコメント追加
- アーキテクチャの原則を明記
- 未実装機能に適切なエラーメッセージ
- `API_BASE_URL`の参照を削除

**主な変更:**

```typescript
// 変更前
async updateUser(displayName: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/users/profile`, ...) // API_BASE_URL未定義
}

// 変更後
async updateUser(displayName: string): Promise<AuthUser> {
  throw new Error('ユーザー情報更新は現在実装されていません')
}
```

---

### 3. `lib/utils/auth-fetch.ts`

**変更前:**

- ドキュメントが不足
- 使用されていないが理由が不明

**変更後:**

- 詳細なドキュメントコメント追加
- 現在は使用されていないが、将来の拡張用に残されていることを明記
- `useServerActionWithAuth`の使用を推奨

---

## 新規作成したドキュメント

### 1. `docs/frontend/AUTH_ARCHITECTURE.md`

**内容:**

- 認証アーキテクチャ全体の説明
- Server Actions と API Routes の使い分け
- 各ファイルの役割と責任
- 認証フロー図
- ベストプラクティス
- トラブルシューティング

### 2. `docs/frontend/AUTH_CLEANUP_SUMMARY.md`

**内容:**

- このファイル（クリーンアップのまとめ）

---

## アーキテクチャの明確化

### Server Actions vs API Routes

| 操作                 | 実装方法      | 理由                       |
| -------------------- | ------------- | -------------------------- |
| サインイン           | API Route     | Cookie をブラウザに設定    |
| サインアップ         | Server Action | Cookie 設定不要            |
| メール確認           | Server Action | Cookie 設定不要            |
| ログアウト           | Server Action | Cookie 削除のみ            |
| トークンリフレッシュ | API Route     | Cookie をブラウザに設定    |
| ユーザー情報取得     | API Route     | Cookie を backendGo に転送 |

---

## ファイル構成（変更後）

```
frontend/
├── lib/
│   ├── actions/
│   │   └── auth-actions.ts          # ✅ Server Actions（95行）
│   ├── auth/
│   │   ├── cognito.ts                # ✅ 認証クライアント（158行）
│   │   └── server.ts                 # ✅ サーバーユーティリティ（128行）
│   ├── hooks/
│   │   ├── useCognitoAuth.ts         # ✅ 認証フック
│   │   └── useServerActionWithAuth.ts # ✅ 401自動リフレッシュフック
│   └── utils/
│       └── auth-fetch.ts             # ⚠️ オプショナル（将来の拡張用）
├── app/api/auth/
│   ├── signin/route.ts               # ✅ サインインAPI Route
│   ├── refresh/route.ts              # ✅ トークンリフレッシュAPI Route
│   └── user/route.ts                 # ✅ ユーザー情報取得API Route
└── docs/frontend/
    ├── AUTH_ARCHITECTURE.md          # ✅ アーキテクチャドキュメント
    ├── AUTH_CLEANUP_SUMMARY.md       # ✅ このファイル
    ├── TOKEN_REFRESH.md              # ✅ トークンリフレッシュ機能
    └── AUTO_REFRESH_IMPLEMENTATION.md # ✅ 401自動リフレッシュ実装
```

---

## コード量の削減

### 削除

- `lib/auth/cognito-actions.ts`: 366 行 → **完全削除**

### クリーンアップ

- `lib/actions/auth-actions.ts`: 249 行 → 95 行（**-154 行, -61.8%**）
- `lib/auth/cognito.ts`: 170 行 → 158 行（**-12 行, -7.1%**）

**合計:** **532 行削除**

---

## 改善点

### 1. 統一感の向上

✅ **変更前:**

- Server Actions と API Routes の使い分けが不明瞭
- Cookie 設定を試みる Server Actions（動作しない）
- 未実装機能の扱いが不明

✅ **変更後:**

- 明確な使い分け基準
- Cookie 設定が必要な操作は API Route
- Cookie 設定が不要な操作は Server Action
- 未実装機能には適切なエラーメッセージ

### 2. 可読性の向上

✅ **変更前:**

- ドキュメントコメントが不足
- 各ファイルの役割が不明瞭

✅ **変更後:**

- 詳細なドキュメントコメント
- アーキテクチャドキュメント
- 各ファイルの役割が明確

### 3. 保守性の向上

✅ **変更前:**

- 不要なコードが残っている
- 重複した実装

✅ **変更後:**

- 不要なコードを削除
- 単一責任の原則に従った設計
- 明確な責任分離

---

## テスト済み

✅ frontend サービスの再起動成功
✅ ビルドエラーなし
✅ 既存機能に影響なし

---

## 今後の方針

### 実装済み

- ✅ サインイン・サインアップ
- ✅ ログアウト
- ✅ トークンリフレッシュ
- ✅ 401 エラー時の自動リフレッシュ

### MVP 後に実装予定

- ⏳ ユーザー情報更新
- ⏳ パスワードリセット
- ⏳ パスワードリセット確認

---

## まとめ

✅ **532 行のコード削除**
✅ **不要なファイルを 1 つ削除**
✅ **統一感のあるアーキテクチャ**
✅ **明確な責任分離**
✅ **詳細なドキュメント**
✅ **保守性の向上**

認証関連のコードがクリーンになり、今後の開発・保守が容易になりました。

