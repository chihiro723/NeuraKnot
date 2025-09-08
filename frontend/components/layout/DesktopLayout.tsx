'use client'

import { MessageCircle, Search, Phone, Video, MoreHorizontal, Users } from 'lucide-react'
import { useDashboard } from '@/components/dashboard/DashboardProvider'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { GroupChatWindow } from '@/components/groups/GroupChatWindow'
import { AddFriendsRightPanel } from '@/components/friends/AddFriendsPanel'
import { FriendDetailPanel } from '@/components/friends/FriendDetailPanel'
import { ProfileSettingsPanel } from '@/components/settings/ProfileSettingsPanel'
import { Avatar } from '@/components/ui/Avatar'
import { NAVIGATION_TABS } from '@/lib/constants/navigation'
import { cn } from '@/lib/utils/cn'

interface DesktopLayoutProps {
  children: React.ReactNode
}

/**
 * デスクトップレイアウト - 完璧に統一されたデザインシステム
 */
export function DesktopLayout({ children }: DesktopLayoutProps) {
  const { activeTab, setActiveTab, profile, selectedChat, selectedGroup, selectedAddFriendType, selectedFriend, showProfileSettings } = useDashboard()

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* 左サイドバー */}
      <div className="w-96 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* ヘッダー */}
        <div className="h-16 bg-emerald-400 flex items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <Avatar
              src={profile.avatar_url}
              alt={profile.display_name}
              name={profile.display_name}
              size="sm"
              className="bg-white/10 backdrop-blur-sm"
            />
            <span className="text-white font-medium">{profile.display_name}</span>
          </div>
          <Search className="w-5 h-5 text-white cursor-pointer hover:text-green-100 transition-colors" />
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            {NAVIGATION_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center py-3 px-2 transition-colors',
                    isActive
                      ? 'text-green-500 bg-green-50 dark:bg-green-500/10 border-b-2 border-green-500'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>

      {/* 右メインエリア */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'add-friends' ? (
          <AddFriendsRightPanel selectedType={selectedAddFriendType} />
        ) : activeTab === 'friends' && selectedFriend ? (
          <FriendDetailPanel friend={selectedFriend} />
        ) : activeTab === 'settings' && showProfileSettings ? (
          <ProfileSettingsPanel />
        ) : selectedChat ? (
          <>
            {/* チャットヘッダー */}
            <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
              <div className="flex items-center space-x-3">
                <Avatar
                  src={selectedChat.avatar_url}
                  alt={selectedChat.name}
                  name={selectedChat.name}
                  type={selectedChat.type === 'group' ? 'human' : selectedChat.type}
                  status={selectedChat.status}
                  showStatus={selectedChat.type !== 'group'}
                  size="md"
                />
                <div>
                  <h2 className="font-medium text-gray-900 dark:text-white">{selectedChat.name}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedChat.type === 'ai' ? 'AIエージェント • オンライン' : 
                     selectedChat.type === 'group' ? `${selectedChat.member_count}人のメンバー${selectedChat.description ? ` • ${selectedChat.description}` : ''}` :
                     selectedChat.status === 'online' ? 'オンライン' : 'オフライン'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {selectedChat.type === 'group' ? (
                  <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-green-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Users className="w-5 h-5" />
                  </button>
                ) : (
                  <>
                    <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-green-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-green-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <Video className="w-5 h-5" />
                    </button>
                  </>
                )}
                <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-green-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {selectedChat.type === 'group' && selectedGroup ? (
              <GroupChatWindow selectedGroup={selectedGroup} />
            ) : (
              <ChatWindow selectedChat={selectedChat} />
            )}
          </>
        ) : (
          <>
            {/* デフォルト表示 */}
            <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
              <div className="flex items-center space-x-3">
                <Avatar
                  src=""
                  alt="Default"
                  name="?"
                  size="md"
                  className="bg-gray-300 dark:bg-gray-600"
                />
                <div>
                  <h2 className="font-medium text-gray-900 dark:text-white">
                    {activeTab === 'friends' ? '友だちを選択してください' : 
                     activeTab === 'settings' ? '設定項目を選択してください' :
                     'チャットを選択してください'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activeTab === 'friends' ? '左側から友だちを選んで詳細を表示' :
                     activeTab === 'settings' ? '左側から設定項目を選択' :
                     '左側から会話を選んでトークを開始'}
                  </p>
                </div>
              </div>
            </div>

            {/* メインコンテンツエリア */}
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                {(() => {
                  const currentTab = NAVIGATION_TABS.find(tab => tab.id === activeTab)
                  const Icon = currentTab?.icon || MessageCircle
                  return (
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-12 h-12 text-green-500" />
                    </div>
                  )
                })()}
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  {activeTab === 'friends' ? '友だち管理' :
                   activeTab === 'settings' ? '設定' :
                   'ハイブリッドメッセージング'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                  {activeTab === 'friends' ? 
                    <>
                      友だちやAIエージェントの詳細情報を確認できます。<br />
                      左側から友だちを選択してください。
                    </> :
                   activeTab === 'settings' ?
                    <>
                      アプリの設定やプロフィール管理を行えます。<br />
                      左側から設定項目を選択してください。
                    </> :
                    <>
                      人間とAIエージェント、グループとの新しいコミュニケーション体験。<br />
                      左側から友だちやAIエージェント、グループを選んでトークを始めましょう。
                    </>
                  }
                </p>
                {activeTab === 'chats' && (
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setActiveTab('friends')}
                      className={cn(
                        "px-6 py-3 rounded-xl font-semibold transition-colors",
                        "bg-green-500 hover:bg-green-600",
                        "text-white shadow-lg"
                      )}
                    >
                      友だちを見る
                    </button>
                    <button
                      onClick={() => setActiveTab('add')}
                      className="px-6 py-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-400 rounded-xl transition-colors font-semibold"
                    >
                      友だちを追加
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}