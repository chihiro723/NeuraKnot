# 自動トークンリフレッシュ実装ガイド

## 概要

このドキュメントでは、401 エラー時に自動的にトークンをリフレッシュして再試行する機能の実装について説明します。

## 実装内容

### ✅ 実装したもの

1. **カスタムフック** (`useServerActionWithAuth`)
2. **複数ラッパーフック** (`useServerActionsWithAuth`)
3. **API Route** (`/api/auth/refresh`)
4. **既存コンポーネントの更新**
   - `AddFriendsPanel` (AI Agent 作成)
   - `FriendsListClient` (AI Agent 一覧)
   - `ChatWindow` (チャット機能)

---

## アーキテクチャ

### フロー図

```
ユーザー操作
    ↓
クライアントコンポーネント (useServerActionWithAuth でラップ)
    ↓
Server Action (backend-goにリクエスト)
    ↓
401エラー？
    ├─ No → 成功レスポンスを返す
    └─ Yes → トークンリフレッシュ
        ↓
    API Route (/api/auth/refresh)
        ↓
    backend-go (/api/v1/auth/refresh)
        ↓
    新しいトークンをCookieに設定
        ↓
    Server Actionを再試行
        ↓
    成功 or エラー
```

---

## コード解説

### 1. カスタムフック (`useServerActionWithAuth`)

```typescript
// frontend/lib/hooks/useServerActionWithAuth.ts

export function useServerActionWithAuth<T>(
  action: ServerActionFunction<T>
): ServerActionFunction<T> {
  const { refreshToken } = useCognitoAuth();
  const router = useRouter();

  return useCallback(
    async (...args) => {
      // 最初の試行
      let result = await action(...args);

      // 401エラーの場合
      if (!result.success && result.error === "Unauthorized") {
        try {
          // トークンをリフレッシュ
          await refreshToken();

          // 再試行
          result = await action(...args);
        } catch (error) {
          // リフレッシュ失敗 → ログインページへ
          router.push("/auth/login");
          return { success: false, error: "セッション期限切れ" };
        }
      }

      return result;
    },
    [action, refreshToken, router]
  );
}
```

**ポイント:**

- ✅ 401 エラーを自動検出
- ✅ トークンリフレッシュを自動実行
- ✅ 再試行を自動実行
- ✅ リフレッシュ失敗時はログインページへリダイレクト

---

### 2. 使用例

#### 単一の Server Action

```typescript
// components/friends/AddFriendsPanel.tsx

import { createAgent } from "@/lib/actions/ai-agent-actions";
import { useServerActionWithAuth } from "@/lib/hooks/useServerActionWithAuth";

function AIAgentCreationPanel() {
  // 401エラー時に自動リフレッシュ
  const createAgentWithAuth = useServerActionWithAuth(createAgent);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 通常通り呼び出すだけ（401エラー時の処理は自動）
    const result = await createAgentWithAuth({
      name: formData.name,
      persona_type: formData.personality,
      model: formData.model,
    });

    if (result.success) {
      // 成功処理
    } else {
      // エラー処理
    }
  };
}
```

#### 複数の Server Actions

```typescript
// components/chat/ChatWindow.tsx

import { useServerActionsWithAuth } from "@/lib/hooks/useServerActionWithAuth";
import {
  getOrCreateConversation,
  getMessages,
  sendMessage,
} from "@/lib/actions/conversation-actions";

function ChatWindow() {
  // 複数のServer Actionsを一度にラップ
  const {
    getOrCreateConversation: getOrCreateConversationWithAuth,
    getMessages: getMessagesWithAuth,
    sendMessage: sendMessageWithAuth,
  } = useServerActionsWithAuth({
    getOrCreateConversation,
    getMessages,
    sendMessage,
  });

  useEffect(() => {
    const init = async () => {
      // すべて401エラー時に自動リフレッシュ
      const convResult = await getOrCreateConversationWithAuth(agentId);
      const msgResult = await getMessagesWithAuth(conversationId);
    };
    init();
  }, []);

  const handleSend = async () => {
    // 401エラー時に自動リフレッシュ
    const result = await sendMessageWithAuth(conversationId, content);
  };
}
```

---

## ログ出力

### 正常フロー

```
[AUTH_ACTION] Executing server action
[AUTH_ACTION] Result: { success: true, error: undefined }
```

### 401 エラー → リフレッシュ → 成功

```
[AUTH_ACTION] Executing server action
[AUTH_ACTION] Result: { success: false, error: 'Unauthorized' }
[AUTH_ACTION] Unauthorized error detected, attempting token refresh
[REFRESH] Refresh token found: true
[REFRESH] Sending refresh request to backend-go
[REFRESH] Backend-go response status: 200
[REFRESH] Cookies set successfully
[AUTH_ACTION] Token refresh successful, retrying action
[AUTH_ACTION] Retry result: { success: true, error: undefined }
```

### 401 エラー → リフレッシュ失敗 → ログインページ

```
[AUTH_ACTION] Executing server action
[AUTH_ACTION] Result: { success: false, error: 'Unauthorized' }
[AUTH_ACTION] Unauthorized error detected, attempting token refresh
[REFRESH] Refresh token found: false
[REFRESH] No refresh token found in cookies
[AUTH_ACTION] Token refresh failed
[AUTH_ACTION] Redirecting to login page
```

---

## 更新したファイル

### 新規作成

1. ✅ `frontend/lib/hooks/useServerActionWithAuth.ts`

   - カスタムフック実装

