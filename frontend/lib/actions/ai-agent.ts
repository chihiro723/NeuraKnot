'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { AIAgent, UpdateAgentInput, AgentService, CreateAIAgentServiceInput, UpdateAIAgentServiceInput, AgentServicesResponse } from '@/lib/types/ai-agent'

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
  
  // サービス設定
  services?: Array<{
    service_class: string
    tool_selection_mode: 'all' | 'selected'
    selected_tools?: string[]
  }>
}) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/ai-agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${accessToken}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create agent' }))
      return { success: false, error: error.message || error.error || 'AI Agentの作成に失敗しました' }
    }

    const agent = await response.json()
    
    // AI Agent一覧を再検証
    revalidatePath('/dashboard')
    
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

/**
 * AI Agent更新
 */
export async function updateAgent(agentId: string, data: UpdateAgentInput) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/ai-agents/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${accessToken}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update agent' }))
      return { success: false, error: error.message || error.error || 'AI Agentの更新に失敗しました' }
    }

    const agent = await response.json()
    
    // AI Agent一覧を再検証
    revalidatePath('/dashboard')
    
    return { success: true, data: agent }
  } catch (error) {
    console.error('Update agent error:', error)
    return { success: false, error: 'AI Agentの更新に失敗しました' }
  }
}

/**
 * AI Agentのサービス一覧取得
 */
export async function getAgentServices(agentId: string) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/ai-agents/${agentId}/services`, {
      headers: {
        'Cookie': `access_token=${accessToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch agent services' }))
      return { success: false, error: error.message || error.error || 'AI Agentサービスの取得に失敗しました' }
    }

    const data: AgentServicesResponse = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get agent services error:', error)
    return { success: false, error: 'AI Agentサービスの取得に失敗しました' }
  }
}

/**
 * AI Agentにサービスを追加
 */
export async function addAgentService(agentId: string, data: CreateAIAgentServiceInput) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/ai-agents/${agentId}/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${accessToken}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to add agent service' }))
      return { success: false, error: error.message || error.error || 'AI Agentサービスの追加に失敗しました' }
    }

    const service = await response.json()
    
    // AI Agent一覧を再検証
    revalidatePath('/dashboard')
    
    return { success: true, data: service }
  } catch (error) {
    console.error('Add agent service error:', error)
    return { success: false, error: 'AI Agentサービスの追加に失敗しました' }
  }
}

/**
 * AI Agentのサービス設定を更新
 */
export async function updateAgentService(agentId: string, serviceId: string, data: UpdateAIAgentServiceInput) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/ai-agents/${agentId}/services/${serviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${accessToken}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update agent service' }))
      return { success: false, error: error.message || error.error || 'AI Agentサービスの更新に失敗しました' }
    }

    const service = await response.json()
    
    // AI Agent一覧を再検証
    revalidatePath('/dashboard')
    
    return { success: true, data: service }
  } catch (error) {
    console.error('Update agent service error:', error)
    return { success: false, error: 'AI Agentサービスの更新に失敗しました' }
  }
}

/**
 * AI Agentのサービスを削除
 */
export async function deleteAgentService(agentId: string, serviceId: string) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/ai-agents/${agentId}/services/${serviceId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': `access_token=${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete agent service' }))
      return { success: false, error: error.message || error.error || 'AI Agentサービスの削除に失敗しました' }
    }

    // AI Agent一覧を再検証
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error) {
    console.error('Delete agent service error:', error)
    return { success: false, error: 'AI Agentサービスの削除に失敗しました' }
  }
}

