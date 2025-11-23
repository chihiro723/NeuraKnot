'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

/**
 * グループチャット作成
 */
export async function createGroupChat(data: {
  name: string
  description?: string
  member_ids: string[]
}) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/group-chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${accessToken}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create group chat' }))
      return { success: false, error: error.message || error.error || 'グループチャットの作成に失敗しました' }
    }

    const groupChat = await response.json()

    // チャット一覧を再検証
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/chats')

    return { success: true, data: groupChat }
  } catch (error) {
    console.error('[CREATE GROUP CHAT] Caught error:', error)
    return { success: false, error: 'グループチャットの作成に失敗しました' }
  }
}

/**
 * グループチャット一覧取得
 */
export async function listGroupChats() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized', data: { group_chats: [] } }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/group-chats`, {
      headers: {
        'Cookie': `access_token=${accessToken}`,
      },
      cache: 'no-store', // 常に最新のデータを取得
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch group chats' }))
      return { success: false, error: error.message || error.error || 'グループチャットの取得に失敗しました', data: { group_chats: [] } }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get group chats error:', error)
    return { success: false, error: 'グループチャットの取得に失敗しました', data: { group_chats: [] } }
  }
}

/**
 * グループチャットメッセージ履歴取得
 */
export async function getGroupChatMessages(groupChatId: string, limit: number = 50) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized', data: { messages: [] } }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/group-chats/${groupChatId}/messages?limit=${limit}`, {
      headers: {
        'Cookie': `access_token=${accessToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch messages' }))
      return { success: false, error: error.message || error.error || 'メッセージの取得に失敗しました', data: { messages: [] } }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get group chat messages error:', error)
    return { success: false, error: 'メッセージの取得に失敗しました', data: { messages: [] } }
  }
}

/**
 * グループチャットメッセージ送信（ストリーミング）
 */
export async function sendGroupChatMessage(groupChatId: string, content: string, mentionedAgentIds?: string[]) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/group-chats/${groupChatId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${accessToken}`,
      },
      body: JSON.stringify({
        content,
        mentioned_agent_ids: mentionedAgentIds,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to send message' }))
      return { success: false, error: error.message || error.error || 'メッセージの送信に失敗しました' }
    }

    // ストリーミングレスポンスを返す
    return { success: true, stream: response.body }
  } catch (error) {
    console.error('Send group chat message error:', error)
    return { success: false, error: 'メッセージの送信に失敗しました' }
  }
}
