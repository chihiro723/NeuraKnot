/**
 * 空状態を表示するコンポーネント
 */

import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400',
      className
    )}>
      <Icon className="w-12 h-12 mb-4 opacity-50" />
      <p className="text-lg font-medium mb-2">{title}</p>
      <p className="text-sm text-center mb-4 max-w-md">{description}</p>
      {action}
    </div>
  )
}