'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    const supabase = createClient()
    
    if (!supabase) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Supabaseクライアントの初期化に失敗しました'
      }))
      return
    }

    // 初期セッションの取得
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error.message
          }))
          return
        }

        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null
        })
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : '認証エラーが発生しました'
        }))
      }
    }

    getInitialSession()

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null
        })
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return state
}