/**
 * 認証付きFetchラッパー（オプショナル）
 * 
 * 401エラー時に自動的にトークンをリフレッシュして再試行します。
 * 
 * 注意: 現在のアーキテクチャでは、Server Actionsを使用しているため、
 * このユーティリティは直接使用されていません。代わりに、
 * `useServerActionWithAuth` フックを使用してください。
 * 
 * このファイルは、将来的にクライアントサイドで直接fetchを使用する
 * 場合に備えて残されています。
 * 
 * @example
 * ```typescript
 * // 現在は使用されていません（将来の拡張用）
 * import { authFetch } from '@/lib/utils/auth-fetch'
 * 
 * const response = await authFetch('/api/some-endpoint', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * })
 * ```
 * 
 * @see useServerActionWithAuth - 現在推奨されている方法
 */

let isRefreshing = false
let refreshPromise: Promise<void> | null = null

/**
 * トークンリフレッシュ（API Route経由）
 */
async function refreshAuthToken(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('トークンリフレッシュに失敗しました')
      }
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * 認証付きFetch（401エラー時に自動リフレッシュ）
 */
export async function authFetch(
  url: string,
  options?: RequestInit,
  retryCount = 0
): Promise<Response> {
  const maxRetries = 1

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  })

  // 401エラーかつリトライ回数内の場合、トークンをリフレッシュして再試行
  if (response.status === 401 && retryCount < maxRetries) {
    try {
      await refreshAuthToken()
      // リフレッシュ成功後、同じリクエストを再試行
      return authFetch(url, options, retryCount + 1)
    } catch (error) {
      console.error('トークンリフレッシュ失敗:', error)
      // リフレッシュ失敗時はログインページにリダイレクト
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
      throw error
    }
  }

  return response
}

