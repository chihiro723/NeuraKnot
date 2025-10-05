# 🔐 認証実装ガイド：HTTPOnly Cookie + Cognito

このドキュメントは、BridgeSpeak プロジェクトにおける認証実装の詳細な解説です。

---

## 📋 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [HTTPOnly Cookie 認証の実装](#httponly-cookie認証の実装)
3. [発生した問題と解決策](#発生した問題と解決策)
4. [Next.js のレンダリング戦略](#nextjsのレンダリング戦略)
5. [現在のアーキテクチャの課題](#現在のアーキテクチャの課題)
6. [推奨される将来のアーキテクチャ](#推奨される将来のアーキテクチャ)
7. [実装の詳細](#実装の詳細)

---

## アーキテクチャ概要

### 技術スタック

- **フロントエンド**: Next.js 15 (App Router)
- **バックエンド**: Go (Gin Framework)
- **認証プロバイダー**: AWS Cognito
- **データベース**: PostgreSQL
- **認証方式**: HTTPOnly Cookie + JWT

### 全体フロー

```
┌─────────┐     HTTPOnly Cookie      ┌──────────┐     JWT検証      ┌────────────┐
│ ブラウザ │ ◄─────────────────────► │ Go API   │ ◄──────────────► │ AWS Cognito │
└────┬────┘                          └────┬─────┘                  └────────────┘
     │                                    │
     │                                    ↓
     │                              ┌──────────┐
     └──────────────────────────────┤PostgreSQL│
                                    └──────────┘
```

---

## HTTPOnly Cookie 認証の実装

### なぜ HTTPOnly Cookie を使うのか？

#### 比較：localStorage vs HTTPOnly Cookie

| 特徴                        | localStorage | HTTPOnly Cookie  |
| --------------------------- | ------------ | ---------------- |
| **JavaScript からアクセス** | ✅ 可能      | ❌ 不可能        |
| **XSS 攻撃への耐性**        | ❌ 脆弱      | ✅ 安全          |
| **CSRF 攻撃への対策**       | 自動では不要 | 必要（対策済み） |
| **自動送信**                | ❌ 手動      | ✅ 自動          |
| **容量**                    | 5-10MB       | 4KB              |
| **推奨度**                  | ⚠️ 非推奨    | ✅ 推奨          |

#### セキュリティ上の利点

```javascript
// ❌ localStorage（XSS攻撃に脆弱）
localStorage.setItem("token", "xxx");
// 悪意のあるスクリプトがトークンを盗める
console.log(localStorage.getItem("token"));

// ✅ HTTPOnly Cookie（JavaScriptからアクセス不可）
// Set-Cookie: access_token=xxx; HttpOnly
// document.cookie でアクセスできない → 安全
```

---

### バックエンド実装（Go）

#### 1. Cookie 設定

```go
// backend-go/internal/handler/http/cookie.go

func SetAuthCookies(c *gin.Context, accessToken, refreshToken string) {
    // アクセストークン
    http.SetCookie(c.Writer, &http.Cookie{
        Name:     "access_token",
        Value:    accessToken,
        Path:     "/",
        Domain:   "localhost",      // localhost:3000 と localhost:8080 で共有
        MaxAge:   3600,             // 1時間
        HttpOnly: true,             // JavaScript からアクセス不可
        Secure:   false,            // 開発環境では HTTP OK（本番は true）
        // SameSite は設定しない（開発環境での互換性のため）
    })

    // リフレッシュトークン
    http.SetCookie(c.Writer, &http.Cookie{
        Name:     "refresh_token",
        Value:    refreshToken,
        Path:     "/",
        Domain:   "localhost",
        MaxAge:   2592000,          // 30日
        HttpOnly: true,
        Secure:   false,
    })
}
```

**重要なポイント：**

- **Domain: "localhost"**: `localhost:3000` と `localhost:8080` 間で Cookie を共有するために必須
- **HttpOnly: true**: XSS 攻撃からトークンを保護
- **SameSite の省略**: 開発環境（localhost）では省略しても動作する

---

#### 2. Cookie 読み取り（認証ミドルウェア）

```go
// backend-go/internal/handler/http/middleware/auth.go

func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Cookieからアクセストークンを取得
        token, err := c.Cookie("access_token")
        if err != nil || token == "" {
            c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("Authentication required"))
            c.Abort()
            return
        }

        // トークンを検証
        authResult, err := m.authService.ValidateToken(c.Request.Context(), token)
        if err != nil {
            c.JSON(http.StatusUnauthorized, response.NewUnauthorizedErrorResponse("Invalid token"))
            c.Abort()
            return
        }

        // ユーザー情報をコンテキストに保存
        c.Set("user", authResult.User)
        c.Set("token", token)

        c.Next()
    }
}
```

---

#### 3. トークン検証とユーザー情報取得

```go
// backend-go/internal/infrastructure/external/cognito.go

func (c *CognitoService) ValidateToken(ctx context.Context, token string) (*user.AuthResult, error) {
    // JWTトークンを解析
    parsedToken, err := jwt.ParseString(token, jwt.WithKeySet(c.jwks))
    if err != nil {
        return nil, fmt.Errorf("failed to parse token: %w", err)
    }

    // トークンの有効性を確認（署名検証、有効期限チェック）
    if err := jwt.Validate(parsedToken); err != nil {
        return nil, fmt.Errorf("token validation failed: %w", err)
    }

    // CognitoユーザーIDを取得（"sub" クレーム）
    cognitoUserID := parsedToken.Subject()
    if cognitoUserID == "" {
        return nil, fmt.Errorf("invalid token: missing sub claim")
    }

    // ✅ 重要：データベースからユーザー情報を取得
    // Access Token には email などの詳細情報が含まれていないため
    userObj, err := c.userRepository.GetByCognitoUserID(ctx, cognitoUserID)
    if err != nil {
        return nil, fmt.Errorf("failed to get user from database: %w", err)
    }

    // トークンの有効期限を取得
    expiresIn := int64(0)
    if exp := parsedToken.Expiration(); !exp.IsZero() {
        expiresIn = exp.Unix() - time.Now().Unix()
    }

    return &user.AuthResult{
        User:         userObj,
        AccessToken:  token,
        RefreshToken: "",
        ExpiresIn:    expiresIn,
    }, nil
}
```

**重要な設計判断：**

Cognito の **Access Token** には最小限の情報しか含まれていません：

```json
// Access Token の内容
{
  "sub": "f7845a58-40d1-701c-aefd-dd0b8395c575", // CognitoユーザーID
  "token_use": "access",
  "scope": "aws.cognito.signin.user.admin",
  "exp": 1759665433
  // ❌ email, name などは含まれない
}
```

そのため、**データベースからユーザー情報を取得する**必要があります。

---

### フロントエンド実装（Next.js）

#### 1. 認証クライアント（Cookie 自動送信）

```typescript
// frontend/lib/auth/cognito.ts

export class CognitoAuthClient {
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // ✅ Cookieを自動送信
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "ログインに失敗しました");
    }

    return response.json();
  }

  async getUser(): Promise<AuthUser> {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "GET",
      credentials: "include", // ✅ Cookieを自動送信
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "ユーザー情報の取得に失敗しました");
    }

    return response.json();
  }

  async signOut(): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/signout`, {
      method: "POST",
      credentials: "include", // ✅ Cookieを自動送信
    });
  }
}
```

**ポイント：**

- `credentials: 'include'` により、クロスオリジン（`localhost:3000` → `localhost:8080`）でも Cookie が送信される
- トークンを手動で管理する必要がない
- ブラウザが自動的に Cookie を送信する

---

#### 2. 認証フック

```typescript
// frontend/lib/hooks/useCognitoAuth.ts

export function useCognitoAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  // 初期化：Cookie内のトークンを使用してユーザー情報を取得
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // Cookieにトークンがある場合、ユーザー情報を取得
        try {
          const user = await cognitoAuth.getUser();
          if (isMounted) {
            setState({
              user,
              session: null,
              loading: false,
              error: null,
            });
          }
        } catch (error) {
          // トークンがない、または無効な場合は未認証として扱う
          if (isMounted) {
            setState({
              user: null,
              session: null,
              loading: false,
              error: null,
            });
          }
        }
      } catch (error) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "認証の初期化に失敗しました",
          }));
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(
    async (credentials: SignInRequest): Promise<void> => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const authResponse = await cognitoAuth.signIn(
          credentials.email,
          credentials.password
        );

        setState({
          user: authResponse.user,
          session: null,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error ? error.message : "ログインに失敗しました",
        }));
        throw error;
      }
    },
    []
  );

  return {
    ...state,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
  };
}
```

---

#### 3. クライアントコンポーネント（現在の実装）

```typescript
// frontend/app/dashboard/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useCognitoAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        読み込み中...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <DashboardContent />;
}
```

---

## 発生した問題と解決策

### 問題 1: ログイン成功後に 401 エラー

#### 症状

```
✅ POST /auth/signin → 200 OK
✅ Set-Cookie: access_token=...
❌ GET /users/profile → 401 Unauthorized
```

ログインは成功しているのに、その直後の認証が必要な API が 401 エラーになる。

---

#### 原因 1: Cookie が送信されていない？

**デバッグ方法：**

ブラウザの開発者ツール（Network タブ）で確認：

```
Request Headers:
Cookie: access_token=eyJraWQi...; refresh_token=eyJjdHki...
```

→ **Cookie は正しく送信されている** ✅

---

#### 原因 2: バックエンドが Cookie を読み取れていない？

**デバッグ方法：**

Go API にデバッグログを追加：

```go
allCookies := c.Request.Cookies()
for _, cookie := range allCookies {
    println("DEBUG: Cookie -", cookie.Name, ":", cookie.Value[:20]+"...")
}
```

**結果：**

```
DEBUG: Cookie - access_token : eyJraWQiOiJIK3dKRzFj...
DEBUG: Access token retrieved successfully, length: 1085
```

→ **バックエンドも Cookie を正しく読み取っている** ✅

---

#### 原因 3: トークン検証で失敗（真の原因）

**エラーログ：**

```
DEBUG: Token validation failed: invalid email in token: email cannot be empty
```

**根本原因：**

`ValidateToken` 関数がトークンから `email` を取得しようとしていたが、**Cognito の Access Token には email が含まれていない**。

---

#### 解決策：データベースからユーザー情報を取得

**修正前のコード（❌ 動かない）：**

```go
func (c *CognitoService) ValidateToken(ctx context.Context, token string) (*user.AuthResult, error) {
    parsedToken, err := jwt.ParseString(token, jwt.WithKeySet(c.jwks))
    // ...

    // ❌ トークンから直接emailを取得しようとしている
    claims := parsedToken.PrivateClaims()
    email, _ := claims["email"].(string)  // ← Access Token には存在しない！

    // ❌ 空のemailでユーザーオブジェクトを作成しようとしている
    userEmail, err := user.NewEmail(email)
    if err != nil {
        return nil, fmt.Errorf("invalid email in token: %w", err)
        // ↑ ここでエラー: "email cannot be empty"
    }
}
```

**修正後のコード（✅ 動く）：**

```go
func (c *CognitoService) ValidateToken(ctx context.Context, token string) (*user.AuthResult, error) {
    parsedToken, err := jwt.ParseString(token, jwt.WithKeySet(c.jwks))
    // ...

    // ✅ CognitoユーザーIDを取得（これは必ず含まれる）
    cognitoUserID := parsedToken.Subject()  // "sub" クレーム

    // ✅ データベースからユーザー情報を取得
    userObj, err := c.userRepository.GetByCognitoUserID(ctx, cognitoUserID)
    if err != nil {
        return nil, fmt.Errorf("failed to get user from database: %w", err)
    }

    return &user.AuthResult{
        User:         userObj,  // ← DBから取得した完全なユーザー情報
        AccessToken:  token,
        RefreshToken: "",
        ExpiresIn:    expiresIn,
    }, nil
}
```

---

### 問題 2: Cookie Domain 設定

#### 症状

異なるポート間（`localhost:3000` と `localhost:8080`）で Cookie が共有されない。

#### 解決策

```go
http.SetCookie(c.Writer, &http.Cookie{
    // ...
    Domain: "localhost",  // ← これが重要！
})
```

**理由：**

- `Domain` を設定しないと、Cookie は設定したオリジンでのみ有効
- `Domain: "localhost"` により、全ての `localhost:*` で共有される

---

### 問題 3: CORS 設定

#### 症状

```
Access-Control-Allow-Origin cannot be '*' when credentials mode is 'include'
```

#### 解決策

```go
// backend-go/internal/handler/http/middleware/cors.go

func CORSMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 環境変数から許可するオリジンを取得
        allowedOriginsStr := os.Getenv("FRONTEND_URL")
        if allowedOriginsStr == "" {
            allowedOriginsStr = "http://localhost:3000,http://localhost:3001"
        }
        allowedOrigins := strings.Split(allowedOriginsStr, ",")

        origin := c.Request.Header.Get("Origin")
        allowOrigin := ""
        for _, o := range allowedOrigins {
            if o == origin {
                allowOrigin = o
                break
            }
        }

        if allowOrigin != "" {
            // ✅ 具体的なオリジンを指定（"*" ではない）
            c.Header("Access-Control-Allow-Origin", allowOrigin)
        } else {
            c.AbortWithStatus(http.StatusForbidden)
            return
        }

        // ✅ credentials: 'include' を使う場合は必須
        c.Header("Access-Control-Allow-Credentials", "true")

        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(http.StatusNoContent)
            return
        }

        c.Next()
    }
}
```

**重要なポイント：**

- `Access-Control-Allow-Origin` は `*` にできない（`credentials: 'include'` の場合）
- 具体的なオリジンを指定する必要がある
- `Access-Control-Allow-Credentials: true` を設定する

---

## Next.js のレンダリング戦略

### サーバーコンポーネント vs クライアントコンポーネント

#### サーバーコンポーネント

```typescript
// "use client" がない = サーバーコンポーネント
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token");

  // ✅ Next.jsサーバーで実行される
  const response = await fetch("http://localhost:8080/api/v1/users/profile", {
    headers: {
      Cookie: `access_token=${accessToken?.value}`, // ← 手動で転送
    },
  });

  const user = await response.json();
  return <DashboardContent user={user} />;
}
```

**実行フロー：**

```
1. ユーザーがブラウザで /dashboard にアクセス
2. Next.jsサーバーがページをレンダリング開始
3. Next.jsサーバーが fetch() を実行
   ↓
   Next.jsサーバー → Go API
   └─ Cookieを手動で転送

