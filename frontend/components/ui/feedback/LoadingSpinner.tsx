/**
 * ローディングスピナーコンポーネント
 */

import { cn } from '@/lib/utils/cn'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div className={cn(
      'border-2 border-green-500 dark:border-green-400 border-t-transparent rounded-full animate-spin',
      sizeClasses[size],
      className
    )} />
  )
}

/**
 * フルスクリーンローディング
 */
export function FullScreenLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  )
}