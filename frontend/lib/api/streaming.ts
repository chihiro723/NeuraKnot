/**
 * クライアントサイドストリーミングAPI
 * クライアントコンポーネントから直接呼び出される
 */

import type { StreamEvent } from '@/lib/types'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:8080'

/**
 * ストリーミングでメッセージを送信
 */
export async function sendMessageStream(
  conversationId: string,
  content: string,
  accessToken: string | null,
  onEvent: (event: StreamEvent) => void,
  onError: (error: string) => void
) {
  try {
    // LocalStorageからトークンを取得（引数で渡されない場合のフォールバック）
    const token = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // アクセストークンがあればAuthorizationヘッダーに設定
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${BACKEND_URL}/api/v1/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers,
        credentials: 'include', // Cookieも含める（フォールバック用）
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

    // ストリーミングレスポンスの場合
    if (contentType?.includes('text/event-stream')) {
      // SSEストリームを読み込み
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        onError('レスポンスの読み込みに失敗しました')
        return
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')

        // 最後の行が不完全な可能性があるので保持
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6)
            if (data.trim()) {
              try {
                const event = JSON.parse(data)
                console.log('🔄 SSE Event received:', event)
                onEvent(event)

                // エラーまたは完了イベントで終了
                if (event.type === 'error' || event.type === 'done') {
                  console.log('🏁 Stream ended with type:', event.type)
                  return
                }
              } catch (e) {
                console.error('Failed to parse SSE event:', e, 'data:', data)
              }
            }
          }
        }
      }
    } else {
      // 通常のJSONレスポンス（非ストリーミング）の場合
      const data = await response.json()

      // ユーザーメッセージイベント
      onEvent({
        type: 'token',
        content: data.user_message.content
      })

      // AIメッセージイベント（一括）
      onEvent({
        type: 'token',
        content: data.ai_message.content
      })

      // 完了イベント
      onEvent({
        type: 'done'
      })
    }
  } catch (error) {
    console.error('Send message stream error:', error)
    onError('ストリーミングメッセージの送信に失敗しました: ' + (error instanceof Error ? error.message : String(error)))
  }
}

/**
 * グループチャットでストリーミングメッセージを送信
 */
export async function sendGroupChatMessageStream(
  groupChatId: string,
  content: string,
  accessToken: string | null,
  onEvent: (event: StreamEvent) => void,
  onError: (error: string) => void,
  mentionedAgentIds?: string[]
) {
  try {
    const token = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${BACKEND_URL}/api/v1/group-chats/${groupChatId}/messages/stream`,
      {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          content,
          mentions: mentionedAgentIds && mentionedAgentIds.length > 0
            ? mentionedAgentIds.map((id, index) => ({
                ai_agent_id: id,
                order: index + 1
              }))
            : "all"
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to send message' }))
      const errorMsg = `[${response.status}] ${error.message || error.error || 'グループメッセージの送信に失敗しました'}`
      console.error('Group chat stream request failed:', errorMsg)
      onError(errorMsg)
      return
    }

    // SSEストリームを読み込み
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      onError('レスポンスの読み込みに失敗しました')
      return
    }

    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          // イベント名を取得（次の行のdataと組み合わせる）
          continue
        }
        if (line.startsWith('data: ')) {
          const data = line.substring(6)
          if (data.trim()) {
            try {
              const event = JSON.parse(data)
              console.log('🔄 Group Chat SSE Event:', event)
              onEvent(event)

              if (event.event === 'error' || event.event === 'complete') {
                console.log('🏁 Group chat stream ended with event:', event.event)
                return
              }
            } catch (e) {
              console.error('Failed to parse group chat SSE event:', e, 'data:', data)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Send group chat message stream error:', error)
    onError('グループチャットメッセージの送信に失敗しました: ' + (error instanceof Error ? error.message : String(error)))
  }
}
