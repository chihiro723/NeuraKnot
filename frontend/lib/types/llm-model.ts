export interface LLMPricing {
  id: string
  provider: string
  model: string
  prompt_cost_per_1m: number
  completion_cost_per_1m: number
  effective_from: string
  effective_to: string | null
  is_active: boolean
  notes: string
}

export interface LLMPricingListResponse {
  pricing: LLMPricing[]
  total: number
}

export interface LLMModel {
  id: string
  provider: string
  model: string
  display_name: string
  is_enabled: boolean
  temperature_min: number
  temperature_max: number
  max_tokens_min: number
  max_tokens_max: number
  supports_streaming: boolean
  metadata: Record<string, unknown>
  current_pricing: LLMPricing | null
  created_at: string
  updated_at: string
}

export interface LLMModelsResponse {
  models: LLMModel[]
  total: number
}

export interface LLMProviderModels {
  provider: string
  models: LLMModel[]
}
