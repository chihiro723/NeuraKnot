'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { useSupabase } from './useSupabase'
import type { Profile } from '@/lib/types'

interface ProfileState {
  profile: Profile | null
  loading: boolean
  error: string | null
}

export function useProfile(): ProfileState {
  const { user } = useAuth()
  const supabase = useSupabase()
  const [state, setState] = useState<ProfileState>({
    profile: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    if (!user || !supabase) {
      setState({
        profile: null,
        loading: false,
        error: null
      })
      return
    }

    const fetchProfile = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }))

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          setState({
            profile: null,
            loading: false,
            error: error.message
          })
          return
        }

        setState({
          profile: profile as Profile,
          loading: false,
          error: null
        })
      } catch (err) {
        setState({
          profile: null,
          loading: false,
          error: err instanceof Error ? err.message : 'プロフィールの取得に失敗しました'
        })
      }
    }

    fetchProfile()
  }, [user, supabase])

  return state
}