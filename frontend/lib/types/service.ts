/**
 * サービスシステムの型定義
 * 
 * Python側で動的に取得されるサービスとツールの型定義
 */

export type ServiceType = 'built_in' | 'api_wrapper' | 'database' | 'custom'

export type ToolSelectionMode = 'all' | 'selected'

/**
 * サービス（Pythonで定義）
 */
export interface Service {
  class_name: string
  name: string
  description: string
  icon: string
  type: ServiceType
  config_schema: Record<string, any>
  auth_schema: Record<string, any>
}

/**
 * ツール（Pythonで定義）
 */
export interface Tool {
  name: string
  description: string
  input_schema: Record<string, any>
  category: string
  tags: string[]
}

/**
 * サービス設定（DBに保存）
 */
export interface ServiceConfig {
  id: string
  user_id: string
  service_class: string
  config?: Record<string, any>
  is_enabled: boolean
  created_at: string
  updated_at: string
}

/**
 * サービス設定作成入力
 */
export interface CreateServiceConfigInput {
  service_class: string
  config?: Record<string, any>
  auth?: Record<string, any>
}

/**
 * サービス設定更新入力
 */
export interface UpdateServiceConfigInput {
  config?: Record<string, any>
  auth?: Record<string, any>
  is_enabled?: boolean
}

/**
 * AI Agentとサービスの紐付け
 */
export interface AIAgentService {
  id: string
  ai_agent_id: string
  service_class: string
  tool_selection_mode: ToolSelectionMode
  selected_tools: string[]
  enabled: boolean
  created_at: string
}

/**
 * AI Agentサービス紐付け作成入力
 */
export interface CreateAIAgentServiceInput {
  service_class: string
  tool_selection_mode?: ToolSelectionMode
  selected_tools?: string[]
  enabled?: boolean
}

/**
 * AI Agentサービス紐付け更新入力
 */
export interface UpdateAIAgentServiceInput {
  tool_selection_mode?: ToolSelectionMode
  selected_tools?: string[]
  enabled?: boolean
}

/**
 * サービスとツールの組み合わせ（UI表示用）
 */
export interface ServiceWithTools {
  service: Service
  tools: Tool[]
}

/**
 * ユーザーが設定したサービス（UI表示用）
 */
export interface UserServiceWithDetails {
  config: ServiceConfig
  service: Service
  tools: Tool[]
}













