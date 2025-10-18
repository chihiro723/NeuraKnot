/**
 * 次世代ボタンコンポーネント - 高度なインタラクションとビジュアルエフェクト
 */

import { forwardRef, memo } from 'react'
import { cn } from '@/lib/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'neon' | 'glass'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
  glow?: boolean
  morphing?: boolean
}

const variantClasses = {
  primary: 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-emerald-500/25',
  secondary: 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white shadow-lg hover:shadow-slate-500/25',
  outline: 'border-2 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500',
  ghost: 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50',
  danger: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg hover:shadow-red-500/25',
  neon: 'bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white shadow-lg neon-glow morphing-bg',
  glass: 'glass-card text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
}

const sizeClasses = {
  md: 'px-3 py-1.5 text-sm',
  md: 'px-6 py-3',
  lg: 'px-8 py-4 text-lg'
}

export const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    isLoading, 
    children, 
    disabled, 
    glow = false,
    morphing = false,
    ...props 
  }, ref) => {
    return (
      <button
        className={cn(
          'relative inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-500 ease-out focus-ring overflow-hidden group',
          'transform hover:scale-105 active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          variantClasses[variant],
          sizeClasses[size],
          glow && 'neon-glow',
          morphing && 'morphing-bg',
          className
        )}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {/* 背景エフェクト */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        
        {/* パーティクルエフェクト（neonバリアント用） */}
        {variant === 'neon' && (
          <div className="absolute inset-0 particle-bg opacity-30" />
        )}
        
        {/* ローディングスピナー */}
        {isLoading && (
          <div className="mr-2 relative">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 w-4 h-4 border border-current/30 rounded-full animate-pulse" />
          </div>
        )}
        
        {/* ボタンコンテンツ */}
        <span className={cn(
          'relative z-10 transition-all duration-300',
          isLoading && 'opacity-70'
        )}>
          {children}
        </span>
        
        {/* ホバー時のグローエフェクト */}
        {(variant === 'primary' || variant === 'neon') && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400/0 via-emerald-400/20 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}
        
        {/* フォーカス時のリング */}
        <div className="absolute inset-0 rounded-xl ring-2 ring-emerald-400/0 group-focus:ring-emerald-400/50 transition-all duration-300" />
      </button>
    )
  }
))

Button.displayName = 'Button'