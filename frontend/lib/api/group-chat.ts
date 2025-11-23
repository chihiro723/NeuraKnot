import { getCookie } from '@/lib/utils/cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export interface GroupMember {
  id: string;
  group_chat_id: string;
  ai_agent_id: string;
  ai_agent_name: string;
  ai_agent_icon?: string;
  ai_agent_model: string;
  display_order: number;
  joined_at: string;
}

export interface GroupChat {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon_url?: string;
  system_prompt?: string;
  created_at: string;
  updated_at: string;
  members: GroupMember[];
  message_count?: number;
  last_message_at?: string;
  last_message?: {
    content: string;
    sender_type: string;
    sender_name: string;
  };
}

export interface ToolUsage {
  id: string;
  tool_name: string;
  tool_category: string;
  input_data: any;
  output_data?: string;
  status: string;
  error_message?: string;
  execution_time_ms?: number;
  insert_position?: number;
  executed_at: string;
}

export interface GroupMessage {
  id: string;
  group_chat_id: string;
  sender_type: 'user' | 'ai';
  sender_id: string;
  sender_name: string;
  sender_icon?: string;
  content: string;
  processing_status: string;
  created_at: string;
  updated_at?: string;
  tool_usages?: ToolUsage[];
}

export interface MentionInput {
  ai_agent_id: string;
  order: number;
}

export interface StreamEvent {
  event: string;
  data: any;
}

/**
 * グループチャット詳細を取得
 */
export async function getGroupChat(groupChatId: string): Promise<GroupChat> {
  const token = getCookie('access_token') || localStorage.getItem('access_token');
  if (!token) throw new Error('認証が必要です');

  const response = await fetch(`${API_BASE_URL}/group-chats/${groupChatId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('グループチャットの取得に失敗しました');
  }

  return response.json();
}

/**
 * メッセージ履歴を取得
 */
export async function getMessages(groupChatId: string, limit: number = 50): Promise<{ messages: GroupMessage[] }> {
  const token = getCookie('access_token') || localStorage.getItem('access_token');
  if (!token) throw new Error('認証が必要です');

  const response = await fetch(`${API_BASE_URL}/group-chats/${groupChatId}/messages?limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('メッセージの取得に失敗しました');
  }

  return response.json();
}

/**
 * メッセージを送信（ストリーミング）
 */
export async function sendMessageStream(
  groupChatId: string,
  payload: { content: string; mentions: 'all' | MentionInput[] },
  onEvent: (event: StreamEvent) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<() => void> {
  // 一対一チャットと同じパターン: LocalStorageをフォールバックとして使用
  const token = getCookie('access_token') || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);

  if (!token) {
    console.error('[sendMessageStream] No access token found in cookie or localStorage');
    onError(new Error('認証が必要です'));
    return () => {};
  }

  const controller = new AbortController();

  fetch(`${API_BASE_URL}/group-chats/${groupChatId}/messages/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'メッセージの送信に失敗しました');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ストリームの読み取りに失敗しました');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) {
            // 空行でイベントリセット
            currentEvent = '';
            continue;
          }

          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.slice(6));
              onEvent({
                event: currentEvent,
                data: jsonData,
              });
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      onComplete();
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });

  return () => controller.abort();
}

/**
 * メッセージ処理をキャンセル
 */
export async function cancelMessage(groupChatId: string, messageId: string): Promise<void> {
  const token = getCookie('access_token');
  if (!token) throw new Error('認証が必要です');

  const response = await fetch(
    `${API_BASE_URL}/group-chats/${groupChatId}/messages/${messageId}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('キャンセルに失敗しました');
  }
}

/**
 * グループチャット情報を更新
 */
export async function updateGroupChat(
  groupChatId: string,
  data: {
    name?: string;
    description?: string;
    icon_url?: string;
    system_prompt?: string;
  }
): Promise<GroupChat> {
  const token = getCookie('access_token') || localStorage.getItem('access_token');
  if (!token) throw new Error('認証が必要です');

  const response = await fetch(`${API_BASE_URL}/group-chats/${groupChatId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'グループチャットの更新に失敗しました' }));
    throw new Error(error.error || 'グループチャットの更新に失敗しました');
  }

  return response.json();
}

/**
 * グループチャットを削除
 */
export async function deleteGroupChat(groupChatId: string): Promise<void> {
  const token = getCookie('access_token') || localStorage.getItem('access_token');
  if (!token) throw new Error('認証が必要です');

  const response = await fetch(`${API_BASE_URL}/group-chats/${groupChatId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'グループチャットの削除に失敗しました' }));
    throw new Error(error.error || 'グループチャットの削除に失敗しました');
  }
}

/**
 * メンバーを追加
 */
export async function addMember(
  groupChatId: string,
  aiAgentId: string
): Promise<void> {
  const token = getCookie('access_token') || localStorage.getItem('access_token');
  if (!token) throw new Error('認証が必要です');

  const response = await fetch(
    `${API_BASE_URL}/group-chats/${groupChatId}/members`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ai_agent_id: aiAgentId }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'メンバーの追加に失敗しました' }));
    throw new Error(error.error || 'メンバーの追加に失敗しました');
  }
}

/**
 * メンバーを削除
 */
export async function removeMember(
  groupChatId: string,
  memberId: string
): Promise<void> {
  const token = getCookie('access_token') || localStorage.getItem('access_token');
  if (!token) throw new Error('認証が必要です');

  const response = await fetch(
    `${API_BASE_URL}/group-chats/${groupChatId}/members/${memberId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'メンバーの削除に失敗しました' }));
    throw new Error(error.error || 'メンバーの削除に失敗しました');
  }
}

/**
 * メンバーの並び順を変更
 */
export async function reorderMembers(
  groupChatId: string,
  orderData: Array<{ member_id: string; display_order: number }>
): Promise<void> {
  const token = getCookie('access_token') || localStorage.getItem('access_token');
  if (!token) throw new Error('認証が必要です');

  // 配列形式からオブジェクト形式に変換 { memberId: order }
  const orders: Record<string, number> = {};
  orderData.forEach((item) => {
    orders[item.member_id] = item.display_order;
  });

  const response = await fetch(
    `${API_BASE_URL}/group-chats/${groupChatId}/members/reorder`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orders }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'メンバーの並び替えに失敗しました' }));
    throw new Error(error.error || 'メンバーの並び替えに失敗しました');
  }
}

/**
 * 質問候補を生成（グループチャット）
 */
export async function generateSuggestedQuestions(
  groupChatId: string,
  recentMessageLimit: number = 10
): Promise<{ suggestions: string[] }> {
  const token = getCookie('access_token') || localStorage.getItem('access_token');
  if (!token) throw new Error('認証が必要です');

  const response = await fetch(
    `${API_BASE_URL}/group-chats/${groupChatId}/suggested-questions?limit=${recentMessageLimit}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: '質問候補の生成に失敗しました'
    }));
    throw new Error(error.error || '質問候補の生成に失敗しました');
  }

  return response.json();
}
