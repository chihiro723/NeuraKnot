'use server'

import { cookies } from 'next/headers'

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

/**
 * AIエージェントの自己紹介メッセージを生成
 * エージェント作成後にバックグラウンドで実行される
 */
export async function generateAgentIntroduction(
  agentId: string,
  agentData: {
    name: string
    persona_type: string
    description?: string
  },
  selectedServices: Array<{
    service_class: string
    tool_selection_mode: 'all' | 'selected'
    selected_tools: string[]
  }>
) {
  const maxRetries = 3
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      // 1. サービス・ツール情報を整形
      const toolsInfo = formatToolsForIntroduction(selectedServices)
      
      // 2. 友達感のある自己紹介メッセージを作成
      const introMessage = createFriendlyIntroMessage(agentData, toolsInfo)
      
      // 3. AIエージェントが自己紹介メッセージを送信
      const result = await sendAgentIntroduction(agentId, introMessage)
      
      if (!result.success) {
        // 認証エラーの場合はリトライしない
        if (result.error?.includes('Unauthorized') || result.error?.includes('401')) {
          console.error(`[AGENT INTRODUCTION] Authentication error, skipping retry: ${result.error}`)
          return
        }
        throw new Error(`Failed to send agent introduction: ${result.error}`)
      }

      return // 成功したら終了
    } catch (error) {
      retryCount++
      console.error(`[AGENT INTRODUCTION] Attempt ${retryCount} failed for agent ${agentId}:`, error)
      
      // 認証エラーの場合はリトライしない
      if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('401'))) {
        console.error(`[AGENT INTRODUCTION] Authentication error, skipping retry: ${error.message}`)
        return
      }
      
      if (retryCount >= maxRetries) {
        console.error(`[AGENT INTRODUCTION] All ${maxRetries} attempts failed for agent ${agentId}`)
        return
      }
      
      // リトライ前に少し待機
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
    }
  }
}

/**
 * AIエージェントが自己紹介メッセージを送信
 */
async function sendAgentIntroduction(agentId: string, message: string) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/conversations/agent-introduction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${accessToken}`,
      },
      body: JSON.stringify({
        ai_agent_id: agentId,
        message: message,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to send agent introduction' }))
      return { success: false, error: error.message || error.error || 'AIエージェント自己紹介の送信に失敗しました' }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Send agent introduction error:', error)
    return { success: false, error: 'AIエージェント自己紹介の送信に失敗しました' }
  }
}

/**
 * 選択されたサービス・ツール情報を友達らしい説明に変換
 */
function formatToolsForIntroduction(services: Array<{
  service_class: string
  tool_selection_mode: 'all' | 'selected'
  selected_tools: string[]
}>): string {
  if (services.length === 0) {
    return '基本的な会話や質問への回答'
  }

  const toolDescriptions = services.map(service => {
    const serviceName = getServiceDisplayName(service.service_class)
    if (service.tool_selection_mode === 'all') {
      return `${serviceName}の全機能`
    } else if (service.selected_tools.length > 0) {
      return `${serviceName}の${service.selected_tools.join('、')}`
    }
    return serviceName
  })

  return toolDescriptions.join('、') + 'など'
}

/**
 * サービスクラス名を日本語の表示名に変換
 */
function getServiceDisplayName(serviceClass: string): string {
  const serviceNames: Record<string, string> = {
    'DataService': 'データ管理',
    'DateTimeService': '日時・スケジュール',
    'WebSearchService': 'Web検索',
    'NotionService': 'Notion',
    'SlackService': 'Slack',
    'GoogleCalendarService': 'Googleカレンダー',
    'ExchangeRateService': '為替レート',
    'BraveSearchService': '検索'
  }
  return serviceNames[serviceClass] || serviceClass
}

/**
 * 友達感のある自己紹介メッセージを作成
 */
function createFriendlyIntroMessage(
  agentData: {
    name: string
    persona_type: string
    description?: string
  }, 
  toolsInfo: string
): string {
  // ペルソナタイプに応じた挨拶を生成
  const personaGreetings: Record<string, string> = {
    'assistant': 'こんにちは！',
    'creative': 'やあ！',
    'analytical': 'こんにちは。',
    'concise': 'こんにちは。',
    'support': 'こんにちは！',
    'friendly': 'やあ！',
    'business': 'こんにちは。',
    'casual': 'やあ！',
    'humor': 'やあ！'
  }

  const greeting = personaGreetings[agentData.persona_type] || 'こんにちは！'
  
  // ペルソナタイプに応じた自己紹介文を生成
  const personaIntros: Record<string, string> = {
    'assistant': `${agentData.name}です。よろしくお願いします！`,
    'creative': `${agentData.name}だよ！一緒に楽しいことを考えよう！`,
    'analytical': `${agentData.name}です。論理的にサポートします。`,
    'concise': `${agentData.name}です。`,
    'support': `${agentData.name}です。何でもお手伝いします！`,
    'friendly': `${agentData.name}だよ！よろしくね！`,
    'business': `${agentData.name}です。ビジネスをサポートします。`,
    'casual': `${agentData.name}だよ！気軽に話しかけてね！`,
    'humor': `${agentData.name}だよ！一緒に笑いながら楽しくやろう！`
  }

  const intro = personaIntros[agentData.persona_type] || `${agentData.name}です。よろしくお願いします！`
  
  // 機能説明を追加
  const capabilityText = toolsInfo !== '基本的な会話や質問への回答' 
    ? ` ${toolsInfo}など、色々サポートできるよ！` 
    : ' 基本的な会話や質問への回答ができるよ！'

  return `${greeting}${intro}${capabilityText}`
}