4. Go API がレスポンスを返す
5. Next.jsサーバーが完全なHTMLを生成
6. ブラウザにHTMLを返す
```

**メリット：**

- ✅ サーバーサイドレンダリング（SSR）
- ✅ 初期表示が速い
- ✅ SEO に有利
- ✅ 複数の API を並列実行できる

**デメリット：**

- ⚠️ Cookie を手動で転送する必要がある
- ⚠️ Next.js サーバーと Go API が通信できる必要がある
- ⚠️ Docker 環境では内部ネットワーク設定が必要

---

#### クライアントコンポーネント（現在の実装）

```typescript
"use client"; // ← これを追加

import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";

export default function DashboardPage() {
  const { user, loading } = useCognitoAuth();

  // ✅ ブラウザで実行される
  // ✅ ブラウザが自動的にCookieを送信

  if (loading) return <div>Loading...</div>;
  return <DashboardContent user={user} />;
}
```

**実行フロー：**

```
1. ユーザーがブラウザで /dashboard にアクセス
2. Next.jsサーバーが最小限のHTMLを返す
3. ブラウザがJavaScriptを実行
4. useEffect で fetch() を実行
   ↓
   ブラウザ → Go API
   └─ ブラウザが自動的にCookieを送信（credentials: 'include'）

5. Go API がレスポンスを返す
6. ブラウザが画面を更新
```

**メリット：**

- ✅ シンプル（Cookie の転送が自動）
- ✅ エラーハンドリングが簡単
- ✅ リアルタイム性が高い

**デメリット：**

- ⚠️ クライアントサイドレンダリング（CSR）
- ⚠️ 初期表示がやや遅い
- ⚠️ ウォーターフォールリクエストの問題

---

### 重要な誤解の訂正

#### ❌ 誤解：「Next.js サーバーコンポーネントではブラウザの Cookie にアクセスできない」

**正しい理解：**

✅ Next.js サーバーコンポーネントでは `cookies()` を使ってアクセスできる

```typescript
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");

  console.log(token?.value); // ← アクセスできる！
}
```

#### ❌ 誤解：「Next.js サーバーから Go API に Cookie が自動的に送信される」

**正しい理解：**

✅ ブラウザ → Next.js サーバー では自動送信される
❌ Next.js サーバー → Go API では**手動で転送する必要がある**

```typescript
// ❌ これだとCookieが送られない
await fetch("http://localhost:8080/api/v1/users/profile");

