'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type {
  LLMModel,
  LLMModelsResponse,
  LLMProviderModels,
  LLMPricing,
  LLMPricingListResponse,
} from '@/lib/types/llm-model'

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

export async function listLLMModels(provider?: string, enabledOnly: boolean = true): Promise<LLMModelsResponse> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  if (!accessToken) {
    throw new Error('Unauthorized')
  }

  const params = new URLSearchParams()
  if (provider) {
    params.set('provider', provider)
  }
  params.set('enabled', enabledOnly ? 'true' : 'false')

  const response = await fetch(`${BACKEND_GO_URL}/api/v1/llm-models?${params.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      Cookie: `access_token=${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`LLMモデル一覧の取得に失敗しました: ${response.status}`)
  }

  return response.json()
}

export async function listLLMProviderModels(enabledOnly: boolean = true): Promise<LLMProviderModels[]> {
  const data = await listLLMModels(undefined, enabledOnly)
  const grouped = new Map<string, LLMProviderModels>()

  for (const model of data.models) {
    const existing = grouped.get(model.provider)
    if (existing) {
      existing.models.push(model)
    } else {
      grouped.set(model.provider, {
        provider: model.provider,
        models: [model],
      })
    }
  }

  return Array.from(grouped.values())
}

export async function updateLLMModelEnabled(modelID: string, isEnabled: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/admin/llm-models/${modelID}/enabled`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken}`,
      },
      body: JSON.stringify({ is_enabled: isEnabled }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        success: false,
        error: error.error || error.message || `更新に失敗しました: ${response.status}`,
      }
    }

    revalidatePath('/dashboard/admin/llm-models')
    revalidatePath('/dashboard/add/ai')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LLMモデル状態の更新に失敗しました'
    return { success: false, error: message }
  }
}

interface UpdateLLMModelInput {
  provider: string
  model: string
  display_name: string
  temperature_min: number
  temperature_max: number
  max_tokens_min: number
  max_tokens_max: number
  supports_streaming: boolean
}

export async function updateLLMModel(
  modelID: string,
  input: UpdateLLMModelInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/admin/llm-models/${modelID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken}`,
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        success: false,
        error: error.error || error.message || `編集に失敗しました: ${response.status}`,
      }
    }

    revalidatePath('/dashboard/admin/llm-models')
    revalidatePath('/dashboard/add/ai')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LLMモデルの編集に失敗しました'
    return { success: false, error: message }
  }
}

export async function deleteLLMModel(modelID: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/admin/llm-models/${modelID}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        success: false,
        error: error.error || error.message || `削除に失敗しました: ${response.status}`,
      }
    }

    revalidatePath('/dashboard/admin/llm-models')
    revalidatePath('/dashboard/add/ai')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LLMモデル削除に失敗しました'
    return { success: false, error: message }
  }
}

interface CreateLLMModelInput {
  provider: string
  model: string
  display_name: string
  is_enabled?: boolean
  temperature_min?: number
  temperature_max?: number
  max_tokens_min?: number
  max_tokens_max?: number
  supports_streaming?: boolean
  metadata?: Record<string, unknown>
  // 任意: モデル作成と同時に初回単価を登録する（両方指定された場合のみ）
  initial_prompt_cost_per_1m?: number
  initial_completion_cost_per_1m?: number
}

export async function createLLMModel(input: CreateLLMModelInput): Promise<{ success: boolean; data?: LLMModel; error?: string }> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/admin/llm-models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken}`,
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        success: false,
        error: error.error || error.message || `作成に失敗しました: ${response.status}`,
      }
    }

    const data: LLMModel = await response.json()
    revalidatePath('/dashboard/admin/llm-models')
    revalidatePath('/dashboard/add/ai')
    return { success: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LLMモデル作成に失敗しました'
    return { success: false, error: message }
  }
}

export async function listLLMPricing(): Promise<LLMPricingListResponse> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  if (!accessToken) {
    throw new Error('Unauthorized')
  }

  const response = await fetch(`${BACKEND_GO_URL}/api/v1/llm-pricing`, {
    headers: {
      'Content-Type': 'application/json',
      Cookie: `access_token=${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`LLM単価一覧の取得に失敗しました: ${response.status}`)
  }

  return response.json()
}

interface CreateLLMPricingInput {
  provider: string
  model: string
  prompt_cost_per_1m: number
  completion_cost_per_1m: number
  notes?: string
}

export async function createLLMPricing(
  input: CreateLLMPricingInput,
): Promise<{ success: boolean; data?: LLMPricing; error?: string }> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/admin/llm-pricing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken}`,
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        success: false,
        error: error.error || error.message || `単価登録に失敗しました: ${response.status}`,
      }
    }

    const data: LLMPricing = await response.json()
    revalidatePath('/dashboard/admin/llm-models')
    return { success: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LLM単価の登録に失敗しました'
    return { success: false, error: message }
  }
}

interface ReviseLLMPricingInput {
  prompt_cost_per_1m: number
  completion_cost_per_1m: number
  effective_from?: string
  notes?: string
}

export async function reviseLLMPricing(
  pricingID: string,
  input: ReviseLLMPricingInput,
): Promise<{ success: boolean; data?: LLMPricing; error?: string }> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return { success: false, error: 'Unauthorized' }
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/admin/llm-pricing/${pricingID}/revise`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken}`,
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        success: false,
        error: error.error || error.message || `単価改定に失敗しました: ${response.status}`,
      }
    }

    const data: LLMPricing = await response.json()
    revalidatePath('/dashboard/admin/llm-models')
    return { success: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LLM単価の改定に失敗しました'
    return { success: false, error: message }
  }
}
