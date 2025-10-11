/**
 * AI Agent関連の型定義
 */

export interface AIAgent {
  id: string
  user_id: string
  name: string
  description?: string
  avatar_url?: string
  persona_type: 'assistant' | 'creative' | 'analytical'
  provider: 'openai' | 'anthropic' | 'google'
  model: string
  temperature: number
  max_tokens: number
  system_prompt?: string
  tools_enabled: boolean
  message_count: number
  last_chat_at?: string
  created_at: string
  updated_at: string
}

export interface CreateAgentRequest {
  name: string
  persona_type: string
  provider?: string
  model?: string
  description?: string
}

export interface AgentsResponse {
  agents: AIAgent[]
  total: number
}

export interface Conversation {
  id: string
  user_id: string
  ai_agent_id: string
  message_count: number
  last_message_at?: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_type: 'user' | 'ai'
  sender_id: string
  content: string
  ai_session_id?: string
  created_at: string
}

export interface SendMessageRequest {
  content: string
}

export interface SendMessageResponse {
  user_message: Message
  ai_message: Message
  metadata: {
    model: string
    token_usage: {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
    }
    processing_ms: number
  }
}

export interface MessagesResponse {
  messages: Message[]
  total: number
}

