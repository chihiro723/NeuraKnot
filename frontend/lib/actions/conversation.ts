'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { StreamEvent } from '@/lib/types'

// サーバーサイド用（Server Actions用）
const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

/**
 * 会話一覧を取得
 */
export async function listConversations() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized', data: { conversations: [], total: 0 } }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/conversations`, {
      headers: {
        'Cookie': `access_token=${accessToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch conversations' }))
      return { success: false, error: error.message || error.error || '会話一覧の取得に失敗しました', data: { conversations: [], total: 0 } }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('List conversations error:', error)
    return { success: false, error: '会話一覧の取得に失敗しました', data: { conversations: [], total: 0 } }
  }
}

/**
 * 会話を取得または作成
 */
export async function getOrCreateConversation(aiAgentId: string) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${accessToken}`,
      },
      body: JSON.stringify({ ai_agent_id: aiAgentId }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get or create conversation' }))
      return { success: false, error: error.message || error.error || '会話の作成に失敗しました' }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get or create conversation error:', error)
    return { success: false, error: '会話の作成に失敗しました' }
  }
}

/**
 * 会話のメッセージ一覧を取得
 */
export async function getMessages(conversationId: string, limit: number = 50) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized', data: { messages: [] } }
    }

    const response = await fetch(
      `${BACKEND_GO_URL}/api/v1/conversations/${conversationId}/messages?limit=${limit}`,
      {
        headers: {
          'Cookie': `access_token=${accessToken}`,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch messages' }))
      return { success: false, error: error.message || error.error || 'メッセージの取得に失敗しました', data: { messages: [] } }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get messages error:', error)
    return { success: false, error: 'メッセージの取得に失敗しました', data: { messages: [] } }
  }
}

/**
 * メッセージを送信
 */
export async function sendMessage(conversationId: string, content: string) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(
      `${BACKEND_GO_URL}/api/v1/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${accessToken}`,
        },
        body: JSON.stringify({ content }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to send message' }))
      return { success: false, error: error.message || error.error || 'メッセージの送信に失敗しました' }
    }

    const data = await response.json()

    // チャット一覧を再検証（メッセージ送信後に並び順を更新）
    revalidatePath('/dashboard/chats')

    return { success: true, data }
  } catch (error) {
    console.error('Send message error:', error)
    return { success: false, error: 'メッセージの送信に失敗しました' }
  }
}

/**
 * ストリーミングでメッセージを送信
 * クライアントコンポーネントから呼び出される
 */
export async function sendMessageStream(
  conversationId: string,
  content: string,
  accessToken: string,
  onEvent: (event: StreamEvent) => void,
  onError: (error: string) => void
) {
  try {
    const response = await fetch(
      `${BACKEND_GO_URL}/api/v1/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${accessToken}`,
        },
        body: JSON.stringify({ content }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to send message' }))
      const errorMsg = `[${response.status}] ${error.message || error.error || 'ストリーミングメッセージの送信に失敗しました'}`
      console.error('Stream request failed:', errorMsg)
      onError(errorMsg)
      return
    }

    // レスポンスのContent-Typeを確認
    const contentType = response.headers.get('content-type')
    console.log('Response Content-Type:', contentType)

    // SSEストリームを読み込み
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      onError('レスポンスの読み込みに失敗しました')
      return
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6)
          if (data.trim()) {
            try {
              const event = JSON.parse(data)
              onEvent(event)

              // エラーまたは完了イベントで終了
              if (event.type === 'error' || event.type === 'done') {
                return
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Send message stream error:', error)
    onError('ストリーミングメッセージの送信に失敗しました')
  }
}

