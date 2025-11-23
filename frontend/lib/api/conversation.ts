import { getCookie } from '@/lib/utils/cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

/**
 * 質問候補を生成（1対1会話）
 */
export async function generateConversationSuggestedQuestions(
  conversationId: string,
  recentMessageLimit: number = 10
): Promise<{ suggestions: string[] }> {
  const token = getCookie('access_token') || localStorage.getItem('access_token');
  if (!token) throw new Error('認証が必要です');

  const response = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}/suggested-questions?limit=${recentMessageLimit}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    // より詳細なエラー情報を取得
    const errorText = await response.text();
    console.error('[generateConversationSuggestedQuestions] Error Response:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });

    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.error || errorJson.detail || '質問候補の生成に失敗しました');
    } catch (parseError) {
      throw new Error(`質問候補の生成に失敗しました (Status: ${response.status})`);
    }
  }

  return response.json();
}
