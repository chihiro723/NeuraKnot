'use client'

import { useMemo } from 'react'
import { createClient } from '@/lib/auth/client'

/**
 * Supabaseクライアントを返すHook
 * クライアントはシングルトンなので再作成されない
 */
export function useSupabase() {
  return useMemo(() => createClient(), [])
}