'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCognitoAuth } from './useCognitoAuth'

/**
 * Server Actionの結果型
 */
type ServerActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action関数型
 */
type ServerActionFunction<T = unknown, Args extends unknown[] = unknown[]> = (
  ...args: Args
) => Promise<ServerActionResult<T>>

/**
 * 401エラー時に自動的にトークンをリフレッシュして再試行するフック
 * 
 * @example
 * ```typescript
 * const createAgentWithAuth = useServerActionWithAuth(createAgent)
 * 
 * const result = await createAgentWithAuth({
 *   name: 'My Agent',
 *   persona_type: 'assistant',
 *   model: 'gpt-4o',
 * })
 * ```
 */
export function useServerActionWithAuth<T = unknown, Args extends unknown[] = unknown[]>(
  action: ServerActionFunction<T, Args>
): ServerActionFunction<T, Args> {
  const { refreshToken } = useCognitoAuth()
  const router = useRouter()

  return useCallback(
    async (...args: Args): Promise<ServerActionResult<T>> => {
      console.log('[AUTH_ACTION] Executing server action')

      // 最初の試行
      let result = await action(...args)

      console.log('[AUTH_ACTION] Result:', { success: result.success, error: result.error })

      // 401エラー（Unauthorized）の場合
      if (!result.success && result.error === 'Unauthorized') {
        console.log('[AUTH_ACTION] Unauthorized error detected, attempting token refresh')

        try {
          // トークンをリフレッシュ
          await refreshToken()
          console.log('[AUTH_ACTION] Token refresh successful, retrying action')

          // 再試行
          result = await action(...args)
          console.log('[AUTH_ACTION] Retry result:', { success: result.success, error: result.error })

          return result
        } catch (error) {
          console.error('[AUTH_ACTION] Token refresh failed:', error)

          // リフレッシュ失敗 → ログインページへリダイレクト
          console.log('[AUTH_ACTION] Redirecting to login page')
          router.push('/auth/login')

          return {
            success: false,
            error: 'セッションの有効期限が切れました。再度ログインしてください。',
          }
        }
      }

      return result
    },
    [action, refreshToken, router]
  )
}

/**
 * 複数のServer Actionsを一度にラップするヘルパー
 * 
 * @example
 * ```typescript
 * const { createAgent, getAgents, getAgent } = useServerActionsWithAuth({
 *   createAgent,
 *   getAgents,
 *   getAgent,
 * })
 * ```
 */
export function useServerActionsWithAuth<
  T extends Record<string, ServerActionFunction>
>(actions: T): T {
  const wrappedActions = {} as T

  for (const [key, action] of Object.entries(actions)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    wrappedActions[key as keyof T] = useServerActionWithAuth(action) as T[keyof T]
  }

  return wrappedActions
}

