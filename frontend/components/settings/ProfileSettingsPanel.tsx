import { User, Mail, Calendar, Edit, Save, X, Camera } from 'lucide-react'
import { useState } from 'react'
import { useDashboard } from '@/components/dashboard/DashboardProvider'

/**
 * プロフィール設定パネル
 */
export function ProfileSettingsPanel() {
  const { profile, user } = useDashboard()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    display_name: profile.display_name,
    username: profile.username,
    avatar_url: profile.avatar_url || ''
  })

  const handleSave = () => {
    // TODO: プロフィール更新処理
    console.log('プロフィール更新:', editData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData({
      display_name: profile.display_name,
      username: profile.username,
      avatar_url: profile.avatar_url || ''
    })
    setIsEditing(false)
  }

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
      <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 transition-colors duration-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">プロフィール設定</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">アカウント情報を管理</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="p-2 text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-200"
                title="保存"
              >
                <Save className="w-5 h-5" />
              </button>
              <button
                onClick={handleCancel}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                title="キャンセル"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200"
              title="編集"
            >
              <Edit className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto transition-colors duration-200">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* プロフィール画像とメイン情報 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-fadeIn">
            <div className="flex items-center space-x-6 mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                  {(isEditing ? editData.avatar_url : profile.avatar_url) ? (
                    <img
                      src={isEditing ? editData.avatar_url : profile.avatar_url}
                      alt={profile.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-medium text-3xl">
                      {profile.display_name.charAt(0)}
                    </span>
                  )}
                </div>
                {isEditing && (
                  <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-200">
                    <Camera className="w-4 h-4" />
                  </button>
                )}
                <div className={`absolute -bottom-1 -left-1 w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 ${
                  profile.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editData.display_name}
                      onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
                      className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-900 dark:text-white w-full"
                      placeholder="表示名"
                    />
                    <input
                      type="text"
                      value={editData.username}
                      onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                      className="text-lg bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none text-gray-600 dark:text-gray-400 w-full"
                      placeholder="ユーザー名"
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{profile.display_name}</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">@{profile.username}</p>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        profile.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {profile.status === 'online' ? 'オンライン' : 'オフライン'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* アカウント情報 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-fadeIn">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              アカウント情報
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">メールアドレス</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">{user.email}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ユーザーID</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white font-mono">{user.id.substring(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">登録日</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">{formatDate(profile.created_at)}</span>
              </div>
            </div>
          </div>

          {/* プライバシー設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-fadeIn">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">プライバシー設定</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">オンライン状態を表示</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">他のユーザーにオンライン状態を表示します</p>
                </div>
                <button 
                  className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${
                    profile.status === 'online'
                      ? 'bg-green-500' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
                    profile.status === 'online' ? 'right-0.5' : 'left-0.5'
                  }`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">プロフィール公開</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">他のユーザーがプロフィールを閲覧できます</p>
                </div>
                <button 
                  className="w-12 h-6 rounded-full relative transition-colors duration-200 bg-green-500"
                >
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 right-0.5"></div>
                </button>
              </div>
            </div>
          </div>

          {/* 統計情報 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-fadeIn">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">統計情報</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-blue-500 mb-1">7</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">友だち</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-green-500 mb-1">5</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">AIエージェント</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-purple-500 mb-1">42</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">メッセージ</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}