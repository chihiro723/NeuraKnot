import { createBrowserClient, createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

// 環境変数の型定義
interface SupabaseConfig {
  url: string
  anonKey: string
}

// 環境変数を取得・検証
function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase環境変数が設定されていません')
  }

  if (url === 'your_supabase_project_url_here' || anonKey === 'your_supabase_anon_key_here') {
    throw new Error('Supabase環境変数が正しく設定されていません')
  }

  if (!url.includes('supabase.co')) {
    throw new Error('無効なSupabase URLです')
  }

  return { url, anonKey }
}

// シングルトンインスタンス
let browserClient: SupabaseClient | null = null

/**
 * ブラウザ用Supabaseクライアント（シングルトン）
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (browserClient) {
    return browserClient
  }

  const { url, anonKey } = getSupabaseConfig()

  browserClient = createBrowserClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000), // 10秒タイムアウト
        })
      }
    }
  })

  return browserClient
}

/**
 * サーバー用Supabaseクライアント
 */
export function createServerSupabaseClient(cookieStore: ReadonlyRequestCookies): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig()

  return createSupabaseServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        // Server Componentでは設定をスキップ
      },
    }
  })
}

/**
 * Service Role用Supabaseクライアント
 */
export function createServiceRoleClient(): SupabaseClient {
  const { url } = getSupabaseConfig()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Service Role Keyが設定されていません')
  }

  const { createClient } = require('@supabase/supabase-js')
  
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * 設定が有効かチェック
 */
export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseConfig()
    return true
  } catch {
    return false
  }
}