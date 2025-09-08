'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Bot, Users, User, Handshake } from 'lucide-react'
import { useDashboard } from '@/components/dashboard/DashboardProvider'
import { SearchInput } from '@/components/ui/SearchInput'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { FullScreenLoading } from '@/components/ui/LoadingSpinner'
import { getPersonalityLabel } from '@/lib/constants/personalities'
import { cn } from '@/lib/utils/cn'
import type { FriendData, FriendFilter } from '@/lib/types'

/**
 * 友だちリストクライアントコンポーネント
 */
export function FriendsListClient() {
  const { user, setSelectedFriend } = useDashboard()
  const [friends, setFriends] = useState<FriendData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FriendFilter>('all')
  
  useEffect(() => {
    const loadFriends = async () => {
      try {
        // TODO: Load real friends from database
        setFriends([])
      } catch (error) {
        console.error('友だちリストの読み込みでエラーが発生しました:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFriends()
  }, [user.id])

  const handleSelectFriend = (friend: FriendData) => {
    setSelectedFriend({
      id: friend.id,
      name: friend.name,
      avatar_url: friend.avatar_url,
      type: friend.type,
      status: friend.status,
      personality_preset: friend.personality_preset,
      created_at: new Date().toISOString(),
      description: friend.type === 'ai' 
        ? `${getPersonalityLabel(friend.personality_preset || '')}タイプのAIエージェントです。`
        : 'ユーザーの友だちです。'
    })
  }

  const filteredFriends = friends.filter(friend => {
    const matchesSearch = friend.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = activeFilter === 'all' || 
                         (activeFilter === 'group' && friend.type === 'group') ||
                         friend.type === activeFilter
    return matchesSearch && matchesFilter
  })

  const humanFriends = filteredFriends.filter(f => f.type === 'human')
  const aiFriends = filteredFriends.filter(f => f.type === 'ai')
  const groupFriends = filteredFriends.filter(f => f.type === 'group')

  const filters = [
    { id: 'all' as const, label: 'すべて', icon: Users, count: friends.length },
    { id: 'human' as const, label: 'ユーザー', icon: User, count: friends.filter(f => f.type === 'human').length },
    { id: 'ai' as const, label: 'AI', icon: Bot, count: friends.filter(f => f.type === 'ai').length },
    { id: 'group' as const, label: 'グループ', icon: Handshake, count: friends.filter(f => f.type === 'group').length }
  ]

  if (isLoading) {
    return <FullScreenLoading />
  }

  return (
    <div className="flex flex-col h-full lg:border-r-0 bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 lg:hidden">
        <SearchInput 
          placeholder="友だちを検索" 
          onSearch={setSearchQuery}
        />
      </div>
      
      {/* デスクトップ用検索バー */}
      <div className="hidden lg:block bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <SearchInput 
          placeholder="友だちを検索" 
          onSearch={setSearchQuery}
        />
      </div>

      {/* フィルタータブ */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          {filters.map((filter) => {
            const Icon = filter.icon
            const isActive = activeFilter === filter.id
            
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 relative',
                  isActive
                    ? 'text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-b-2 border-green-500 dark:border-green-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
                title={filter.label}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                  isActive 
                    ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                )}>
                  {filter.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredFriends.length === 0 ? (
          <EmptyState
            icon={Users}
            title={searchQuery ? '検索結果がありません' : 
                   activeFilter === 'ai' ? 'AIエージェントがいません' :
                   activeFilter === 'human' ? 'ユーザーの友だちがいません' :
                   activeFilter === 'group' ? 'グループがありません' :
                   '友だちがいません'}
            description={searchQuery ? '検索条件を変更してください' : '友だちを追加してトークを始めましょう'}
          />
        ) : (
          <div className="p-4 space-y-4 pb-8 lg:pb-4">
            {activeFilter === 'all' ? (
              <>
                {aiFriends.length > 0 && (
                  <FriendSection
                    title="AIエージェント"
                    icon={Bot}
                    friends={aiFriends}
                    getPersonalityLabel={getPersonalityLabel}
                    onSelectFriend={handleSelectFriend}
                    isAI
                  />
                )}
                {humanFriends.length > 0 && (
                  <FriendSection
                    title="ユーザー"
                    icon={User}
                    friends={humanFriends}
                    getPersonalityLabel={getPersonalityLabel}
                    onSelectFriend={handleSelectFriend}
                  />
                )}
                {groupFriends.length > 0 && (
                  <FriendSection
                    title="グループ"
                    icon={Handshake}
                    friends={groupFriends}
                    getPersonalityLabel={getPersonalityLabel}
                    onSelectFriend={handleSelectFriend}
                  />
                )}
              </>
            ) : (
              <div className="space-y-2 pb-4 lg:pb-0">
                {filteredFriends.map((friend) => (
                  <FriendItem
                    key={friend.id}
                    friend={friend}
                    getPersonalityLabel={getPersonalityLabel}
                    onSelectFriend={handleSelectFriend}
                    isAI={friend.type === 'ai'}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface FriendSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  friends: FriendData[]
  getPersonalityLabel: (preset: string) => string
  onSelectFriend: (friend: FriendData) => void
  isAI?: boolean
}

function FriendSection({ title, icon: Icon, friends, getPersonalityLabel, onSelectFriend, isAI = false }: FriendSectionProps) {
  return (
    <div className="animate-fadeIn">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center lg:text-xs">
        <Icon className="w-4 h-4 mr-2" />
        {title} ({friends.length})
      </h2>
      <div className="space-y-2">
        {friends.map((friend) => (
          <FriendItem
            key={friend.id}
            friend={friend}
            getPersonalityLabel={getPersonalityLabel}
            onSelectFriend={onSelectFriend}
            isAI={isAI}
          />
        ))}
      </div>
    </div>
  )
}

interface FriendItemProps {
  friend: FriendData
  getPersonalityLabel: (preset: string) => string
  onSelectFriend: (friend: FriendData) => void
  isAI: boolean
}

function FriendItem({ friend, getPersonalityLabel, onSelectFriend, isAI }: FriendItemProps) {
  const { selectedFriend } = useDashboard()
  const isSelected = selectedFriend?.id === friend.id
  
  const containerClass = isAI
    ? cn(
        'flex items-center justify-between p-3 lg:p-2 rounded-lg border transition-all duration-200 hover:shadow-md transform hover:scale-[1.02] cursor-pointer',
        isSelected 
          ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-600 shadow-md'
          : 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-100 dark:border-green-800 hover:border-green-200 dark:hover:border-green-700'
      )
    : cn(
        'flex items-center justify-between p-3 lg:p-2 rounded-lg border transition-all duration-200 hover:shadow-md transform hover:scale-[1.02] cursor-pointer',
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-600 shadow-md'
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
      )

  return (
    <div className={containerClass} onClick={() => onSelectFriend(friend)}>
      <div className="flex items-center space-x-3">
        <Avatar
          src={friend.avatar_url}
          alt={friend.name}
          name={friend.name}
          type={friend.type}
          status={friend.status}
          showStatus
          size="md"
          className="lg:w-8 lg:h-8"
        />
        
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white lg:text-sm">{friend.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 lg:text-[11px]">
            {isAI && friend.personality_preset 
              ? `${getPersonalityLabel(friend.personality_preset)} • オンライン`
              : friend.status === 'online' ? 'オンライン' : 'オフライン'
            }
          </p>
        </div>
      </div>
    </div>
  )
}