'use client'

import { useState, useEffect } from 'react'
import { Bot, User, ArrowRight, Sparkles, Heart, Briefcase, Coffee, Smile, Zap, Plus, UserPlus, Search, QrCode, Users, Handshake } from 'lucide-react'
import { useDashboard } from '@/components/dashboard/DashboardProvider'
import { getAllSampleFriends } from '@/lib/data/sampleData'
import { getPersonalityLabel } from '@/lib/constants/personalities'
import { cn } from '@/lib/utils/cn'
import type { FriendData } from '@/lib/types'

type AddType = 'user' | 'ai' | 'group' | null

/**
 * 友だち追加パネル - 完璧に統一されたデザインシステム
 */
export function AddFriendsPanel() {
  const [selectedType, setSelectedType] = useState<AddType>(null)
  const { setActiveTab, selectedAddFriendType, setSelectedAddFriendType } = useDashboard()

  // デスクトップかどうかを判定
  const [isDesktop, setIsDesktop] = useState(false)
  
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    
    checkIsDesktop()
    window.addEventListener('resize', checkIsDesktop)
    
    return () => window.removeEventListener('resize', checkIsDesktop)
  }, [])

  // デスクトップでは全体の状態を使用、モバイルではローカル状態を使用
  const currentSelectedType = isDesktop ? selectedAddFriendType : selectedType
  const setCurrentSelectedType = isDesktop ? setSelectedAddFriendType : setSelectedType

  const addTypes = [
    {
      type: 'user' as const,
      icon: User,
      title: 'ユーザー',
      description: '実際の人とつながって会話しよう',
      color: 'from-blue-400 to-purple-500',
      bgColor: 'from-blue-500/10 to-purple-500/10',
      borderColor: 'border-blue-400/30'
    },
    {
      type: 'ai' as const,
      icon: Bot,
      title: 'AIエージェント',
      description: '様々な個性を持つAIと会話しよう',
      color: 'from-emerald-400 to-cyan-500',
      bgColor: 'from-emerald-500/10 to-cyan-500/10',
      borderColor: 'border-emerald-400/30'
    },
    {
      type: 'group' as const,
      icon: Handshake,
      title: 'グループ',
      description: '複数の友だちやAIとグループチャット',
      color: 'from-purple-400 to-pink-500',
      bgColor: 'from-purple-500/10 to-pink-500/10',
      borderColor: 'border-purple-400/30'
    }
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* モバイル・タブレット用の従来レイアウト */}
      <div className="lg:hidden">
        {currentSelectedType ? (
          currentSelectedType === 'ai' ? (
            <AIAgentCreationPanel onBack={() => setCurrentSelectedType(null)} />
          ) : currentSelectedType === 'group' ? (
            <GroupCreationPanel onBack={() => setCurrentSelectedType(null)} />
          ) : (
            <UserFriendAddPanel onBack={() => setCurrentSelectedType(null)} />
          )
        ) : (
          <div className="flex flex-col h-full">
            {/* ヘッダー */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">追加</h1>
            </div>

            {/* 選択カード */}
            <div className="flex-1 p-6 pb-8 flex items-start justify-center overflow-y-auto">
              <div className="w-full space-y-4">
                {addTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.type}
                      onClick={() => setCurrentSelectedType(type.type)}
                      className={cn(
                        "w-full p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700",
                        "transition-all duration-200 group animate-fadeIn",
                        "hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md"
                      )}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg",
                          "group-hover:shadow-xl transition-shadow",
                          `bg-gradient-to-br ${type.color}`
                        )}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{type.title}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{type.description}</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-green-500 transition-colors" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* デスクトップ用レイアウト */}
      <div className="hidden lg:flex flex-col h-full">
        {/* 選択カード */}
        <div className="flex-1 p-6 flex items-start justify-center">
          <div className="w-full space-y-4">
            {addTypes.map((type) => {
              const Icon = type.icon
              const isSelected = currentSelectedType === type.type
              return (
                <button
                  key={type.type}
                  onClick={() => setCurrentSelectedType(type.type)}
                  className={cn(
                    "p-4 bg-white dark:bg-gray-800 rounded-xl border transition-all duration-200 text-left animate-fadeIn",
                    isSelected
                      ? `border-green-400 bg-green-50 dark:bg-green-500/10 shadow-md`
                      : `border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md`
                  )}
                >
                  <div className="flex items-center space-x-4">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg",
                      "transition-shadow",
                      `bg-gradient-to-br ${type.color}`
                    )}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{type.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{type.description}</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-400 hover:text-green-500 transition-colors" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * デスクトップ用の右側パネル - 完璧に統一されたデザインシステム
 */
export function AddFriendsRightPanel({ selectedType }: { selectedType: AddType }) {
  console.log('🔍 AddFriendsRightPanel selectedType:', selectedType)
  
  if (selectedType === 'ai') {
    return <AIAgentCreationPanel onBack={() => {}} isDesktop />
  }
  
  if (selectedType === 'group') {
    return <GroupCreationPanel onBack={() => {}} isDesktop />
  }
  
  if (selectedType === 'user') {
    return <UserFriendAddPanel onBack={() => {}} isDesktop />
  }
  
  return (
    <>
      {/* ヘッダー */}
      <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">友だち追加</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">左側から追加したい種類を選択してください</p>
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-12 h-12 text-green-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            友だちを追加
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            左側からユーザーまたはAIエージェントを選択して、<br />
            新しい友だちを追加しましょう。
          </p>
          <div className="flex justify-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <User className="w-4 h-4" />
              <span>ユーザー</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Bot className="w-4 h-4" />
              <span>AIエージェント</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Handshake className="w-4 h-4" />
              <span>グループ</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

interface AIAgentCreationPanelProps {
  onBack: () => void
  isDesktop?: boolean
}

function AIAgentCreationPanel({ onBack, isDesktop = false }: AIAgentCreationPanelProps) {
  const [formData, setFormData] = useState({
    name: '',
    personality: '',
    description: ''
  })

  const personalities = [
    { 
      id: 'support', 
      name: 'サポート', 
      icon: Zap, 
      color: 'from-blue-400 to-blue-600',
      description: '技術的な質問や問題解決をサポート'
    },
    { 
      id: 'friendly', 
      name: 'フレンドリー', 
      icon: Heart, 
      color: 'from-pink-400 to-pink-600',
      description: '親しみやすく楽しい会話を提供'
    },
    { 
      id: 'business', 
      name: 'ビジネス', 
      icon: Briefcase, 
      color: 'from-slate-400 to-slate-600',
      description: '仕事や業務効率化をサポート'
    },
    { 
      id: 'casual', 
      name: 'カジュアル', 
      icon: Coffee, 
      color: 'from-emerald-400 to-emerald-600',
      description: 'のんびりとリラックスした会話'
    },
    { 
      id: 'humor', 
      name: 'ユーモア', 
      icon: Smile, 
      color: 'from-yellow-400 to-yellow-600',
      description: '笑いと楽しさを提供する会話'
    }
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('AIエージェント作成:', formData)
    // TODO: AIエージェント作成処理
    if (!isDesktop) {
      onBack()
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-4">
          {!isDesktop && (
            <button
              onClick={onBack}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-green-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AIエージェント作成</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">あなた専用のAIエージェントを作成しましょう</p>
            </div>
          </div>
        </div>
      </div>

      {/* フォーム */}
      <div className="flex-1 p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          {/* 名前入力 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              エージェント名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例: マイアシスタント"
              className={cn(
                "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg",
                "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                "text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300"
              )}
              required
            />
          </div>

          {/* パーソナリティ選択 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-4">
              パーソナリティ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {personalities.map((personality) => {
                const Icon = personality.icon
                const isSelected = formData.personality === personality.id
                return (
                  <button
                    key={personality.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, personality: personality.id })}
                    className={cn(
                      "p-5 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 transition-all duration-300 text-left",
                      isSelected
                        ? 'border-green-500 bg-green-50 dark:bg-green-500/10 shadow-md'
                        : 'border-gray-200 dark:border-gray-600 hover:border-green-400 hover:shadow-sm'
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm",
                        `bg-gradient-to-br ${personality.color}`
                      )}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{personality.name}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{personality.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 説明入力 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              説明（オプション）
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="このAIエージェントの特徴や役割を説明してください..."
              rows={4}
              className={cn(
                "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg",
                "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                "text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300 resize-none"
              )}
            />
          </div>

          {/* 作成ボタン */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!isDesktop && (
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-300 font-medium"
              >
                キャンセル
              </button>
            )}
            <button
              type="submit"
              disabled={!formData.name || !formData.personality}
              className={cn(
                "flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-300",
                "flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl",
                "transform hover:scale-[1.02] disabled:transform-none",
                "bg-green-500 hover:bg-green-600",
                "disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white",
                "disabled:cursor-not-allowed"
              )}
            >
              <Plus className="w-5 h-5" />
              <span>AIエージェントを作成</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface UserFriendAddPanelProps {
  onBack: () => void
  isDesktop?: boolean
}

function UserFriendAddPanel({ onBack, isDesktop = false }: UserFriendAddPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const addMethods = [
    {
      icon: Search,
      title: 'ユーザー名で検索',
      description: 'ユーザー名やIDで友だちを検索して追加',
      color: 'from-blue-400 to-blue-600',
      bgColor: 'from-blue-500/10 to-blue-600/10',
      borderColor: 'border-blue-400/30'
    },
    {
      icon: QrCode,
      title: 'QRコードスキャン',
      description: 'QRコードをスキャンして友だち追加',
      color: 'from-emerald-400 to-emerald-600',
      bgColor: 'from-emerald-500/10 to-emerald-600/10',
      borderColor: 'border-emerald-400/30'
    },
    {
      icon: Users,
      title: '連絡先から招待',
      description: '連絡先の友だちをアプリに招待',
      color: 'from-purple-400 to-purple-600',
      bgColor: 'from-purple-500/10 to-purple-600/10',
      borderColor: 'border-purple-400/30'
    }
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-4">
          {!isDesktop && (
            <button
              onClick={onBack}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-green-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ユーザー追加</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">新しいユーザーを追加しましょう</p>
            </div>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 検索バー */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Search className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">ユーザー名で検索</h3>
            </div>
            <div className="flex space-x-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ユーザー名を入力..."
                className={cn(
                  "flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                  "text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300"
                )}
              />
              <button className={cn(
                "px-6 py-3 rounded-lg font-medium transition-all duration-300",
                "bg-green-500 hover:bg-green-600",
                "text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              )}>
                検索
              </button>
            </div>
            {searchQuery && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  「{searchQuery}」の検索結果はありません
                </p>
              </div>
            )}
          </div>

          {/* 追加方法 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">その他の追加方法</h3>
            <div className="space-y-4">
              {addMethods.map((method, index) => {
                const Icon = method.icon
                return (
                  <button
                    key={index}
                    onClick={() => console.log(`${method.title}を実行`)}
                    className={cn(
                      "w-full flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border",
                      "transition-all duration-300 text-left transform hover:scale-[1.01]",
                      "border-gray-200 dark:border-gray-600 hover:border-green-400 hover:shadow-md"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                      `bg-gradient-to-br ${method.color}`
                    )}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{method.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{method.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* 招待セクション */}
          <div className={cn(
            "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm"
          )}>
            <div className="flex items-center space-x-3 mb-3">
              <Sparkles className="w-5 h-5 text-green-500" />
              <h3 className="font-medium text-gray-900 dark:text-white">ユーザーを招待</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              招待リンクを送ってユーザーをアプリに招待しましょう。<br />
              招待されたユーザーは簡単にアプリに参加できます。
            </p>
            <button className={cn(
              "w-full px-4 py-3 rounded-lg font-medium transition-all duration-300",
              "bg-green-500 hover:bg-green-600",
              "text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            )}>
              招待リンクを作成
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface GroupCreationPanelProps {
  onBack: () => void
  isDesktop?: boolean
}

function GroupCreationPanel({ onBack, isDesktop = false }: GroupCreationPanelProps) {
  const { user } = useDashboard()
  const [friends, setFriends] = useState<FriendData[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [isLoadingFriends, setIsLoadingFriends] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  // 友だちリストを読み込み
  useEffect(() => {
    const loadFriends = async () => {
      try {
        if (user.id === 'guest-user-id') {
          setFriends(getAllSampleFriends())
        } else {
          setFriends([])
        }
      } catch (error) {
        console.error('友だちリストの読み込みでエラーが発生しました:', error)
      } finally {
        setIsLoadingFriends(false)
      }
    }

    loadFriends()
  }, [user.id])

  const handleMemberToggle = (friendId: string) => {
    const newSelectedMembers = new Set(selectedMembers)
    if (newSelectedMembers.has(friendId)) {
      newSelectedMembers.delete(friendId)
    } else {
      newSelectedMembers.add(friendId)
    }
    setSelectedMembers(newSelectedMembers)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('グループ作成:', {
      ...formData,
      selectedMembers: Array.from(selectedMembers),
      memberCount: selectedMembers.size + 1 // +1 for the creator
    })
    // TODO: グループ作成処理
    if (!isDesktop) {
      onBack()
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-4">
          {!isDesktop && (
            <button
              onClick={onBack}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-green-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <Handshake className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">グループ作成</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">新しいグループを作成しましょう</p>
            </div>
          </div>
        </div>
      </div>

      {/* フォーム */}
      <div className="flex-1 p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          {/* グループ名入力 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              グループ名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例: プロジェクトチーム"
              className={cn(
                "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg",
                "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                "text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300"
              )}
              required
            />
          </div>

          {/* 説明入力 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              説明（オプション）
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="このグループの目的や説明を入力してください..."
              rows={4}
              className={cn(
                "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg",
                "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                "text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300 resize-none"
              )}
            />
          </div>

          {/* メンバー選択 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                メンバーを選択
              </label>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                あなた + {selectedMembers.size}人 = {selectedMembers.size + 1}人のグループ
              </span>
            </div>
            
            {isLoadingFriends ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  友だちがいません。<br />
                  先に友だちを追加してからグループを作成してください。
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {friends.map((friend) => {
                  const isSelected = selectedMembers.has(friend.id)
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => handleMemberToggle(friend.id)}
                      className={cn(
                        "w-full flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-2",
                        "transition-all duration-300 text-left",
                        isSelected
                          ? 'border-green-500 bg-green-50 dark:bg-green-500/10 shadow-md'
                          : 'border-gray-200 dark:border-gray-600 hover:border-green-400 hover:shadow-sm'
                      )}
                    >
                      {/* チェックボックス */}
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-300",
                        isSelected
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-400 dark:border-gray-600'
                      )}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      
                      {/* アバター */}
                      <div className="relative">
                        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                          {friend.avatar_url ? (
                            <img
                              src={friend.avatar_url}
                              alt={friend.name}
                              className="w-full h-full object-cover"
                            />
                          ) : friend.type === 'ai' ? (
                            <Bot className="w-5 h-5 text-white" />
                          ) : (
                            <span className="text-white font-medium text-sm">
                              {friend.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        
                        {/* ステータスバッジ */}
                        {friend.type === 'ai' && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                            <span className="text-xs">🤖</span>
                          </div>
                        )}
                        {friend.type === 'human' && friend.status === 'online' && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                        )}
                      </div>
                      
                      {/* 友だち情報 */}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{friend.name}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {friend.type === 'ai' && friend.personality_preset 
                            ? `${getPersonalityLabel(friend.personality_preset)} • オンライン`
                            : friend.status === 'online' ? 'オンライン' : 'オフライン'
                          }
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 作成ボタン */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!isDesktop && (
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-300 font-medium"
              >
                キャンセル
              </button>
            )}
            <button
              type="submit"
              disabled={!formData.name || selectedMembers.size === 0}
              className={cn(
                "flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-300",
                "flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl",
                "transform hover:scale-[1.02] disabled:transform-none",
                "bg-green-500 hover:bg-green-600",
                "disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white",
                "disabled:cursor-not-allowed"
              )}
            >
              <Plus className="w-5 h-5" />
              <span>
                グループを作成 {selectedMembers.size > 0 && `(${selectedMembers.size + 1}人)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}