// ✅ Cookieを手動で転送する必要がある
await fetch("http://localhost:8080/api/v1/users/profile", {
  headers: {
    Cookie: cookieStore.toString(),
  },
});
```

---

### リクエストフローの図解

#### サーバーコンポーネント

```
┌─────────┐
│ ブラウザ  │  Cookie: access_token=xxx
└────┬────┘
     │ GET /dashboard
     ↓
┌─────────────┐
│ Next.jsサーバー│  ← ブラウザのCookieを受信 ✅
└─────┬───────┘
      │ fetch('/api/v1/users/profile')
      │ headers: { 'Cookie': 'access_token=xxx' }  ← 手動で転送
      ↓
┌──────────┐
│ Go API   │  ← Cookieを受信 ✅
│ 200 OK   │
└──────────┘
```

#### クライアントコンポーネント

```
┌─────────┐
│ ブラウザ  │  Cookie: access_token=xxx
└────┬────┘
     │ GET /dashboard
     ↓
┌─────────────┐
│ Next.jsサーバー│  ← 最小限のHTMLのみ返す
└─────────────┘
     ↓ HTML + JS
┌─────────┐
│ ブラウザ  │  Cookie: access_token=xxx
└────┬────┘
     │ useEffect で fetch('/api/v1/users/profile')
     │ credentials: 'include'  ← 自動送信
     ↓
