# 認証アーキテクチャ

## 概要

このドキュメントでは、BridgeSpeak の認証システムのアーキテクチャと、Server Actions と API Routes の使い分けについて説明します。

## アーキテクチャの原則

### なぜ Server Actions と API Routes を使い分けるのか？

Next.js 15 では、Server Actions と API Routes の両方が使えますが、**Cookie の扱い**に重要な違いがあります：

| 機能                        | Server Actions | API Routes |
| --------------------------- | -------------- | ---------- |
| Cookie 読み取り             | ✅ 可能        | ✅ 可能    |
| Cookie 設定（ブラウザへ）   | ❌ 不可能      | ✅ 可能    |
| backend-go への Cookie 転送 | ❌ 困難        | ✅ 可能    |
| 用途                        | データ操作     | 認証管理   |

**重要:** Server Actions で設定した Cookie はブラウザに届きません。

---

## ファイル構成

### 認証関連ファイル

```
frontend/
├── lib/
│   ├── actions/
│   │   └── auth-actions.ts          # Server Actions（Cookie設定不要な操作）
│   ├── auth/
│   │   ├── cognito.ts                # 認証クライアント（統合インターフェース）
│   │   └── server.ts                 # サーバーサイド認証ユーティリティ
│   └── hooks/
│       └── useCognitoAuth.ts         # 認証フック
├── app/api/auth/
│   ├── signin/route.ts               # サインインAPI Route
│   ├── refresh/route.ts              # トークンリフレッシュAPI Route
│   └── user/route.ts                 # ユーザー情報取得API Route
└── components/auth/
    ├── CognitoLoginForm.tsx          # ログインフォーム
    └── CognitoSignUpForm.tsx         # サインアップフォーム
```

---

## 各ファイルの役割

### 1. `lib/actions/auth-actions.ts` (Server Actions)

**役割:** Cookie 設定が不要な認証操作

**実装内容:**

- ✅ `signUp()` - アカウント作成
- ✅ `confirmSignUp()` - メール確認
- ✅ `signOut()` - ログアウト（Cookie 削除）

**なぜ Server Actions?**

- Cookie 設定が不要（signUp, confirmSignUp）
- Cookie の削除のみ（signOut）
- サーバーサイドで完結

```typescript
// lib/actions/auth-actions.ts

export async function signUp(
  email: string,
  password: string,
  displayName: string
) {
  const response = await fetch(`${BACKEND_GO_URL}/api/v1/auth/signup`, {
    method: "POST",
    body: JSON.stringify({ email, password, display_name: displayName }),
  });

  return response.ok
    ? { success: true, data: await response.json() }
    : { success: false, error: "..." };
}
```

---

### 2. `app/api/auth/*/route.ts` (API Routes)

**役割:** Cookie 設定が必要な認証操作

**実装内容:**

- ✅ `signin/route.ts` - ログイン（Cookie 設定）
- ✅ `refresh/route.ts` - トークンリフレッシュ（Cookie 更新）
- ✅ `user/route.ts` - ユーザー情報取得（Cookie 転送）

**なぜ API Routes?**

- ブラウザに Cookie を設定する必要がある
- backend-go に Cookie を転送する必要がある
- `Set-Cookie`ヘッダーを正しく処理できる

```typescript
// app/api/auth/signin/route.ts

export async function POST(request: NextRequest) {
  // 1. backend-goにリクエスト
  const response = await fetch(`${BACKEND_GO_URL}/api/v1/auth/signin`, {
    method: 'POST',
    body: await request.json(),
  })

  // 2. backend-goからのSet-Cookieヘッダーを取得
  const setCookieHeaders = response.headers.getSetCookie()

  // 3. Next.jsレスポンスにCookieを設定
  const nextResponse = NextResponse.json(data)
  for (const cookieHeader of setCookieHeaders) {
    nextResponse.cookies.set(name, value, { httpOnly: true, ... })
  }

  return nextResponse
}
```

---

### 3. `lib/auth/cognito.ts` (認証クライアント)

**役割:** 統合インターフェース（Server Actions と API Routes を適切に使い分け）

**設計原則:**

