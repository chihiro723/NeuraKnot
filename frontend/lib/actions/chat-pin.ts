'use server'

import { cookies } from 'next/headers'

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

export type ChatPinType = 'direct' | 'group'

export interface ChatPin {
  id: string
  chatType: ChatPinType
  targetId: string
  pinnedAt: string
}

interface BackendChatPin {
  id: string
  chat_type: ChatPinType
  target_id: string
  pinned_at: string
}

interface ListChatPinsResponse {
  pins: BackendChatPin[]
}

interface ListChatPinsResult {
  success: boolean
  error?: string
  data: { pins: ChatPin[] }
}

interface MutateChatPinResult {
  success: boolean
  error?: string
}

function toChatPin(raw: BackendChatPin): ChatPin {
  return {
    id: raw.id,
    chatType: raw.chat_type,
    targetId: raw.target_id,
    pinnedAt: raw.pinned_at,
  }
}

/**
 * ログインユーザーのピン一覧を取得
 * 並びは pinned_at DESC（新しくピンしたものほど先頭）
 */
export async function listChatPins(): Promise<ListChatPinsResult> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized', data: { pins: [] } }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/chat-pins`, {
      headers: {
        Cookie: `access_token=${accessToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch chat pins' }))
      return {
        success: false,
        error: error.message || error.error || 'ピン一覧の取得に失敗しました',
        data: { pins: [] },
      }
    }

    const raw: ListChatPinsResponse = await response.json()
    return {
      success: true,
      data: { pins: (raw.pins || []).map(toChatPin) },
    }
  } catch (error) {
    console.error('List chat pins error:', error)
    return { success: false, error: 'ピン一覧の取得に失敗しました', data: { pins: [] } }
  }
}

/**
 * チャットをピン留めする（冪等）
 */
export async function pinChat(
  chatType: ChatPinType,
  targetId: string,
): Promise<MutateChatPinResult> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(
      `${BACKEND_GO_URL}/api/v1/chat-pins/${chatType}/${targetId}`,
      {
        method: 'PUT',
        headers: {
          Cookie: `access_token=${accessToken}`,
        },
        cache: 'no-store',
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to pin chat' }))
      return {
        success: false,
        error: error.message || error.error || 'ピン留めに失敗しました',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Pin chat error:', error)
    return { success: false, error: 'ピン留めに失敗しました' }
  }
}

/**
 * チャットのピン留めを解除する（冪等）
 */
export async function unpinChat(
  chatType: ChatPinType,
  targetId: string,
): Promise<MutateChatPinResult> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(
      `${BACKEND_GO_URL}/api/v1/chat-pins/${chatType}/${targetId}`,
      {
        method: 'DELETE',
        headers: {
          Cookie: `access_token=${accessToken}`,
        },
        cache: 'no-store',
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to unpin chat' }))
      return {
        success: false,
        error: error.message || error.error || 'ピン解除に失敗しました',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Unpin chat error:', error)
    return { success: false, error: 'ピン解除に失敗しました' }
  }
}
