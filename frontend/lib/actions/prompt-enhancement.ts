'use server'

import { cookies } from 'next/headers'

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

export async function enhanceSystemPrompt(
  currentPrompt: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    
    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const response = await fetch(`${BACKEND_GO_URL}/api/v1/prompts/enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${accessToken}`,
      },
      body: JSON.stringify({
        current_prompt: currentPrompt,
      }),
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized' }
      }
      const error = await response.json().catch(() => ({}))
      return { success: false, error: error.error || 'プロンプト生成に失敗しました' }
    }
    
    const data = await response.json()
    return { success: true, data: data.enhanced_prompt }
  } catch (error) {
    console.error('Error enhancing prompt:', error)
    return { success: false, error: 'プロンプト生成に失敗しました' }
  }
}

