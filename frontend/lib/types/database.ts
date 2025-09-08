// データベース型定義
export interface DatabaseConversation {
  id: string
  participant1_type: 'human' | 'ai'
  participant1_id: string
  participant2_type: 'human' | 'ai'
  participant2_id: string
  last_message_content: string | null
  last_message_sender_id: string | null
  last_message_sender_type: 'human' | 'ai' | null
  last_message_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseProfile {
  id: string
  display_name: string
  avatar_url: string | null
  status: 'online' | 'offline' | 'away'
}

export interface DatabaseMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_type: 'human' | 'ai'
  content: string
  sent_at: string
}