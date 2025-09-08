'use client'

import { createContext, useContext, useState } from 'react'
import type { 
  User,
  Profile,
  SelectedChat,
  SelectedGroup,
  SelectedFriend,
  AddFriendType,
  TabType,
  DashboardContextType
} from '@/lib/types'

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

/**
 * ダッシュボードコンテキストを使用するためのカスタムフック
 * ユーザー情報、プロフィール、アクティブタブの状態を管理
 */
export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}

interface DashboardProviderProps {
  children: React.ReactNode
  user: User
  profile: Profile
}

/**
 * ダッシュボード全体のグローバル状態を提供するプロバイダー
 * ユーザー情報、プロフィール、現在のタブを管理
 */
export function DashboardProvider({ children, user, profile }: DashboardProviderProps) {
  // アクティブなタブの状態管理（デフォルトはチャット）
  const [activeTab, setActiveTab] = useState<TabType>('chats')
  // 選択されたチャットの状態管理
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null)
  // 選択された友だちの状態管理
  const [selectedFriend, setSelectedFriend] = useState<SelectedFriend | null>(null)
  // 友だち追加の選択タイプの状態管理
  const [selectedAddFriendType, setSelectedAddFriendType] = useState<AddFriendType>(null)
  // 選択されたグループの状態管理
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(null)
  // プロフィール設定画面の表示状態
  const [showProfileSettings, setShowProfileSettings] = useState(false)

  // タブが変更されたときに友だち追加の選択をリセット
  const handleSetActiveTab = (tab: TabType) => {
    if (tab !== 'add-friends') {
      setSelectedAddFriendType(null)
    }
    if (tab !== 'friends') {
      setSelectedFriend(null)
    }
    if (tab !== 'chats') {
      setSelectedGroup(null)
    }
    if (tab !== 'settings') {
      setShowProfileSettings(false)
    }
    setActiveTab(tab)
  }

  return (
    <DashboardContext.Provider value={{ 
      user, 
      profile, 
      activeTab, 
      setActiveTab: handleSetActiveTab, 
      selectedChat, 
      setSelectedChat,
      selectedFriend,
      setSelectedFriend,
      selectedAddFriendType,
      setSelectedAddFriendType,
      showProfileSettings,
      setShowProfileSettings,
      selectedGroup,
      setSelectedGroup
    }}>
      {children}
    </DashboardContext.Provider>
  )
}