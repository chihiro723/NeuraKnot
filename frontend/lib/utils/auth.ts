import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

/**
 * 認証済みSupabaseクライアントを取得
 * サーバーサイドでのデータ取得用
 */
export async function getAuthenticatedSupabase() {
  console.log('🔍 getAuthenticatedSupabase開始')
  
  const cookieStore = await cookies()
  const supabase = await createServerClient(cookieStore)
  
  if (!supabase) {
    console.log('🔍 Supabaseクライアント作成失敗、セットアップページにリダイレクト')
    redirect('/setup')
  }

  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    console.log('🔍 認証エラー、ログインページにリダイレクト:', error?.message)
    redirect('/auth/login')
  }

  console.log('🔍 認証済みSupabaseクライアント取得成功:', { userId: user.id })
  return { supabase, user }
}