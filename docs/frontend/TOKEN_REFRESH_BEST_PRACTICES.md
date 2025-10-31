# トークンリフレッシュ：ベストプラクティスと改善案

## 現在の実装の問題点

### 1. ミドルウェアでの外部API呼び出し

**問題**:
```typescript
// middleware.ts
async function refreshAccessToken(request: NextRequest) {
  const response = await fetch(`${BACKEND_GO_URL}/api/v1/auth/refresh`, {...})
}
```

- Next.js Edge Runtimeは軽量であるべきだが、外部API呼び出しで遅延
- すべてのページ遷移でパフォーマンスに影響
- タイムアウトやネットワークエラーでページ全体が遅くなる

### 2. LocalStorageへのトークン保存

**問題**:
```typescript
localStorage.setItem('access_token', data.access_token)
```

- XSS攻撃でトークンが盗まれる可能性
- 有効期限チェックのためだけにセキュリティリスクを冒す

## 業界のベストプラクティス

### Auth0、Clerk、Firebase などの認証サービスのアプローチ

#### 1. **サイレントリフレッシュ（Silent Refresh）**

**仕組み**:
- hidden iframeまたは非表示のAPIエンドポイントを使用
- クライアント側でバックグラウンドでリフレッシュ
- ミドルウェアでは検証のみ

**利点**:
- ミドルウェアが軽量
- ユーザー体験を損なわない

#### 2. **Rotating Refresh Tokens**

**仕組み**:
- リフレッシュトークンは1回のみ使用可能
- 使用後は新しいリフレッシュトークンが発行される
- セキュリティが向上

#### 3. **Token Expiry Metadata**

**仕組み**:
- サーバーからトークンの有効期限情報を別途提供
- JWTをデコードせずに有効期限を確認

## 改善案：推奨実装

### アプローチ1: シンプルかつセキュア（推奨）

#### 変更点

1. **LocalStorageを使わない**
2. **ミドルウェアではリフレッシュしない**
3. **クライアント側の自動リフレッシュに集中**
4. **有効期限情報をサーバーから提供**

#### 実装

##### 1. サインイン時に有効期限情報を提供

```typescript
// backend-go/internal/handler/http/auth_handler.go
func (h *AuthHandler) SignIn(c *gin.Context) {
    // トークン生成後
    c.JSON(http.StatusOK, gin.H{
        "user": user,
        "expires_in": 3600, // 秒単位の有効期限
        "expires_at": time.Now().Add(time.Hour).Unix(), // Unix timestamp
    })
}
```

##### 2. フロントエンドで有効期限を状態管理

```typescript
// frontend/lib/contexts/AuthContext.tsx
interface AuthState {
  user: AuthUser | null
  tokenExpiresAt: number | null // Unix timestamp
}

// サインイン時
const signIn = async (email: string, password: string) => {
  const response = await cognitoAuth.signIn(email, password)
  
  // 有効期限を保存（SessionStorageまたはメモリ）
  const expiresAt = Date.now() + response.expires_in * 1000
  sessionStorage.setItem('token_expires_at', expiresAt.toString())
  
  setState({
    user: response.user,
    tokenExpiresAt: expiresAt
  })
}
```

##### 3. クライアント側の自動リフレッシュ（改善版）

```typescript
// frontend/lib/hooks/useAutoTokenRefresh.ts
export function useAutoTokenRefresh() {
  useEffect(() => {
    const scheduleTokenRefresh = () => {
      // SessionStorageから有効期限を取得
      const expiresAt = sessionStorage.getItem('token_expires_at')
      if (!expiresAt) return
      
      const expiresIn = (parseInt(expiresAt) - Date.now()) / 1000
      if (expiresIn <= 0) return
      
      // 有効期限の5分前にリフレッシュ
      const timeUntilRefresh = Math.max(0, (expiresIn - 300) * 1000)
      
      setTimeout(async () => {
        try {
          const response = await cognitoAuth.refreshToken()
          
          // 新しい有効期限を保存
          const newExpiresAt = Date.now() + response.expires_in * 1000
          sessionStorage.setItem('token_expires_at', newExpiresAt.toString())
          
          scheduleTokenRefresh()
        } catch (error) {
          // リフレッシュ失敗 - 次のAPIコールで401を受け取る
          console.error('Token refresh failed:', error)
        }
      }, timeUntilRefresh)
    }
    
    scheduleTokenRefresh()
    
    // ページフォーカス時に再スケジュール
    window.addEventListener('focus', scheduleTokenRefresh)
    return () => window.removeEventListener('focus', scheduleTokenRefresh)
  }, [])
}
```

##### 4. ミドルウェアは最小限に

