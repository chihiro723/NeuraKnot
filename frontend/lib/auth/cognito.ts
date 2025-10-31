import { AuthResponse, AuthUser } from '@/lib/types/auth'
import { signUp as serverSignUp, confirmSignUp as serverConfirmSignUp, resendConfirmationCode, signOut as serverSignOut } from '@/lib/actions/auth-mutations'

/**
 * Cognito認証クライアント
 * 
 * アーキテクチャ:
 * - Cookie設定が必要な操作（signIn, refreshToken, getUser）: API Routes
 * - Cookie設定が不要な操作（signUp, confirmSignUp, signOut）: Server Actions
 */
export class CognitoAuthClient {
  /**
   * ログイン
   * API Route使用 - ブラウザにCookieを設定する必要があるため
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      
      // HTTPステータスコードに基づいてエラーメッセージを決定
      if (response.status === 401) {
        throw new Error(error.error || 'unauthorized')
      } else if (response.status === 404) {
        throw new Error('UserNotFoundException')
      } else {
        throw new Error(error.error || 'ログインに失敗しました')
      }
    }

    const data = await response.json()
    
    // アクセストークンをLocalStorageに保存（クロスドメインでも使用可能にするため）
    if (data.access_token && typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.access_token)
      console.log('[AUTH] Access token saved to localStorage')
    }
    
    return data
  }

  /**
   * サインアップ
   * Server Action使用 - Cookie設定が不要なため
   */
  async signUp(email: string, password: string, displayName: string): Promise<AuthResponse> {
    const result = await serverSignUp(email, password, displayName)
    
    if (!result.success) {
      throw new Error(result.error || 'アカウント作成に失敗しました')
    }

    return result.data as AuthResponse
  }

  /**
   * メール確認
   * Server Action使用 - Cookie設定が不要なため
   */
  async confirmSignUp(email: string, confirmationCode: string): Promise<void> {
    const result = await serverConfirmSignUp(email, confirmationCode)
    
    if (!result.success) {
      throw new Error(result.error || 'メール確認に失敗しました')
    }
  }

  /**
   * 確認コード再送信
   * Server Action使用 - Cookie設定が不要なため
   */
  async resendConfirmationCode(email: string): Promise<void> {
    const result = await resendConfirmationCode(email)
    
    if (!result.success) {
      throw new Error(result.error || '再送信に失敗しました')
    }
  }

  /**
   * ログアウト
   * Server Action使用 - Cookie削除のため
   */
  async signOut(): Promise<void> {
    try {
      await serverSignOut()
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  /**
   * トークンリフレッシュ
   * API Route使用 - ブラウザにCookieを設定する必要があるため
   */
  async refreshToken(): Promise<void> {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'トークンリフレッシュに失敗しました' }))
      throw new Error(error.error || 'トークンリフレッシュに失敗しました')
    }

    const data = await response.json()
    
    // アクセストークンをLocalStorageに保存（クロスドメインでも使用可能にするため）
    if (data.access_token && typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.access_token)
      console.log('[AUTH] Access token updated in localStorage after refresh')
    }
  }

  /**
   * ユーザー情報取得
   * API Route使用 - CookieからトークンをバックエンドGoに転送する必要があるため
   */
  async getUser(): Promise<AuthUser> {
    const response = await fetch('/api/auth/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'ユーザー情報の取得に失敗しました')
    }

    return response.json()
  }

  // TODO: 以下の機能は現在未実装（MVP後に実装予定）
  
  /**
   * ユーザー情報更新（未実装）
   * 将来的にAPI Routeまたはbackend-goのエンドポイント経由で実装
   */
  async updateUser(): Promise<AuthUser> {
    throw new Error('ユーザー情報更新は現在実装されていません')
  }

  /**
   * パスワードリセット（未実装）
   * 将来的にbackend-goのエンドポイント経由で実装
   */
  async forgotPassword(): Promise<void> {
    throw new Error('パスワードリセットは現在実装されていません')
  }

  /**
   * パスワードリセット確認（未実装）
   * 将来的にbackend-goのエンドポイント経由で実装
   */
  async confirmForgotPassword(): Promise<void> {
    throw new Error('パスワードリセット確認は現在実装されていません')
  }
}

// シングルトンインスタンス
export const cognitoAuth = new CognitoAuthClient()
