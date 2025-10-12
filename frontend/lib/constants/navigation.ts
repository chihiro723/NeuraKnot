/**
 * ナビゲーション関連の定数定義
 */

import { MessageCircle, Users, UserPlus, Server, Settings } from 'lucide-react'
import type { TabType } from '@/lib/types'

export interface NavigationTab {
  id: TabType
  icon: React.ComponentType<{ className?: string }>
  label: string
}

export const NAVIGATION_TABS: NavigationTab[] = [
  { id: 'chats', icon: MessageCircle, label: 'トーク' },
  { id: 'friends', icon: Users, label: '一覧管理' },
  { id: 'add-friends', icon: UserPlus, label: '新規追加' },
  { id: 'mcp-servers', icon: Server, label: '外部サービス' },
  { id: 'settings', icon: Settings, label: '設定' }
]