┌──────────┐
│ Go API   │  ← Cookieを受信 ✅
│ 200 OK   │
└──────────┘
```

---

## 現在のアーキテクチャの課題

### 課題 1: ウォーターフォールリクエスト

#### 問題

```typescript
"use client";

export default function DashboardPage() {
  const { user, loading } = useCognitoAuth(); // ← 1. ユーザー情報取得
  const { posts } = usePosts(user?.id); // ← 2. user取得後に実行
  const { friends } = useFriends(user?.id); // ← 3. user取得後に実行
  const { messages } = useMessages(user?.id); // ← 4. user取得後に実行

  // ❌ 全て順番に実行される（遅い！）
}
```

**タイムライン：**

```
0秒 → ブラウザ → Go API: GET /users/profile     (1秒かかる)
1秒 → ブラウザ → Go API: GET /posts             (1秒かかる)
2秒 → ブラウザ → Go API: GET /friends           (1秒かかる)
3秒 → ブラウザ → Go API: GET /messages          (1秒かかる)
4秒 → 完了

合計: 4秒 ❌
```

---

#### サーバーコンポーネントなら並列実行できる

```typescript
// サーバーコンポーネント

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  // ✅ 並列実行
  const [user, posts, friends, messages] = await Promise.all([
    fetchUser(cookieHeader),
    fetchPosts(cookieHeader),
    fetchFriends(cookieHeader),
    fetchMessages(cookieHeader),
  ]);

  return (
    <Content user={user} posts={posts} friends={friends} messages={messages} />
  );
}
```

**タイムライン：**

```
0秒 → Next.jsサーバー → Go API: GET /users/profile    (1秒) ┐
      Next.jsサーバー → Go API: GET /posts             (1秒) │ 並列実行
      Next.jsサーバー → Go API: GET /friends           (1秒) │
      Next.jsサーバー → Go API: GET /messages          (1秒) ┘
