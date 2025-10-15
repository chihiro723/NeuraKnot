'use server'

import { cookies } from 'next/headers'

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

/**
 * サインアップ
 * Cookie設定が不要なため、Server Actionで実装
 */
export async function signUp(email: string, password: string, displayName: string) {
  try {
    const response = await fetch(`${BACKEND_GO_URL}/api/v1/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        display_name: displayName,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'アカウント作成に失敗しました' }))
      return { success: false, error: error.error || 'アカウント作成に失敗しました' }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('[AUTH] Sign up error:', error)
    return { success: false, error: 'アカウント作成に失敗しました' }
  }
}

/**
 * メール確認
 * Cookie設定が不要なため、Server Actionで実装
 */
export async function confirmSignUp(email: string, confirmationCode: string) {
  try {
    const response = await fetch(`${BACKEND_GO_URL}/api/v1/auth/confirm-signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        confirmation_code: confirmationCode,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'メール確認に失敗しました' }))
      return { success: false, error: error.error || 'メール確認に失敗しました' }
    }

    return { success: true }
  } catch (error) {
    console.error('[AUTH] Confirm sign up error:', error)
    return { success: false, error: 'メール確認に失敗しました' }
  }
}

/**
 * 確認コード再送信
 * Cookie設定が不要なため、Server Actionで実装
 */
export async function resendConfirmationCode(email: string) {
  try {
    const response = await fetch(`${BACKEND_GO_URL}/api/v1/auth/resend-confirmation-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '再送信に失敗しました' }))
      return { success: false, error: error.error || '再送信に失敗しました' }
    }

    return { success: true }
  } catch (error) {
    console.error('[AUTH] Resend confirmation code error:', error)
    return { success: false, error: '再送信に失敗しました' }
  }
}

/**
 * ログアウト
 * Cookieを削除するため、Server Actionで実装
 */
export async function signOut() {
  try {
    const cookieStore = await cookies()
    
    // Cookieを削除
    cookieStore.delete('access_token')
    cookieStore.delete('refresh_token')
    
    return { success: true }
  } catch (error) {
    console.error('[AUTH] Sign out error:', error)
    
    // エラーでもCookieをクリア
    const cookieStore = await cookies()
    cookieStore.delete('access_token')
    cookieStore.delete('refresh_token')
    
    return { success: true }
  }
}
