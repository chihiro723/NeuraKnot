/**
 * AIパーソナリティの定数定義
 */

import { Zap, Heart, Briefcase, Coffee, Smile } from 'lucide-react'
import type { AIPersonality } from '@/lib/types'

export const AI_PERSONALITIES: Record<string, AIPersonality> = {
  support: {
    id: 'support',
    name: 'サポート',
    icon: Zap,
    color: 'from-blue-400 to-blue-600',
    description: '技術的な質問や問題解決をサポート'
  },
  friendly: {
    id: 'friendly',
    name: 'フレンドリー',
    icon: Heart,
    color: 'from-pink-400 to-pink-600',
    description: '親しみやすく楽しい会話を提供'
  },
  business: {
    id: 'business',
    name: 'ビジネス',
    icon: Briefcase,
    color: 'from-gray-400 to-gray-600',
    description: '仕事や業務効率化をサポート'
  },
  casual: {
    id: 'casual',
    name: 'カジュアル',
    icon: Coffee,
    color: 'from-green-400 to-green-600',
    description: 'のんびりとリラックスした会話'
  },
  humor: {
    id: 'humor',
    name: 'ユーモア',
    icon: Smile,
    color: 'from-yellow-400 to-yellow-600',
    description: '笑いと楽しさを提供する会話'
  }
}

export const getPersonalityLabel = (preset: string): string => {
  return AI_PERSONALITIES[preset]?.name || preset
}

export const getPersonalityInfo = (preset: string): AIPersonality | null => {
  return AI_PERSONALITIES[preset] || null
}