```typescript
export class CognitoAuthClient {
  // API Route使用（Cookie設定が必要）
  async signIn() { return fetch('/api/auth/signin', ...) }
  async refreshToken() { return fetch('/api/auth/refresh', ...) }
  async getUser() { return fetch('/api/auth/user', ...) }

  // Server Action使用（Cookie設定が不要）
  async signUp() { return serverSignUp(...) }
  async confirmSignUp() { return serverConfirmSignUp(...) }
  async signOut() { return serverSignOut() }

  // 未実装（MVP後に実装予定）
  async updateUser() { throw new Error('未実装') }
  async forgotPassword() { throw new Error('未実装') }
}
```

---

### 4. `lib/auth/server.ts` (サーバーサイドユーティリティ)

**役割:** サーバーコンポーネントでの認証状態確認

**実装内容:**

- ✅ `getServerUser()` - サーバーサイドでユーザー情報取得
- ✅ `requireAuth()` - 認証必須ページでのチェック
- ✅ `getAuthState()` - 認証状態取得

**使用例:**

```typescript
// app/dashboard/page.tsx (Server Component)
import { requireAuth } from "@/lib/auth/server";

export default async function DashboardPage() {
  const user = await requireAuth(); // 未認証なら/auth/loginへリダイレクト

  return <div>Welcome, {user.name}</div>;
}
```

---

### 5. `lib/hooks/useCognitoAuth.ts` (クライアントフック)

**役割:** クライアントコンポーネントでの認証状態管理

**実装内容:**

- 認証状態の管理
- 認証操作のラッパー
- エラーハンドリング

**使用例:**

```typescript
// components/auth/CognitoLoginForm.tsx (Client Component)
"use client";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";

export function CognitoLoginForm() {
  const { signIn, loading, error } = useCognitoAuth();

  const handleSubmit = async (e) => {
    await signIn({ email, password });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## 認証フロー

### ログインフロー

```
1. ユーザーがログインフォームを送信
   ↓
2. CognitoLoginForm (Client Component)
   ├─ useCognitoAuth().signIn()
   ↓
3. cognitoAuth.signIn() (lib/auth/cognito.ts)
   ├─ fetch('/api/auth/signin')
   ↓
4. API Route (/api/auth/signin)
   ├─ fetch('http://backend-go:8080/api/v1/auth/signin')
   ↓
5. backend-go
   ├─ Cognitoで認証
   ├─ JWTトークン生成
   ├─ Set-Cookieヘッダーで返す
   ↓
6. API Route
   ├─ backend-goからのSet-Cookieヘッダーを解析
   ├─ NextResponse.cookies.set() でブラウザにCookie設定
   ↓
7. ブラウザ
   ├─ access_token, refresh_tokenがCookieに保存される
   ├─ /dashboardへリダイレクト
```

---

### トークンリフレッシュフロー

```
1. Server Actionで401エラー
   ↓
2. useServerActionWithAuth (Custom Hook)
   ├─ 401エラーを検出
   ├─ cognitoAuth.refreshToken()
   ↓
3. API Route (/api/auth/refresh)
   ├─ Cookieからrefresh_tokenを取得
   ├─ fetch('http://backend-go:8080/api/v1/auth/refresh')
   ↓
4. backend-go
   ├─ refresh_tokenを検証
   ├─ 新しいaccess_tokenを生成
   ├─ Set-Cookieヘッダーで返す
   ↓
5. API Route
   ├─ 新しいトークンをCookieに設定
   ↓
6. useServerActionWithAuth
   ├─ Server Actionを再試行
   ├─ 成功
