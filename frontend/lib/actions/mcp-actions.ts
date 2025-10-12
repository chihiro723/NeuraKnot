'use server'

/**
 * MCP Server Actions
 * MCPサーバーとツールの管理
 */

import { getAccessToken } from '@/lib/auth/server'
import type {
  MCPServer,
  RegisterMCPServerInput,
  UpdateMCPServerInput,
  MCPTool,
  ToolCatalogResponse,
} from '@/lib/types/mcp'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/**
 * MCPサーバー一覧を取得
 */
export async function listMCPServers(): Promise<{
  success: boolean
  servers?: MCPServer[]
  error?: string
}> {
  try {
    const token = await getAccessToken()
    if (!token) {
      return { success: false, error: '認証が必要です' }
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/mcp-servers`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'サーバー一覧の取得に失敗しました' }
    }

    const servers = await response.json()
    return { success: true, servers }
  } catch (error) {
    console.error('listMCPServers error:', error)
    return { success: false, error: 'サーバー一覧の取得中にエラーが発生しました' }
  }
}

/**
 * MCPサーバーを登録
 */
export async function createMCPServer(
  data: RegisterMCPServerInput
): Promise<{
  success: boolean
  server?: MCPServer
  error?: string
}> {
  try {
    const token = await getAccessToken()
    if (!token) {
      return { success: false, error: '認証が必要です' }
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/mcp-servers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'サーバーの登録に失敗しました' }
    }

    const server = await response.json()
    return { success: true, server }
  } catch (error) {
    console.error('createMCPServer error:', error)
    return { success: false, error: 'サーバーの登録中にエラーが発生しました' }
  }
}

/**
 * MCPサーバーを更新
 */
export async function updateMCPServer(
  serverId: string,
  data: UpdateMCPServerInput
): Promise<{
  success: boolean
  server?: MCPServer
  error?: string
}> {
  try {
    const token = await getAccessToken()
    if (!token) {
      return { success: false, error: '認証が必要です' }
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/mcp-servers/${serverId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'サーバーの更新に失敗しました' }
    }

    const server = await response.json()
    return { success: true, server }
  } catch (error) {
    console.error('updateMCPServer error:', error)
    return { success: false, error: 'サーバーの更新中にエラーが発生しました' }
  }
}

/**
 * MCPサーバーを削除
 */
export async function deleteMCPServer(serverId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const token = await getAccessToken()
    if (!token) {
      return { success: false, error: '認証が必要です' }
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/mcp-servers/${serverId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'サーバーの削除に失敗しました' }
    }

    return { success: true }
  } catch (error) {
    console.error('deleteMCPServer error:', error)
    return { success: false, error: 'サーバーの削除中にエラーが発生しました' }
  }
}

/**
 * MCPサーバーのツール一覧を取得
 */
export async function listMCPTools(serverId: string): Promise<{
  success: boolean
  tools?: MCPTool[]
  error?: string
}> {
  try {
    const token = await getAccessToken()
    if (!token) {
      return { success: false, error: '認証が必要です' }
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/mcp-servers/${serverId}/tools`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'ツール一覧の取得に失敗しました' }
    }

    const tools = await response.json()
    return { success: true, tools }
  } catch (error) {
    console.error('listMCPTools error:', error)
    return { success: false, error: 'ツール一覧の取得中にエラーが発生しました' }
  }
}

/**
 * MCPサーバーのツールカタログを同期
 */
export async function syncMCPTools(serverId: string): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const token = await getAccessToken()
    if (!token) {
      return { success: false, error: '認証が必要です' }
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/mcp-servers/${serverId}/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'ツールカタログの同期に失敗しました' }
    }

    const result = await response.json()
    return { success: true, message: result.message }
  } catch (error) {
    console.error('syncMCPTools error:', error)
    return { success: false, error: 'ツールカタログの同期中にエラーが発生しました' }
  }
}

/**
 * ツールを検索
 */
export async function searchTools(params: {
  category?: string
  tags?: string[]
  query?: string
}): Promise<{
  success: boolean
  tools?: MCPTool[]
  error?: string
}> {
  try {
    const token = await getAccessToken()
    if (!token) {
      return { success: false, error: '認証が必要です' }
    }

    const searchParams = new URLSearchParams()
    if (params.category) searchParams.append('category', params.category)
    if (params.tags) params.tags.forEach(tag => searchParams.append('tags', tag))
    if (params.query) searchParams.append('q', params.query)

    const response = await fetch(
      `${API_BASE_URL}/api/v1/mcp-tools/search?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'ツールの検索に失敗しました' }
    }

    const tools = await response.json()
    return { success: true, tools }
  } catch (error) {
    console.error('searchTools error:', error)
    return { success: false, error: 'ツールの検索中にエラーが発生しました' }
  }
}