1秒 → 完了

合計: 1秒 ✅（4倍速い！）
```

---

### 課題 2: 初期表示の遅延

#### クライアントコンポーネント

```
1. 白い画面（HTMLロード）
2. スケルトン画面（JavaScriptロード）
3. ローディング表示（API呼び出し）
4. ようやくコンテンツ表示

ユーザー体験: ⚠️ 遅い
```

#### サーバーコンポーネント

```
1. 完全なHTMLが届く
2. すぐにコンテンツ表示

ユーザー体験: ✅ 速い
```

---

### 課題 3: スケーラビリティ

現在の実装では、新しいデータが必要になるたびに：

1. 新しい `useXxx()` フックを作成
2. クライアントコンポーネントで呼び出す
3. ウォーターフォールリクエストが増える

**結果：** ページが遅くなり続ける ❌

---

## 推奨される将来のアーキテクチャ

### アプローチ 1: Next.js API Routes プロキシパターン

#### アーキテクチャ図

```
ブラウザ
  ↓ (Cookie自動送信)
Next.js API Routes
  ↓ (Cookie転送)
Go API
```

#### 実装例

##### 1. API Routes でプロキシを作成

```typescript
// frontend/app/api/users/profile/route.ts

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || "http://go-api:8080/api/v1";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

```typescript
// frontend/app/api/posts/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  const cookieStore = await cookies();

  const response = await fetch(`${API_BASE_URL}/posts?user_id=${userId}`, {
    headers: { Cookie: cookieStore.toString() },
    cache: "no-store",
  });

  return NextResponse.json(await response.json());
}
```

##### 2. サーバーコンポーネントで並列フェッチ

```typescript
// frontend/app/dashboard/page.tsx

// ✅ サーバーコンポーネント（"use client" なし）
export default async function DashboardPage() {
  // Next.js内部のAPI Routes経由で並列フェッチ
  const [user, posts, friends] = await Promise.all([
    fetch("http://localhost:3000/api/users/profile").then((r) => r.json()),
    fetch("http://localhost:3000/api/posts").then((r) => r.json()),
    fetch("http://localhost:3000/api/friends").then((r) => r.json()),
  ]);

  return (
    <div>
      <UserProfile user={user} />
      <Posts posts={posts} />
      <Friends friends={friends} />
    </div>
  );
}
```

##### 3. クライアントコンポーネントは UI/インタラクションのみ

```typescript
// frontend/components/dashboard/UserProfile.tsx

"use client"; // ← インタラクティブな部分のみクライアント

export function UserProfile({ user }: { user: User }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      {isEditing ? <EditForm user={user} /> : <DisplayProfile user={user} />}
    </div>
  );
}
```

