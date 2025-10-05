import { AuthResponse, AuthUser } from '@/lib/types/auth'

// APIベースURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1'

/**
 * Cognito認証クライアント（Cookieベース）
 */
export class CognitoAuthClient {
  /**
   * ログイン
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'ログインに失敗しました')
    }

    return response.json()
  }

  /**
   * サインアップ
   */
  async signUp(email: string, password: string, displayName: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email,
        password,
        display_name: displayName,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'アカウント作成に失敗しました')
    }

    return response.json()
  }

  /**
   * メール確認
   */
  async confirmSignUp(email: string, confirmationCode: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/confirm-signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email,
        confirmation_code: confirmationCode,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'メール確認に失敗しました')
    }
  }

  /**
   * ログアウト
   */
  async signOut(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/signout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  /**
   * トークンリフレッシュ
   */
  async refreshToken(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'トークンリフレッシュに失敗しました')
    }
  }

  /**
   * ユーザー情報取得
   */
  async getUser(): Promise<AuthUser> {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'ユーザー情報の取得に失敗しました')
    }

    return response.json()
  }

  /**
   * ユーザー情報更新
   */
  async updateUser(displayName: string): Promise<AuthUser> {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        display_name: displayName,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'ユーザー情報の更新に失敗しました')
    }

    return response.json()
  }

  /**
   * パスワードリセット
   */
  async forgotPassword(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'パスワードリセットメールの送信に失敗しました')
    }
  }

  /**
   * パスワードリセット確認
   */
  async confirmForgotPassword(email: string, confirmationCode: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/confirm-forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email,
        confirmation_code: confirmationCode,
        new_password: newPassword,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'パスワードリセットの確認に失敗しました')
    }
  }
}

// シングルトンインスタンス
export const cognitoAuth = new CognitoAuthClient()