'use client'

import { useEffect, useRef } from 'react'
import { cognitoAuth } from '@/lib/auth/cognito'

/**
 * JWTトークンの有効期限を取得
 * @param token JWTトークン
 * @returns 有効期限までの秒数（トークンが無効な場合はnull）
 */
function getTokenExpiresIn(token: string | null): number | null {
  if (!token) return null

  try {
    // JWTの構造: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // payloadをデコード（Base64URL）
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    )

    // 有効期限（exp）をチェック
    if (!payload.exp) {
      return null
    }

    const now = Math.floor(Date.now() / 1000)
    const expiresIn = payload.exp - now

    return expiresIn > 0 ? expiresIn : null
  } catch (error) {
    console.error('[Auto Refresh] Token parsing error:', error)
    return null
  }
}

/**
 * LocalStorageからアクセストークンを取得
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

/**
 * トークンの自動リフレッシュフック
 * 
 * このフックは以下の処理を行います：
 * 1. トークンの有効期限を監視
 * 2. 有効期限の5分前に自動的にリフレッシュ
 * 3. リフレッシュ成功後、次回のリフレッシュをスケジュール
 * 
 * @example
 * ```tsx
 * function App() {
 *   useAutoTokenRefresh()
 *   return <div>App</div>
 * }
 * ```
 */
export function useAutoTokenRefresh() {
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)

  useEffect(() => {
    const scheduleTokenRefresh = () => {
      // 既存のタイマーをクリア
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      const token = getAccessToken()
      const expiresIn = getTokenExpiresIn(token)

      if (!expiresIn) {
        console.log('[Auto Refresh] No valid token found, skipping auto refresh')
        return
      }

      // 有効期限の5分前（300秒前）にリフレッシュ
      const REFRESH_BEFORE_EXPIRY = 300 // 5分
      const timeUntilRefresh = Math.max(0, (expiresIn - REFRESH_BEFORE_EXPIRY) * 1000)

      console.log(`[Auto Refresh] Token expires in ${expiresIn}s, scheduling refresh in ${timeUntilRefresh / 1000}s`)

      refreshTimeoutRef.current = setTimeout(async () => {
        if (isRefreshingRef.current) {
          console.log('[Auto Refresh] Already refreshing, skipping')
          return
        }

        try {
          isRefreshingRef.current = true
          console.log('[Auto Refresh] Refreshing token...')

          await cognitoAuth.refreshToken()

          console.log('[Auto Refresh] Token refreshed successfully')

          // リフレッシュ成功後、新しいトークンで次回のリフレッシュをスケジュール
          const newToken = getAccessToken()
          const newExpiresIn = getTokenExpiresIn(newToken)

          if (newExpiresIn) {
            // 新しいトークンでLocalStorageを更新
            scheduleTokenRefresh()
          }
        } catch (error) {
          console.error('[Auto Refresh] Token refresh failed:', error)
          // リフレッシュ失敗時は再試行しない（ログインページへリダイレクトされるはず）
        } finally {
          isRefreshingRef.current = false
        }
      }, timeUntilRefresh)
    }

    // 初回スケジュール
    scheduleTokenRefresh()

    // ページがフォーカスされたときに再スケジュール
    const handleFocus = () => {
      console.log('[Auto Refresh] Page focused, rescheduling refresh')
      scheduleTokenRefresh()
    }

    window.addEventListener('focus', handleFocus)

    // クリーンアップ
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      window.removeEventListener('focus', handleFocus)
    }
  }, [])
}