---

### アプローチ 2: Server Actions パターン（より推奨）

#### 実装例

##### 1. Server Actions を作成

```typescript
// frontend/app/actions/auth.ts

"use server";

import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL || "http://go-api:8080/api/v1";

export async function getUser() {
  const cookieStore = await cookies();

  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user");
  }

  return response.json();
}

export async function getPosts(userId: string) {
  const cookieStore = await cookies();

  const response = await fetch(`${API_BASE_URL}/posts?user_id=${userId}`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  return response.json();
}

export async function getFriends(userId: string) {
  const cookieStore = await cookies();

  const response = await fetch(`${API_BASE_URL}/friends?user_id=${userId}`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  return response.json();
}
```

##### 2. サーバーコンポーネントで使用

```typescript
// frontend/app/dashboard/page.tsx

import { getUser, getPosts, getFriends } from "@/app/actions/auth";

export default async function DashboardPage() {
  // Server Actionsで並列実行
  const [user, posts, friends] = await Promise.all([
    getUser(),
    getPosts(),
    getFriends(),
  ]);

  return <DashboardContent user={user} posts={posts} friends={friends} />;
}
```

---

### アーキテクチャ比較

| アプローチ                                | 初期表示速度 | スケーラビリティ      | 複雑さ      | 推奨度        |
| ----------------------------------------- | ------------ | --------------------- | ----------- | ------------- |
| **全てクライアントコンポーネント** (現在) | ❌ 遅い      | ❌ ウォーターフォール | ✅ シンプル | ⚠️ 小規模のみ |
| **API Routes プロキシ**                   | ✅ 速い      | ✅ 並列実行可能       | ⚠️ やや複雑 | ✅✅ 推奨     |
| **Server Actions**                        | ✅ 速い      | ✅ 並列実行可能       | ✅ シンプル | ✅✅✅ 最推奨 |

---

## 実装の詳細

### 認証フロー（全体）

#### 1. ユーザー登録（SignUp）

```
ブラウザ
  ↓ POST /auth/signup {email, password, display_name}
Go API
  ↓ Cognito SignUp API
AWS Cognito
  ↓ 確認コードをメール送信
ユーザー
```

#### 2. メール確認（ConfirmSignUp）

```
ユーザー
  ↓ 確認コード入力
ブラウザ
  ↓ POST /auth/confirm-signup {email, confirmation_code}
Go API
  ↓ Cognito ConfirmSignUp API
AWS Cognito
  ↓ ユーザー確認完了
```

#### 3. ログイン（SignIn）

```
ブラウザ
  ↓ POST /auth/signin {email, password}
Go API
  ↓ Cognito InitiateAuth API
AWS Cognito
  ↓ Access Token + Refresh Token
Go API
  ↓ データベースからユーザー情報取得
  ↓ Set-Cookie: access_token=..., refresh_token=...
ブラウザ (Cookieに保存)
```

#### 4. 認証が必要な API 呼び出し

```
ブラウザ
  ↓ GET /users/profile (Cookie: access_token=...)
Go API (AuthMiddleware)
  ↓ Cookieからaccess_tokenを取得
  ↓ ValidateToken(access_token)
CognitoService
  ↓ JWT署名を検証（JWKSを使用）
  ↓ トークンから cognitoUserID (sub) を取得
  ↓ GetByCognitoUserID(cognitoUserID)
PostgreSQL
  ↓ ユーザー情報を返す
CognitoService
  ↓ 完全なUserオブジェクトを返す
AuthMiddleware
  ↓ コンテキストにユーザー情報を保存
UserHandler.GetProfile
  ↓ レスポンスを返す
ブラウザ
```

#### 5. トークンリフレッシュ

```
ブラウザ
  ↓ POST /auth/refresh (Cookie: refresh_token=...)
Go API
  ↓ Cognitoにリフレッシュリクエスト
AWS Cognito
  ↓ 新しいAccess Token
Go API
  ↓ Set-Cookie: access_token=... (更新)
ブラウザ
```