```typescript
// frontend/middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }
  
  if (pathname.startsWith('/dashboard')) {
    const accessToken = request.cookies.get('access_token')?.value
    
    if (!accessToken) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    
    // トークンの有効期限チェックは行わない
    // 期限切れの場合は、API呼び出し時に401が返される
  }
  
  return NextResponse.next()
}
```

##### 5. API呼び出し時の401ハンドリング（既存）

```typescript
// frontend/lib/hooks/useServerActionWithAuth.ts
// これは既に実装されているのでそのまま使用
export function useServerActionWithAuth<T>(action: ServerAction<T>) {
  return async (...args) => {
    let result = await action(...args)
    
    if (!result.success && result.error === 'Unauthorized') {
      await refreshToken()
      result = await action(...args) // 再試行
    }
    
    return result
  }
}
```

#### メリット

✅ **ミドルウェアが軽量**: トークンの存在のみチェック（数ミリ秒）  
✅ **セキュリティ向上**: LocalStorageにトークンを保存しない  
✅ **シンプル**: JWTをデコードする必要がない  
✅ **パフォーマンス**: ミドルウェアでの外部API呼び出しがない  
✅ **信頼性**: サーバーから正確な有効期限情報を取得  

#### デメリット

⚠️ トークンが期限切れの瞬間に401エラーが発生する可能性（微小）  
⚠️ 自動リフレッシュが失敗した場合、次のAPI呼び出しまで検出できない  

### アプローチ2: より堅牢（複雑）

#### Session-Based Authentication + Token

**仕組み**:
1. サーバーサイドでセッションを管理（Redis）
2. クライアントにはセッションIDのみを渡す
3. トークンはサーバー側で管理し、自動リフレッシュ

**利点**:
- 最も安全
- クライアント側でトークンを扱わない

**欠点**:
- インフラが複雑化（Redis必須）
- サーバー負荷が増加

### アプローチ3: バックエンドプロキシパターン

**仕組み**:
1. Next.js API Routesをプロキシとして使用
2. すべてのAPI呼び出しはNext.jsを経由
3. Next.jsがトークンリフレッシュを自動処理

```typescript
// frontend/lib/api/client.ts
export async function apiCall(endpoint: string, options?: RequestInit) {
  // すべてのAPI呼び出しはNext.js API Routeを経由
  const response = await fetch(`/api/proxy${endpoint}`, options)
  
  if (response.status === 401) {
    // Next.js API Routeが自動的にリフレッシュして再試行
    // クライアント側では何もしない
  }
  
  return response
}
```

```typescript
// frontend/app/api/proxy/[...path]/route.ts
export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/proxy', '')
  
  let accessToken = request.cookies.get('access_token')?.value
  
  // Backend-goにリクエスト
  let response = await fetch(`${BACKEND_GO_URL}${path}`, {
    headers: { Cookie: `access_token=${accessToken}` }
  })
  
  // 401の場合、自動的にリフレッシュして再試行
  if (response.status === 401) {
    await refreshTokens(request)
    accessToken = request.cookies.get('access_token')?.value
    response = await fetch(`${BACKEND_GO_URL}${path}`, {
      headers: { Cookie: `access_token=${accessToken}` }
    })
  }
  
  return response
}
```

**利点**:
- クライアント側が非常にシンプル
- トークンリフレッシュロジックが一元化

**欠点**:
- すべてのAPI呼び出しがNext.jsを経由（レイテンシ増加）
- Server Actionsが使えない

## 推奨実装：アプローチ1（シンプルかつセキュア）

### 理由

1. **パフォーマンス**: ミドルウェアが軽量
2. **セキュリティ**: LocalStorageを使わない
3. **シンプル**: 実装が簡単で保守しやすい
4. **スケーラブル**: インフラの複雑化なし
5. **業界標準**: Auth0、Clerkなどと同様のアプローチ

### 移行手順

1. ✅ バックエンドのサインイン/リフレッシュレスポンスに`expires_in`を追加
2. ✅ SessionStorageで有効期限を管理
3. ✅ `useAutoTokenRefresh`をSessionStorageベースに変更
4. ✅ ミドルウェアからリフレッシュロジックを削除
5. ✅ LocalStorageからトークンを削除
6. ✅ 既存の401ハンドリング（`useServerActionWithAuth`）を維持

## まとめ

### 現在の実装

⚠️ **機能的には動作するが、パフォーマンスとセキュリティに課題あり**

### 推奨実装（アプローチ1）

✅ **業界標準に近く、シンプルでセキュア**

### 次のステップ

1. バックエンドGoの修正（`expires_in`をレスポンスに追加）
2. フロントエンドの修正（SessionStorageベース、LocalStorage削除）
3. ミドルウェアの簡略化（リフレッシュロジック削除）

この変更により、パフォーマンス、セキュリティ、保守性がすべて向上します。

