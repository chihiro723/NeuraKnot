'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { signOutAction } from '@/lib/auth/actions'

export function SignOutButton() {
  const [isPending, setIsPending] = useState(false)

  const handleSignOut = async () => {
    setIsPending(true)
    try {
      await signOutAction()
    } catch (error) {
      console.error('ログアウト中にエラーが発生しました:', error)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-800 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
    >
      <LogOut className="w-4 h-4" />
      <span>{isPending ? 'ログアウト中...' : 'ログアウト'}</span>
    </button>
  )
}