/**
 * アプリケーション全体で使用される型定義
 */

// Cognito認証用の型定義
import type { AuthUser } from './auth'

// ユーザープロフィールの型定義
export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url?: string | null
  status: 'online' | 'offline' | 'away'
  created_at: string
  updated_at?: string
  email?: string
}

// 選択されたチャットの型定義
export interface SelectedChat {
  id: string
  name: string
  avatar_url?: string
  type: 'human' | 'ai' | 'group'
  status: 'online' | 'offline'
  personality_preset?: string
  member_count?: number
  description?: string
}

// 選択された友だちの型定義
export interface SelectedFriend {
  id: string
  name: string
  avatar_url?: string
  type: 'human' | 'ai'
  status: 'online' | 'offline'
  personality_preset?: string
  created_at?: string
  description?: string
}

// 友だちデータの型定義
export interface FriendData {
  id: string
  type: 'human' | 'ai'
  name: string
  avatar_url?: string
  status: 'online' | 'offline'
  personality_preset?: string
}

// 会話データの型定義（グループも含む）
export interface ConversationData {
  id: string
  type: 'direct' | 'group'
  created_at: string
  updated_at: string
  otherParticipant?: {
    id?: string // AI Agent IDやユーザーID
    name: string
    avatar_url?: string
    type: 'human' | 'ai'
    status: 'online' | 'offline'
    personality_preset?: string
  } | null
  groupInfo?: {
    name: string
    avatar_url?: string
    member_count: number
    description?: string
  } | null
  lastMessage: {
    content: string
    created_at: string
    sender_type: string
    sender_name?: string
  } | null
}

// メッセージの型定義
export interface Message {
  id: string
  content: string
  sender_type: 'human' | 'ai'
  sender_id: string
  created_at: string
}

// AIパーソナリティの型定義
export interface AIPersonality {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  description: string
}

// 友だち追加の選択タイプ
export type AddFriendType = 'user' | 'ai' | 'group' | null

// フィルタータイプ（グループを追加）
export type FriendFilter = 'all' | 'ai' | 'human' | 'group'
export type ChatFilter = 'all' | 'users' | 'ai' | 'groups'

// タブタイプ（groupsを削除）
export type TabType = 'chats' | 'friends' | 'add-friends' | 'settings'

// テーマタイプ
export type Theme = 'light' | 'dark' | 'system'

// グループデータの型定義
export interface GroupData {
  id: string
  name: string
  description?: string
  avatar_url?: string
  creator_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  member_count?: number
  last_message?: {
    content: string
    created_at: string
    sender_type: string
    sender_name: string
  } | null
}

// グループメンバーの型定義
export interface GroupMember {
  id: string
  group_id: string
  member_type: 'human' | 'ai'
  member_id: string
  role: 'admin' | 'member'
  joined_at: string
  name: string
  avatar_url?: string
  status?: 'online' | 'offline'
  personality_preset?: string
}

// グループメッセージの型定義
export interface GroupMessage {
  id: string
  group_id: string
  sender_type: 'human' | 'ai'
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'file' | 'system'
  created_at: string
  sender_name: string
  sender_avatar?: string
}

// 選択されたグループの型定義
export interface SelectedGroup {
  id: string
  name: string
  description?: string
  avatar_url?: string
  member_count: number
  members: GroupMember[]
}

// 認証結果の型定義
export interface AuthResult {
  user: AuthUser | null
  session: any | null
}

// 認証設定の型定義
export interface AuthConfig {
  cognitoUserPoolId: string
  cognitoClientId: string
  cognitoDomain: string
  isConfigured: boolean
}

// 認証アクションの結果
export interface AuthActionResult {
  error?: string
  success?: boolean
}

// ダッシュボードコンテキストの型定義
export interface DashboardContextType {
  user: AuthUser
  profile: Profile
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  selectedChat: SelectedChat | null
  setSelectedChat: (chat: SelectedChat | null) => void
  selectedFriend: SelectedFriend | null
  setSelectedFriend: (friend: SelectedFriend | null) => void
  selectedAddFriendType: AddFriendType
  setSelectedAddFriendType: (type: AddFriendType) => void
  showProfileSettings: boolean
  setShowProfileSettings: (show: boolean) => void
  selectedGroup: SelectedGroup | null
  setSelectedGroup: (group: SelectedGroup | null) => void
}

// テーマコンテキストの型定義
export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}