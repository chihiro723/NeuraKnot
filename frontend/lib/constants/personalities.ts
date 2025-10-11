/**
 * AIパーソナリティの定数定義
 * MVP: 3種類のペルソナ (assistant, creative, analytical)
 */

import { Brain, Sparkles, LineChart } from 'lucide-react'
import type { AIPersonality } from '@/lib/types'

export const AI_PERSONALITIES: Record<string, AIPersonality> = {
  assistant: {
    id: 'assistant',
    name: 'アシスタント',
    icon: Brain,
    color: 'from-blue-400 to-blue-600',
    description: '親切で丁寧なアシスタント'
  },
  creative: {
    id: 'creative',
    name: 'クリエイティブ',
    icon: Sparkles,
    color: 'from-purple-400 to-pink-600',
    description: '創造的で発想豊かな対話'
  },
  analytical: {
    id: 'analytical',
    name: 'アナリティカル',
    icon: LineChart,
    color: 'from-green-400 to-teal-600',
    description: '論理的で分析的な対話'
  }
}

export const getPersonalityLabel = (preset: string): string => {
  return AI_PERSONALITIES[preset]?.name || preset
}

export const getPersonalityInfo = (preset: string): AIPersonality | null => {
  return AI_PERSONALITIES[preset] || null
}