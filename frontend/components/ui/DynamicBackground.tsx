'use client'

import { useState, useEffect, useCallback } from 'react'

// 定数定義
const GRADIENT_THEMES = [
  { name: 'default', gradient: 'from-slate-900 via-slate-800 to-slate-900' },
  { name: 'purple', gradient: 'from-purple-900 via-slate-800 to-indigo-900' },
  { name: 'emerald', gradient: 'from-emerald-900 via-slate-800 to-cyan-900' },
  { name: 'rose', gradient: 'from-rose-900 via-slate-800 to-pink-900' },
  { name: 'amber', gradient: 'from-amber-900 via-slate-800 to-orange-900' }
]

const ACCENT_COLORS = [
  { primary: 'rgba(52, 211, 153, 0.2)', secondary: 'rgba(6, 182, 212, 0.2)', tertiary: 'rgba(52, 211, 153, 0.1)' },
  { primary: 'rgba(147, 51, 234, 0.2)', secondary: 'rgba(99, 102, 241, 0.2)', tertiary: 'rgba(139, 92, 246, 0.1)' },
  { primary: 'rgba(52, 211, 153, 0.3)', secondary: 'rgba(6, 182, 212, 0.3)', tertiary: 'rgba(52, 211, 153, 0.15)' },
  { primary: 'rgba(244, 63, 94, 0.2)', secondary: 'rgba(236, 72, 153, 0.2)', tertiary: 'rgba(251, 113, 133, 0.1)' },
  { primary: 'rgba(245, 158, 11, 0.2)', secondary: 'rgba(251, 146, 60, 0.2)', tertiary: 'rgba(251, 191, 36, 0.1)' }
]

interface DynamicBackgroundProps {
  children: React.ReactNode
  className?: string
  enableSwipe?: boolean
}

export function DynamicBackground({ children, className = '', enableSwipe = false }: DynamicBackgroundProps) {
  const [backgroundGradient, setBackgroundGradient] = useState(0)
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null)

  // 時間経過による背景色の自動変更
  useEffect(() => {
    const intervalId = setInterval(() => {
      setBackgroundGradient(prev => (prev + 1) % 5)
    }, 3000) // 3秒ごとに変更

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  // スワイプで背景グラデーション変更
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableSwipe) return
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }, [enableSwipe])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enableSwipe || !touchStart) return
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    
    // 横スワイプで背景色変更
    if (Math.abs(deltaX) > 50) {
      setBackgroundGradient(prev => (prev + 1) % 5)
    }
    
    setTouchStart(null)
  }, [enableSwipe, touchStart])

  return (
    <div 
      className={`bg-gradient-to-b ${GRADIENT_THEMES[backgroundGradient].gradient} relative overflow-hidden transition-all duration-1000 ease-out ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 動的背景装飾 */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="absolute top-20 left-10 w-32 h-32 rounded-full blur-3xl transition-all duration-1000"
          style={{ background: ACCENT_COLORS[backgroundGradient].primary }}
        />
        <div 
          className="absolute bottom-20 right-10 w-40 h-40 rounded-full blur-3xl transition-all duration-1000"
          style={{ background: ACCENT_COLORS[backgroundGradient].secondary }}
        />
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl transition-all duration-1000"
          style={{ background: ACCENT_COLORS[backgroundGradient].tertiary }}
        />
      </div>

      {children}
    </div>
  )
}