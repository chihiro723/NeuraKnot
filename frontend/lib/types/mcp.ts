/**
 * MCP（Model Context Protocol）関連の型定義
 */

// サーバータイプ
export type MCPServerType = 'built_in' | 'external'

// 認証タイプ
export type MCPAuthType = 'bearer' | 'api_key' | 'custom'

// ツール選択モード
export type ToolSelectionMode = 'all' | 'selected'

/**
 * MCPサーバー
 */
export interface MCPServer {
  id: string
  user_id?: string | null
  name: string
  description?: string
  base_url: string
  server_type: MCPServerType
  requires_auth: boolean
  auth_type?: MCPAuthType
  custom_headers?: Record<string, string>
  enabled: boolean
  last_synced_at?: string
  tools_count: number
  created_at: string
  updated_at: string
  last_used_at?: string
}

/**
 * MCPサーバー登録入力
 */
export interface RegisterMCPServerInput {
  name: string
  description?: string
  base_url: string
  requires_auth: boolean
  auth_type?: MCPAuthType
  api_key?: string  // 平文で送信（バックエンドで暗号化）
  custom_headers?: Record<string, string>
}

/**
 * MCPサーバー更新入力
 */
export interface UpdateMCPServerInput {
  name?: string
  description?: string
  base_url?: string
  requires_auth?: boolean
  auth_type?: MCPAuthType
  api_key?: string
  custom_headers?: Record<string, string>
  enabled?: boolean
}

/**
 * MCPツール
 */
export interface MCPTool {
  id: string
  mcp_server_id: string
  tool_name: string
  tool_description?: string
  input_schema?: Record<string, any>
  category?: string
  tags?: string[]
  enabled: boolean
  usage_count: number
  synced_at: string
  created_at: string
}

/**
 * ツールカテゴリ
 */
export type ToolCategory =
  | 'datetime'
  | 'math'
  | 'text'
  | 'data'
  | 'security'
  | 'utility'
  | 'external'

/**
 * AI AgentのMCPサーバー設定
 */
export interface AgentMCPServerConfig {
  mcp_server_id: string
  tool_selection_mode: ToolSelectionMode
  selected_tool_ids?: string[]  // モードが'selected'の場合のみ使用
}

/**
 * AI Agent作成時のMCP設定
 */
export interface AIAgentMCPInput {
  mcp_servers: AgentMCPServerConfig[]
}

/**
 * MCPサーバーとそのツール一覧
 */
export interface MCPServerWithTools {
  server: MCPServer
  tools: MCPTool[]
}

/**
 * ツール検索フィルター
 */
export interface ToolSearchFilter {
  category?: string
  tags?: string[]
  search_query?: string
}

/**
 * ツールカタログレスポンス
 */
export interface ToolCatalogResponse {
  server: {
    name: string
    version?: string
    description?: string
  }
  tools: Array<{
    name: string
    description?: string
    input_schema?: Record<string, any>
    category?: string
    tags?: string[]
  }>
}

