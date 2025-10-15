/**
 * AI Agent関連の型定義
 */

export interface AIAgent {
  id: string
  user_id: string
  name: string
  description?: string
  avatar_url?: string
  persona_type: string
  provider: string
  model: string
  temperature: number
  max_tokens: number
  system_prompt?: string
  tools_enabled: boolean
  streaming_enabled: boolean
  is_active: boolean
  message_count: number
  last_chat_at?: string
  created_at: string
  updated_at: string
}

export interface UpdateAgentInput {
  name?: string
  description?: string
  avatar_url?: string
  persona_type?: string
  provider?: string
  model?: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
  tools_enabled?: boolean
  streaming_enabled?: boolean
}

export interface AgentService {
  id: string
  ai_agent_id: string
  service_class: string
  tool_selection_mode: 'all' | 'selected'
  selected_tools: string[]
  enabled: boolean
  created_at: string
}

export interface CreateAIAgentServiceInput {
  service_class: string
  tool_selection_mode?: 'all' | 'selected'
  selected_tools?: string[]
  enabled?: boolean
}

export interface UpdateAIAgentServiceInput {
  tool_selection_mode?: 'all' | 'selected'
  selected_tools?: string[]
  enabled?: boolean
}

export interface AgentServicesResponse {
  services: AgentService[]
}

