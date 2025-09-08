import { MessageCircle, Phone, Video, Settings, Calendar, Bot, User, Heart, Briefcase, Coffee, Smile, Zap } from 'lucide-react'
import { useDashboard } from '@/components/dashboard/DashboardProvider'

interface SelectedFriend {
  id: string
  name: string
  avatar_url?: string
  type: 'human' | 'ai'
  status: 'online' | 'offline'
  personality_preset?: string
  created_at?: string
  description?: string
}

interface FriendDetailPanelProps {
  friend: SelectedFriend
}

/**
 * 友だち詳細パネル
 */
export function FriendDetailPanel({ friend }: FriendDetailPanelProps) {
  const { setSelectedChat, setActiveTab } = useDashboard()

  const handleStartChat = () => {
    setSelectedChat({
      id: friend.id,
      name: friend.name,
      avatar_url: friend.avatar_url,
      type: friend.type,
      status: friend.status,
      personality_preset: friend.personality_preset
    })
    setActiveTab('chats')
  }

  const getPersonalityInfo = (preset: string) => {
    const personalities = {
      support: { 
        name: 'サポート', 
        icon: Zap, 
        color: 'from-blue-400 to-blue-600',
        description: '技術的な質問や問題解決をサポートします。困ったことがあれば何でもお聞かせください。'
      },
      friendly: { 
        name: 'フレンドリー', 
        icon: Heart, 
        color: 'from-pink-400 to-pink-600',
        description: '親しみやすく楽しい会話を提供します。日常の出来事や趣味について話しましょう。'
      },
      business: { 
        name: 'ビジネス', 
        icon: Briefcase, 
        color: 'from-gray-400 to-gray-600',
        description: '仕事や業務効率化をサポートします。プロジェクト管理や戦略立案をお手伝いします。'
      },
      casual: { 
        name: 'カジュアル', 
        icon: Coffee, 
        color: 'from-green-400 to-green-600',
        description: 'のんびりとリラックスした会話を楽しみます。気軽に何でもお話しください。'
      },
      humor: { 
        name: 'ユーモア', 
        icon: Smile, 
        color: 'from-yellow-400 to-yellow-600',
        description: '笑いと楽しさを提供します。面白い話題で一緒に笑いましょう。'
      }
    }
    return personalities[preset as keyof typeof personalities] || personalities.friendly
  }

  const personalityInfo = friend.personality_preset ? getPersonalityInfo(friend.personality_preset) : null
  const PersonalityIcon = personalityInfo?.icon

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <>
      {/* ヘッダー */}
      <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 transition-colors duration-200">
        <div className="flex items-center space-x-3">
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
                <span className="text-white font-medium">
                  {friend.name.charAt(0)}
                </span>
              )}
            </div>
            {friend.type === 'ai' && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-xs">🤖</span>
              </div>
            )}
            {friend.type === 'human' && friend.status === 'online' && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
            )}
          </div>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">{friend.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {friend.type === 'ai' ? 'AIエージェント' : 'ユーザー'} • {friend.status === 'online' ? 'オンライン' : 'オフライン'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleStartChat}
            className="p-2 text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-200"
            title="トークを開始"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          {friend.type === 'human' && (
            <>
              <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                <Video className="w-5 h-5" />
              </button>
            </>
          )}
          <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-800 p-6 overflow-y-auto transition-colors duration-200">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* プロフィール情報 */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-fadeIn">
            <div className="flex items-center space-x-6 mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt={friend.name}
                      className="w-full h-full object-cover"
                    />
                  ) : friend.type === 'ai' ? (
                    <Bot className="w-10 h-10 text-white" />
                  ) : (
                    <span className="text-white font-medium text-2xl">
                      {friend.name.charAt(0)}
                    </span>
                  )}
                </div>
                {friend.type === 'ai' && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                    <span className="text-sm">🤖</span>
                  </div>
                )}
                {friend.type === 'human' && friend.status === 'online' && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{friend.name}</h1>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {friend.type === 'ai' ? (
                      <Bot className="w-4 h-4 text-green-500" />
                    ) : (
                      <User className="w-4 h-4 text-blue-500" />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {friend.type === 'ai' ? 'AIエージェント' : 'ユーザー'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {friend.status === 'online' ? 'オンライン' : 'オフライン'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 説明 */}
            {friend.description && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">説明</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{friend.description}</p>
              </div>
            )}

            {/* AIエージェントの場合のパーソナリティ情報 */}
            {friend.type === 'ai' && personalityInfo && PersonalityIcon && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">パーソナリティ</h3>
                <div className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className={`w-12 h-12 bg-gradient-to-br ${personalityInfo.color} rounded-lg flex items-center justify-center shadow-sm`}>
                    <PersonalityIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">{personalityInfo.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{personalityInfo.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 友だちになった日 */}
            {friend.created_at && (
              <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>友だちになった日: {formatDate(friend.created_at)}</span>
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-fadeIn">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">アクション</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleStartChat}
                className="flex items-center justify-center space-x-3 px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                <span>トークを開始</span>
              </button>
              {friend.type === 'human' && (
                <>
                  <button className="flex items-center justify-center space-x-3 px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105">
                    <Phone className="w-5 h-5" />
                    <span>音声通話</span>
                  </button>
                  <button className="flex items-center justify-center space-x-3 px-6 py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105">
                    <Video className="w-5 h-5" />
                    <span>ビデオ通話</span>
                  </button>
                </>
              )}
              <button className="flex items-center justify-center space-x-3 px-6 py-4 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105">
                <Settings className="w-5 h-5" />
                <span>設定</span>
              </button>
            </div>
          </div>

          {/* 統計情報（AIエージェントの場合） */}
          {friend.type === 'ai' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-fadeIn">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">統計情報</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-green-500 mb-1">24/7</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">利用可能</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500 mb-1">∞</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">応答速度</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}