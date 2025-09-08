'use client'

import { useEffect, useState } from 'react'
import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'
import { useIsDesktop } from '@/lib/hooks/useMediaQuery'

interface ResponsiveLayoutProps {
  children: React.ReactNode
}

/**
 * レスポンシブレイアウト
 * 画面サイズに応じてデスクトップ/モバイルレイアウトを切り替え
 */
export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [mounted, setMounted] = useState(false)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    setMounted(true)
  }, [])

  // SSR対応：マウント前はモバイルレイアウトを表示
  if (!mounted) {
    return <MobileLayout>{children}</MobileLayout>
  }

  return isDesktop ? (
    <DesktopLayout>{children}</DesktopLayout>
  ) : (
    <MobileLayout>{children}</MobileLayout>
  )
}