2. ✅ `frontend/app/api/auth/refresh/route.ts`

   - リフレッシュ API Route

3. ✅ `frontend/lib/utils/auth-fetch.ts`
   - クライアントサイド用の authFetch（オプショナル）

### 更新

1. ✅ `frontend/components/friends/AddFriendsPanel.tsx`

   - `createAgent` → `createAgentWithAuth`

2. ✅ `frontend/components/friends/FriendsListClient.tsx`

   - `getAgents` → `getAgentsWithAuth`

3. ✅ `frontend/components/chat/ChatWindow.tsx`

   - `getOrCreateConversation` → `getOrCreateConversationWithAuth`
   - `getMessages` → `getMessagesWithAuth`
   - `sendMessage` → `sendMessageWithAuth`

4. ✅ `frontend/lib/auth/cognito.ts`
   - `refreshToken()` メソッドを API Route 呼び出しに変更

---

## テスト方法

### 1. 基本テスト

1. ログインする
2. AI Agent を作成（正常に動作することを確認）
3. ブラウザの DevTools で Cookie を確認

### 2. 401 エラーテスト

1. ログイン後、DevTools で`access_token`を削除
2. AI Agent 作成を試みる
3. 自動的にリフレッシュされて成功することを確認

**期待される動作:**

- エラーなく AI Agent が作成される
- ログに`[AUTH_ACTION] Token refresh successful`が表示される
- 新しい`access_token`が Cookie に設定される

### 3. リフレッシュ失敗テスト

1. ログイン後、DevTools で`access_token`と`refresh_token`の両方を削除
2. AI Agent 作成を試みる
3. ログインページにリダイレクトされることを確認

**期待される動作:**

- ログインページにリダイレクト
- ログに`[AUTH_ACTION] Redirecting to login page`が表示される

---

## トラブルシューティング

### 問題: 401 エラーが発生してもリフレッシュされない

**チェック項目:**

1. `useServerActionWithAuth`でラップしているか？
2. Server Action が`{ success: boolean, error?: string }`形式を返しているか？
3. エラー文字列が正確に`'Unauthorized'`か？

**解決策:**

```typescript
// ❌ ラップしていない
const result = await createAgent(data);

// ✅ ラップしている
const createAgentWithAuth = useServerActionWithAuth(createAgent);
const result = await createAgentWithAuth(data);
```

### 問題: 無限リフレッシュループ

**原因:**

- backend-go が常に 401 を返している
- `refresh_token`が無効

**解決策:**

- backend-go のログを確認
- ログアウトして再ログイン
- Cookie をクリア

### 問題: ログに何も表示されない

**チェック項目:**

1. `useServerActionWithAuth`の呼び出し場所は正しいか？
2. コンポーネントが再マウントされていないか？

**解決策:**

```typescript
// ❌ 間違った場所
const handleSubmit = async () => {
  const action = useServerActionWithAuth(createAgent); // フック呼び出しがイベントハンドラ内
};

// ✅ 正しい場所
function MyComponent() {
  const action = useServerActionWithAuth(createAgent); // コンポーネントのトップレベル

  const handleSubmit = async () => {
    await action(data);
  };
}
```

---

## パフォーマンス考慮事項

### リフレッシュのキャッシング

`useServerActionWithAuth`は、同時に複数の 401 エラーが発生した場合でも、リフレッシュは 1 回だけ実行されます：

```typescript
// lib/utils/auth-fetch.ts
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function refreshAuthToken(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    // 既にリフレッシュ中の場合は、そのPromiseを返す
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    // リフレッシュ処理
  })();

  return refreshPromise;
}
```

### メモ化

`useServerActionWithAuth`は`useCallback`を使用してメモ化されているため、不要な再レンダリングを防ぎます。

---

## セキュリティ

### Cookie 設定

```typescript
nextResponse.cookies.set(name, value, {
  httpOnly: true, // XSS対策
  secure: isProduction, // HTTPS強制（本番）
  sameSite: "lax", // CSRF対策
  maxAge: 3600, // 有効期限
  path: "/", // 全パスで有効
});
```

### リフレッシュトークンの保護

- `refresh_token`は`httpOnly`なので JavaScript からアクセス不可
- HTTPS 接続のみで送信（本番環境）
- サーバーサイドでのみ処理

---

## まとめ

✅ **401 エラー時に自動リフレッシュ**
✅ **既存コードへの影響を最小限に**
✅ **セキュアな Cookie 管理**
✅ **詳細なログ出力**
✅ **リフレッシュ失敗時の適切なハンドリング**

これにより、ユーザーは**トークンの有効期限を気にせず**、シームレスにアプリケーションを使用できます。

---

## 今後の改善案

### 1. トースト通知

リフレッシュ成功/失敗時にユーザーに通知：

```typescript
try {
  await refreshToken();
  toast.success("セッションを更新しました");
} catch (error) {
  toast.error("セッションの有効期限が切れました");
}
```

### 2. 事前リフレッシュ

有効期限の 5 分前に自動リフレッシュ：

```typescript
const checkTokenExpiry = () => {
  const token = parseJWT(accessToken);
  const now = Date.now() / 1000;

  if (token.exp - now < 300) {
    // 5分前
    refreshToken();
  }
};

setInterval(checkTokenExpiry, 60000); // 1分ごとにチェック
```

### 3. リトライ回数制限

無限ループを防ぐため、リトライ回数を制限：

```typescript
async function actionWithRetry(action, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```
