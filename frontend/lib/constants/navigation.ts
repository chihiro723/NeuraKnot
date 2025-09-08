/**
 * ナビゲーション関連の定数定義
 */

import { MessageCircle, Users, UserPlus, Settings } from 'lucide-react'
import type { TabType } from '@/lib/types'

export interface NavigationTab {
  id: TabType
  icon: React.ComponentType<{ className?: string }>
  label: string
}

export const NAVIGATION_TABS: NavigationTab[] = [
  { id: 'chats', icon: MessageCircle, label: 'トーク' },
  { id: 'friends', icon: Users, label: '友だち' },
  { id: 'add-friends', icon: UserPlus, label: '追加' },
  { id: 'settings', icon: Settings, label: '設定' }
]