#### 6. ログアウト

```
ブラウザ
  ↓ POST /auth/signout (Cookie: access_token=...)
Go API
  ↓ Cognito GlobalSignOut API
AWS Cognito
  ↓ 全てのセッションを無効化
Go API
  ↓ Set-Cookie: access_token=; Max-Age=-1 (削除)
  ↓ Set-Cookie: refresh_token=; Max-Age=-1 (削除)
ブラウザ
```

---

### セキュリティ考慮事項

#### 1. HTTPOnly Cookie

- **利点**: JavaScript からアクセス不可 → XSS 攻撃からトークンを保護
- **注意**: CSRF 対策が必要（今後実装予定）

#### 2. CORS 設定

- 具体的なオリジンのみ許可（`*` は使わない）
- `Access-Control-Allow-Credentials: true` を設定

#### 3. トークン検証

- JWT の署名検証（JWKS を使用）
- 有効期限チェック
- データベースでユーザー存在確認

#### 4. Cookie 設定

- `Secure: true` （本番環境）
- `SameSite: Strict` または `Lax` （本番環境）
- `Domain` を適切に設定

---

### 環境設定

#### バックエンド（Go）

```bash
# backend-go/.env.local

# Cognito設定
COGNITO_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
COGNITO_CLIENT_ID=xxxxx
COGNITO_CLIENT_SECRET=xxxxx

# データベース設定
DATABASE_URL=postgres://user:password@postgres:5432/dbname?sslmode=disable

# CORS設定
FRONTEND_URL=http://localhost:3000
```

#### フロントエンド（Next.js）

```bash
# frontend/.env.local

# API設定
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1

# 内部API設定（Server Actionsで使用）
API_BASE_URL=http://go-api:8080/api/v1
```

---

### Docker 設定

```yaml
# docker-compose/dev.yml

services:
  frontend:
    build:
      context: ../frontend
      dockerfile: docker/Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
      - API_BASE_URL=http://go-api:8080/api/v1
    volumes:
      - ../frontend:/app
    networks:
      - app-network

  go-api:
    build:
      context: ../backend-go
      dockerfile: docker/Dockerfile.dev
    ports:
      - "8080:8080"
    env_file:
      - ../backend-go/.env.local
    volumes:
      - ../backend-go:/app
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

**重要なポイント：**

- フロントエンドと Go API は同じ Docker ネットワーク内にある
- `NEXT_PUBLIC_API_BASE_URL`: ブラウザから直接アクセスする URL（`localhost:8080`）
- `API_BASE_URL`: Next.js サーバーからアクセスする URL（`go-api:8080`）

---

## まとめ

### 現在の実装

- ✅ HTTPOnly Cookie による安全な認証
- ✅ AWS Cognito との統合
- ✅ 基本的な認証フローは動作
- ⚠️ クライアントコンポーネント中心でスケーラビリティに課題

### 推奨される改善

1. **短期**（今すぐ実装可能）

   - デバッグログの削除
   - エラーハンドリングの改善
   - CSRF 対策の実装

2. **中期**（データが増えてきたら）

   - Next.js API Routes プロキシパターンの導入
   - または Server Actions パターンの導入
   - サーバーコンポーネント化

3. **長期**（本番環境に向けて）
   - セキュリティ監査
   - パフォーマンス最適化
   - ログ・モニタリングの整備

---

## 参考資料

### 公式ドキュメント

- [Next.js - Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js - API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js - Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [AWS Cognito - Developer Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/)

### セキュリティ

- [OWASP - Cookie Security](https://owasp.org/www-community/controls/SecureCookieAttribute)
- [MDN - HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [CORS - Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

**最終更新日**: 2025-10-05  
**作成者**: BridgeSpeak チーム  
**バージョン**: 1.0
