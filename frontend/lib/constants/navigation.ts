/**
 * ナビゲーション関連の定数定義
 */

import { MessageCircle, Users, UserPlus, PlugZap, Settings } from 'lucide-react'

export type TabType = 'chats' | 'friends' | 'add-friends' | 'services' | 'settings'

export interface NavigationTab {
  id: TabType
  icon: React.ComponentType<{ className?: string }>
  label: string
  path: string
}

export const NAVIGATION_TABS: NavigationTab[] = [
  { id: 'chats', icon: MessageCircle, label: 'トーク', path: '/dashboard/chats' },
  { id: 'friends', icon: Users, label: '一覧管理', path: '/dashboard/roster' },
  { id: 'add-friends', icon: UserPlus, label: '新規追加', path: '/dashboard/add' },
  { id: 'services', icon: PlugZap, label: '外部サービス', path: '/dashboard/services' },
  { id: 'settings', icon: Settings, label: '設定', path: '/dashboard/settings' }
]