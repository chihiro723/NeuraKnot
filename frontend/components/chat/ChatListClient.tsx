'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, User, Bot, Plus, Handshake } from 'lucide-react'
import { useDashboard } from '@/components/dashboard/DashboardProvider'
import { SearchInput } from '@/components/ui/SearchInput'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { FullScreenLoading } from '@/components/ui/LoadingSpinner'
import { formatTime } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import type { ConversationData, ChatFilter } from '@/lib/types'

/**
 * チャットリストクライアントコンポーネント（グループ統合版）
 */
export function ChatListClient() {
  const { user, setSelectedChat, selectedChat, setSelectedGroup } = useDashboard()
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('all')

  useEffect(() => {
    const loadConversations = async () => {
      try {
        // TODO: Load real conversations from database
        setConversations([])
      } catch (error) {
        console.error('会話の読み込みでエラーが発生しました:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadConversations()
  }, [user.id])

  const handleChatSelect = (conversation: ConversationData) => {
    if (conversation.type === 'group' && conversation.groupInfo) {
      // グループチャットの場合
      setSelectedGroup({
        id: conversation.id,
        name: conversation.groupInfo.name,
        description: conversation.groupInfo.description,
        avatar_url: conversation.groupInfo.avatar_url,
        member_count: conversation.groupInfo.member_count,
        members: [] // TODO: Load real group members from database
      })

      setSelectedChat({
        id: conversation.id,
        name: conversation.groupInfo.name,
        avatar_url: conversation.groupInfo.avatar_url,
        type: 'group',
        status: 'online',
        member_count: conversation.groupInfo.member_count,
        description: conversation.groupInfo.description
      })
    } else if (conversation.otherParticipant) {
      // 1対1チャットの場合
      setSelectedChat({
        id: conversation.otherParticipant.type === 'ai' ? conversation.id : conversation.otherParticipant.name,
        name: conversation.otherParticipant.name,
        avatar_url: conversation.otherParticipant.avatar_url,
        type: conversation.otherParticipant.type,
        status: conversation.otherParticipant.status,
        personality_preset: conversation.otherParticipant.personality_preset
      })
    }
  }

  const filteredConversations = conversations.filter(conv => {
    // 検索フィルター
    const matchesSearch = conv.type === 'group' 
      ? conv.groupInfo?.name.toLowerCase().includes(searchQuery.toLowerCase())
      : conv.otherParticipant?.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    // タイプフィルター
    const matchesFilter = activeFilter === 'all' || 
      (activeFilter === 'groups' && conv.type === 'group') ||
      (activeFilter === 'users' && conv.type === 'direct' && conv.otherParticipant?.type === 'human') ||
      (activeFilter === 'ai' && conv.type === 'direct' && conv.otherParticipant?.type === 'ai')
    
    return matchesSearch && matchesFilter
  })

  const filters = [
    { 
      id: 'all' as const, 
      label: 'すべて', 
      icon: MessageCircle, 
      count: conversations.length 
    },
    { 
      id: 'users' as const, 
      label: 'ユーザー', 
      icon: User, 
      count: conversations.filter(c => c.type === 'direct' && c.otherParticipant?.type === 'human').length 
    },
    { 
      id: 'ai' as const, 
      label: 'AI', 
      icon: Bot, 
      count: conversations.filter(c => c.type === 'direct' && c.otherParticipant?.type === 'ai').length 
    },
    { 
      id: 'groups' as const, 
      label: 'グループ', 
      icon: Handshake, 
      count: conversations.filter(c => c.type === 'group').length 
    }
  ]

  if (isLoading) {
    return <FullScreenLoading />
  }

  return (
    <div className="flex flex-col h-full lg:border-r-0 bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 lg:hidden">
        <SearchInput 
          placeholder="トークを検索" 
          onSearch={setSearchQuery}
        />
      </div>
      
      {/* デスクトップ用検索バー */}
      <div className="hidden lg:block bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <SearchInput 
          placeholder="トークを検索" 
          onSearch={setSearchQuery}
        />
      </div>

      {/* フィルタータブ（アイコンのみ） */}
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
                title={filter.label} // ツールチップとして表示
              >
                <Icon className="w-5 h-5 mb-1" />
                {/* 件数バッジ */}
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
        {filteredConversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={searchQuery ? '検索結果がありません' : 'トークがありません'}
            description={searchQuery ? '検索条件を変更してください' : '友だちを追加してトークを始めましょう'}
          />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800 pb-4 lg:pb-0">
            {filteredConversations.map((conversation) => (
              <ConversationItem 
                key={conversation.id}
                conversation={conversation}
                onSelect={() => handleChatSelect(conversation)}
                isSelected={selectedChat?.id === conversation.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ConversationItemProps {
  conversation: ConversationData
  onSelect: () => void
  isSelected: boolean
}

function ConversationItem({ conversation, onSelect, isSelected }: ConversationItemProps) {
  const isGroup = conversation.type === 'group'
  const displayName = isGroup ? conversation.groupInfo?.name : conversation.otherParticipant?.name
  const avatarUrl = isGroup ? conversation.groupInfo?.avatar_url : conversation.otherParticipant?.avatar_url
  
  return (
    <button 
      onClick={onSelect}
      className={cn(
        'w-full p-4 transition-all duration-200 text-left lg:border-b lg:border-gray-100 dark:lg:border-gray-800 last:border-b-0',
        isSelected 
          ? 'bg-green-50 dark:bg-green-900/20 border-r-2 border-green-500 dark:border-green-400' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      )}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-12 h-12 lg:w-10 lg:h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : isGroup ? (
              <Handshake className="w-6 h-6 lg:w-5 lg:h-5 text-purple-500 dark:text-purple-400" />
            ) : (
              <span className="text-white font-medium">
                {displayName?.charAt(0)}
              </span>
            )}
          </div>
          
          {isGroup ? (
            // グループのメンバー数バッジ
            <div className="absolute -bottom-1 -right-1 w-5 h-5 lg:w-4 lg:h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
              <span className="text-xs lg:text-[10px] text-white font-medium">
                {conversation.groupInfo?.member_count}
              </span>
            </div>
          ) : (
            <>
              {conversation.otherParticipant?.type === 'ai' && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-xs lg:text-[10px]">🤖</span>
                </div>
              )}
              
              {conversation.otherParticipant?.type === 'human' && conversation.otherParticipant?.status === 'online' && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
              )}
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-gray-900 dark:text-white truncate lg:text-sm">
              {displayName}
            </h3>
            {conversation.lastMessage && (
              <span className="text-xs text-gray-500 dark:text-gray-400 lg:text-[11px]">
                {formatTime(conversation.lastMessage.created_at)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate lg:text-xs">
            {conversation.lastMessage ? (
              isGroup && conversation.lastMessage.sender_name ? (
                <>
                  <span className="text-gray-500 dark:text-gray-500">
                    {conversation.lastMessage.sender_name}:
                  </span>{' '}
                  {conversation.lastMessage.content}
                </>
              ) : (
                conversation.lastMessage.content
              )
            ) : (
              'メッセージがありません'
            )}
          </p>
          
          {/* グループの場合はメンバー数を表示 */}
          {isGroup && (
            <span className="text-xs text-gray-500 dark:text-gray-400 lg:text-[11px]">
              {conversation.groupInfo?.member_count}人のメンバー
            </span>
          )}
        </div>
      </div>
    </button>
  )
}