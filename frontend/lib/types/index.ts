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
  avatar_url?: string
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
  status: 'online' | 'offline' | 'away'
  personality_preset?: string
  member_count?: number
  description?: string
}

// 選択された友だちの型定義
export interface SelectedFriend {
  id: string
  name: string
  avatar_url?: string
  type: 'human' | 'ai' | 'group'
  status: 'online' | 'offline' | 'away'
  personality_preset?: string
  created_at?: string
  description?: string
}

// 友だちデータの型定義
export interface FriendData {
  id: string
  type: 'human' | 'ai' | 'group'
  name: string
  avatar_url?: string
  status: 'online' | 'offline' | 'away'
  personality_preset?: string
  description?: string
  last_message?: string
  last_message_at?: string
  unread_count?: number
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
    status: 'online' | 'offline' | 'away'
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

// ツール使用履歴の型定義（DBから取得したデータ）
export interface ToolUsage {
  id: string
  tool_name: string
  tool_category: string
  input_data: string
  output_data?: string
  status: 'completed' | 'failed'
  error_message?: string
  execution_time_ms?: number
  insert_position?: number // メッセージ内での挿入位置
  executed_at: string
}

// メッセージの型定義
export interface Message {
  id: string
  content: string
  sender_type: 'human' | 'ai'
  sender_id: string
  created_at: string
  tool_usages?: ToolUsage[]
}

// AIパーソナリティの型定義
export interface AIPersonality {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  description: string
}

// フィルタータイプ
export type FriendFilter = 'all' | 'ai' | 'human' | 'group'
export type ChatFilter = 'all' | 'users' | 'ai' | 'groups'

// テーマタイプ
export type Theme = 'light' | 'dark' | 'system'


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
  members: Array<{
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
  }>
}


// 認証コンテキストの型定義（簡素化版）
// 注: DashboardContextType は非推奨。AuthProvider は user と profile のみ提供
// 選択状態（selectedChat など）は URL パラメータで管理します
export interface DashboardContextType {
  user: AuthUser
  profile: Profile
  selectedChat?: SelectedChat | null // @deprecated URL パラメータで管理
  setSelectedChat?: (chat: SelectedChat | null) => void // @deprecated 使用しない
  selectedFriend?: SelectedFriend | null // @deprecated URL パラメータで管理
  setSelectedFriend?: (friend: SelectedFriend | null) => void // @deprecated 使用しない
  selectedGroup?: SelectedGroup | null // @deprecated URL パラメータで管理
  setSelectedGroup?: (group: SelectedGroup | null) => void // @deprecated 使用しない
}

// テーマコンテキストの型定義
export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

// ストリーミングイベントの型定義
export interface StreamEvent {
  type: 'token' | 'tool_start' | 'tool_end' | 'done' | 'error'
  content?: string
  tool_id?: string
  tool_name?: string
  input?: string
  output?: string
  status?: 'completed' | 'failed'
  error?: string
  execution_time_ms?: number
  insert_position?: number
  code?: string
  message?: string
}

// ツール使用情報の型定義
export interface ToolUsageData {
  tool_id: string
  tool_name: string
  status: 'running' | 'completed' | 'failed'
  input: any
  output?: string
  error?: string
  execution_time_ms?: number
  expanded: boolean
  insertPosition?: number // ツールが使用されたメッセージ内の文字位置
}