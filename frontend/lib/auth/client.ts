import { createBrowserSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * クライアントサイドでSupabaseクライアントを作成
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    return createBrowserSupabaseClient()
  } catch (error) {
    console.error('Supabaseクライアント作成エラー:', error)
    return null
  }
}