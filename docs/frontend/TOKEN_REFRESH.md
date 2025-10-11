# トークンリフレッシュ機能

## 概要

このドキュメントでは、BridgeSpeak アプリケーションのトークンリフレッシュ機能について説明します。

## アーキテクチャ

### なぜ API Route が必要か？

Next.js 15 では、Server Actions と API Routes の両方が使えますが、**Cookie の設定**に関しては重要な違いがあります：

| 機能                      | Server Actions   | API Routes        |
| ------------------------- | ---------------- | ----------------- |
| Cookie 読み取り           | ✅ 可能          | ✅ 可能           |
| Cookie 設定（ブラウザへ） | ❌ 不可能        | ✅ 可能           |
| 用途                      | データ操作・取得 | 認証・Cookie 管理 |

**Server Actions で設定した Cookie はブラウザに届きません。**そのため、トークンリフレッシュのような認証関連の処理では、API Route を使う必要があります。

## 実装詳細

### 1. API Route (`/api/auth/refresh`)

```typescript
// frontend/app/api/auth/refresh/route.ts
export async function POST(request: NextRequest) {
  // 1. ブラウザのCookieからrefresh_tokenを取得
  const refreshToken = cookieStore.get('refresh_token')?.value

  // 2. backend-goにリフレッシュリクエスト
  const response = await fetch(`${BACKEND_GO_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  // 3. backend-goから新しいトークンを受け取る
  const setCookieHeaders = response.headers.getSetCookie()

  // 4. ブラウザに新しいCookieを設定
  for (const cookieHeader of setCookieHeaders) {
    nextResponse.cookies.set(name, value, { ... })
  }

  return nextResponse
}
```

**フロー:**

```
ブラウザ → Next.js API Route → backend-go → Next.js API Route → ブラウザ
         (refresh_token)      (refresh_token)    (新トークン)     (Cookie設定)
```

### 2. 手動リフレッシュ

```typescript
// フロントエンドから手動でリフレッシュ
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";

function MyComponent() {
  const { refreshToken } = useCognitoAuth();

  const handleRefresh = async () => {
    try {
      await refreshToken();
      console.log("トークンをリフレッシュしました");
    } catch (error) {
      console.error("リフレッシュ失敗:", error);
    }
  };

  return <button onClick={handleRefresh}>トークンリフレッシュ</button>;
}
```

### 3. 自動リフレッシュ（401 エラー時）

`authFetch` ユーティリティを使用すると、401 エラー時に自動的にトークンをリフレッシュして再試行します：

```typescript
import { authFetch } from "@/lib/utils/auth-fetch";

// 通常のfetchの代わりにauthFetchを使用
const response = await authFetch("/api/some-endpoint", {
  method: "POST",
  body: JSON.stringify(data),
});

// 401エラーが発生した場合:
// 1. 自動的にトークンをリフレッシュ
// 2. 同じリクエストを再試行
// 3. それでも失敗したらログインページにリダイレクト
```

**フロー:**

```
リクエスト → 401エラー → トークンリフレッシュ → リクエスト再試行 → 成功/失敗
                         (自動)
```

## テスト方法

### 1. 手動テスト

1. ログインする
2. ブラウザの DevTools で Cookie を確認
   - `access_token` と `refresh_token` が設定されている
3. `access_token` を手動で削除
4. API リクエストを送信
5. 自動的にリフレッシュされることを確認

### 2. ログで確認

```bash
docker logs docker-compose-frontend-1 --tail 100 -f
```

リフレッシュ時のログ：

```
[REFRESH] Refresh token found: true
[REFRESH] Sending refresh request to backend-go
[REFRESH] Backend-go response status: 200
[REFRESH] Set-Cookie headers from backend-go: [...]
[REFRESH] Setting cookie: access_token (maxAge: 3600)
[REFRESH] Setting cookie: refresh_token (maxAge: 86400)
[REFRESH] Cookies set successfully
```

## トラブルシューティング

### 問題: リフレッシュが失敗する

**チェック項目:**

1. `refresh_token` が Cookie に存在するか？
2. backend-go の `/api/v1/auth/refresh` エンドポイントが正常か？
3. `refresh_token` の有効期限が切れていないか？

**解決策:**

- ログアウトして再ログイン
- Cookie をクリア

### 問題: 自動リフレッシュが動作しない

**チェック項目:**

1. `authFetch` を使用しているか？
2. `credentials: 'include'` が設定されているか？

**解決策:**

```typescript
// ❌ 通常のfetch
const response = await fetch("/api/endpoint");

// ✅ authFetchを使用
const response = await authFetch("/api/endpoint");
```

## セキュリティ考慮事項

### Cookie 設定

```typescript
nextResponse.cookies.set(name, value, {
  httpOnly: true, // JavaScriptからアクセス不可（XSS対策）
  secure: isProduction, // HTTPS接続のみ（本番環境）
  sameSite: "lax", // CSRF対策
  maxAge: 3600, // 有効期限（秒）
  path: "/", // 全パスで有効
});
```

### リフレッシュトークンの有効期限

- **access_token**: 1 時間（短い）
- **refresh_token**: 24 時間〜7 日間（長い）

access_token は短くすることでセキュリティを高め、refresh_token で利便性を確保します。

## 今後の改善案

### 1. 事前リフレッシュ

トークンの有効期限が近づいたら、401 エラーを待たずに事前にリフレッシュ：

```typescript
// トークンの有効期限をデコード
const tokenExpiry = parseJWT(accessToken).exp;
const now = Date.now() / 1000;

// 有効期限の5分前にリフレッシュ
if (tokenExpiry - now < 300) {
  await refreshToken();
}
```

### 2. リフレッシュ失敗時の通知

ユーザーにわかりやすいエラーメッセージを表示：

```typescript
catch (error) {
  toast.error('セッションの有効期限が切れました。再度ログインしてください。')
  router.push('/auth/login')
}
```

### 3. オフライン対応

ネットワークエラーとトークン期限切れを区別：

```typescript
if (!navigator.onLine) {
  toast.error("インターネット接続を確認してください");
} else {
  toast.error("セッションの有効期限が切れました");
}
```

## まとめ

✅ **API Route でトークンリフレッシュを実装**
✅ **401 エラー時の自動リフレッシュをサポート**
✅ **セキュアな Cookie 管理**
✅ **詳細なログ出力でデバッグ可能**

これにより、ユーザーは再ログインせずに長時間アプリケーションを使用できます。
