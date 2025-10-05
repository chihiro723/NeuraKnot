/**
 * サーバーサイド認証ユーティリティ
 * Next.js App Routerのサーバーコンポーネントで使用する認証関連の関数
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1'

/**
 * ユーザーの認証状態を取得
 * @returns 認証されたユーザー情報またはnull
 */
export async function getServerUser() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')
    
    if (!accessToken) {
      return null
    }

    // APIからユーザー情報を取得（Cookieを送信）
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: {
        'Cookie': `access_token=${accessToken.value}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const userData = await response.json()
    return {
      id: userData.id,
      email: userData.email,
      name: userData.display_name,
      avatar_url: null,
      created_at: userData.created_at,
    }
  } catch (error) {
    console.error('Error getting server user:', error)
    return null
  }
}

/**
 * ユーザープロフィール型定義
 */
export interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  status: 'online' | 'offline'
  created_at: string
}

/**
 * 認証状態を取得（リダイレクトなし）
 * @returns 認証状態とユーザー情報
 */
export async function getAuthState() {
  const user = await getServerUser()
  
  const profile: UserProfile | null = user ? {
    id: user.id,
    username: user.email.split('@')[0],
    display_name: user.name,
    avatar_url: user.avatar_url,
    status: 'online' as const,
    created_at: user.created_at,
  } : null

  return {
    user,
    profile,
    isAuthenticated: !!user,
  }
}

/**
 * 認証が必要なページでユーザーをチェック
 * 未認証の場合はログインページにリダイレクト
 */
export async function requireAuth() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  return user
}

/**
 * 認証済みユーザーのみアクセス可能なページで使用
 * 未認証の場合はログインページにリダイレクト
 */
export async function withAuth<T extends any[]>(
  handler: (...args: T) => Promise<any>
) {
  return async (...args: T) => {
    const user = await requireAuth()
    return handler(...args)
  }
}

/**
 * サーバーサイドでのログアウト処理
 */
export async function signOutServer() {
  try {
    const cookieStore = await cookies()
    
    cookieStore.delete('access_token')
    cookieStore.delete('refresh_token')
    
    return { success: true }
  } catch (error) {
    console.error('Error signing out server:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}