```

---

## Cookie 管理

### Cookie 設定

```typescript
nextResponse.cookies.set("access_token", value, {
  httpOnly: true, // JavaScriptからアクセス不可（XSS対策）
  secure: isProduction, // HTTPS接続のみ（本番環境）
  sameSite: "lax", // CSRF対策
  maxAge: 3600, // 有効期限（秒）
  path: "/", // 全パスで有効
});
```

### Cookie の種類

| Cookie 名       | 有効期限 | 用途                 |
| --------------- | -------- | -------------------- |
| `access_token`  | 1 時間   | API 認証             |
| `refresh_token` | 7 日間   | トークンリフレッシュ |

---

## セキュリティ

### Cookie 保護

- ✅ `httpOnly: true` - JavaScript からアクセス不可（XSS 対策）
- ✅ `secure: true` - HTTPS 接続のみ（本番環境）
- ✅ `sameSite: 'lax'` - CSRF 対策
- ✅ 短い有効期限（access_token: 1 時間）
- ✅ リフレッシュトークンによる利便性確保

### 認証エラーハンドリング

1. **401 エラー（Unauthorized）**

   - 自動的にトークンをリフレッシュ
   - リフレッシュ成功 → リクエスト再試行
   - リフレッシュ失敗 → ログインページへリダイレクト

2. **403 エラー（Forbidden）**

   - 権限不足のため、エラーメッセージを表示

3. **ネットワークエラー**
   - リトライ機能
   - オフライン時の適切なメッセージ

---

## ベストプラクティス

### ✅ DO（推奨）

1. **Cookie 設定が必要な操作は API Route を使用**

   ```typescript
   // ✅ API Route
   export async function POST(request: NextRequest) {
     const response = NextResponse.json(data)
     response.cookies.set('access_token', token, { ... })
     return response
   }
   ```

2. **Cookie 設定が不要な操作は Server Action を使用**

   ```typescript
   // ✅ Server Action
   'use server'
   export async function signUp(email, password) {
     const response = await fetch(`${BACKEND_GO_URL}/api/v1/auth/signup`, { ... })
     return { success: true, data: await response.json() }
   }
   ```

3. **認証クライアント（cognito.ts）で使い分けを隠蔽**
   ```typescript
   // ✅ 統合インターフェース
   export class CognitoAuthClient {
     async signIn() { return fetch('/api/auth/signin', ...) }  // API Route
     async signUp() { return serverSignUp(...) }                // Server Action
   }
   ```

### ❌ DON'T（非推奨）

1. **Server Action でブラウザに Cookie を設定しようとする**

   ```typescript
   // ❌ 動作しない
   "use server";
   export async function signIn() {
     const cookieStore = await cookies();
     cookieStore.set("access_token", token); // ブラウザに届かない
   }
   ```

2. **クライアントコンポーネントで直接 backend-go を呼ぶ**

   ```typescript
   // ❌ CORS問題、Cookie転送の問題
   const response = await fetch("http://backend-go:8080/api/v1/...", {
     credentials: "include",
   });
   ```

3. **認証ロジックを複数箇所に分散させる**
   ```typescript
   // ❌ 統一感がない
   // 各コンポーネントで独自にfetchを実行
   ```

---

## トラブルシューティング

### 問題: Cookie が設定されない

**原因:**

- Server Action でブラウザに設定しようとしている
- `credentials: 'include'`が設定されていない

**解決策:**

- API Route を使用
- `credentials: 'include'`を設定

### 問題: backend-go に Cookie が転送されない

**原因:**

- Server Action から Cookie を転送できない
- API Route で`Cookie`ヘッダーを設定していない

**解決策:**

```typescript
// API Route
const cookieStore = await cookies();
const token = cookieStore.get("access_token")?.value;

const response = await fetch(`${BACKEND_GO_URL}/api/v1/...`, {
  headers: {
    Cookie: `access_token=${token}`,
  },
});
```

### 問題: 401 エラーが頻繁に発生

**原因:**

- access_token の有効期限が短い（1 時間）
- 自動リフレッシュが動作していない

**解決策:**

- `useServerActionWithAuth`で Server Actions をラップ
- 401 エラー時に自動リフレッシュ

---

## 今後の改善案

### 1. パスワードリセット機能

現在は未実装（`throw new Error('未実装')`）。将来的に backend-go のエンドポイント経由で実装予定。

### 2. ユーザー情報更新

現在は未実装。将来的に API Route 経由で実装予定。

### 3. 事前トークンリフレッシュ

有効期限の 5 分前に自動リフレッシュすることで、401 エラーを未然に防ぐ。

### 4. オフライン対応

ネットワークエラーと認証エラーを区別し、適切なメッセージを表示。

---

## まとめ

✅ **Server Actions と API Routes を適切に使い分け**
✅ **Cookie の扱いを正しく理解**
✅ **セキュアな認証フロー**
✅ **統一されたインターフェース（cognito.ts）**
✅ **401 エラー時の自動リフレッシュ**

この設計により、セキュアで保守性の高い認証システムを実現しています。

