'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

/**
 * AI Agent作成
 */
export async function createAgent(data: {
  // 基本情報
  name: string
  description?: string
  avatar_url?: string
  
  // ペルソナ設定
  persona_type: string
  system_prompt?: string
  
  // LLM設定
  provider: string
  model: string
  temperature: number
  max_tokens: number
  
  // 機能設定
  tools_enabled: boolean
  streaming_enabled: boolean
  
  // MCP設定
  mcp_servers?: Array<{
    mcp_server_id: string
    tool_selection_mode: 'all' | 'selected'
    selected_tool_ids?: string[]
  }>
}) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    console.log('[CREATE AGENT] Access token found:', !!accessToken)

    if (!accessToken) {
      console.log('[CREATE AGENT] No access token')
      return { success: false, error: 'Unauthorized' }
    }

    console.log('[CREATE AGENT] Sending request to backend-go:', `${BACKEND_GO_URL}/api/v1/ai-agents`)

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/ai-agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${accessToken}`,
      },
      body: JSON.stringify(data),
    })

    console.log('[CREATE AGENT] Response status:', response.status)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create agent' }))
      console.log('[CREATE AGENT] Error from backend:', error)
      return { success: false, error: error.message || error.error || 'AI Agentの作成に失敗しました' }
    }

    const agent = await response.json()
    console.log('[CREATE AGENT] Success, agent created:', agent)
    
    // AI Agent一覧を再検証
    revalidatePath('/dashboard')
    
    console.log('[CREATE AGENT] Returning success response')
    return { success: true, data: agent }
  } catch (error) {
    console.error('[CREATE AGENT] Caught error:', error)
    return { success: false, error: 'AI Agentの作成に失敗しました' }
  }
}

/**
 * AI Agent一覧取得
 */
export async function listAIAgents() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized', data: { agents: [] } }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/ai-agents`, {
      headers: {
        'Cookie': `access_token=${accessToken}`,
      },
      cache: 'no-store', // 常に最新のデータを取得
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch agents' }))
      return { success: false, error: error.message || error.error || 'AI Agentsの取得に失敗しました', data: { agents: [] } }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get agents error:', error)
    return { success: false, error: 'AI Agentsの取得に失敗しました', data: { agents: [] } }
  }
}

/**
 * AI Agent詳細取得
 */
export async function getAgent(agentId: string) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/ai-agents/${agentId}`, {
      headers: {
        'Cookie': `access_token=${accessToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch agent' }))
      return { success: false, error: error.message || error.error || 'AI Agentの取得に失敗しました' }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get agent error:', error)
    return { success: false, error: 'AI Agentの取得に失敗しました' }
  }
}

