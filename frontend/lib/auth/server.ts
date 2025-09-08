import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { User, SupabaseClient } from '@supabase/supabase-js'

/**
 * プロフィール情報
 */
export interface UserProfile {
  id: string
  username: string
  display_name: string
  email: string
  status: string
}

/**
 * サーバーサイド認証の結果
 */
export interface AuthResult {
  user: User | null
  profile: UserProfile | null
  supabase: SupabaseClient | null
}

/**
 * サーバーサイドでSupabaseクライアントを作成
 * Next.js 15対応版
 */
export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(10000), // 10秒タイムアウト
          })
        }
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * 認証が必要なページで使用
 * 未認証の場合は自動的にリダイレクト
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    redirect('/auth/login')
  }
  
  if (!user) {
    redirect('/auth/login')
  }

  // プロフィール情報を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, email, status')
    .eq('id', user.id)
    .single()

  return { user, profile: profile || null, supabase }
}

/**
 * 認証状態をチェック（リダイレクトなし）
 */
export async function getAuthState(): Promise<AuthResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { user: null, profile: null, supabase }
  }

  // プロフィール情報を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, email, status')
    .eq('id', user.id)
    .single()
  
  return { user, profile: profile || null, supabase }
}