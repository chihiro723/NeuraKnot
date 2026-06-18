'use server'

import { DEFAULT_USD_TO_JPY_RATE } from '@/lib/utils/currency'

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

/**
 * USD→JPY 換算レートをバックエンド（正本）から取得する。
 * 取得に失敗した場合はフロントのフォールバック既定値を返す。
 */
export async function getExchangeRate(): Promise<number> {
  try {
    const response = await fetch(`${BACKEND_GO_URL}/api/v1/exchange-rate`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      return DEFAULT_USD_TO_JPY_RATE
    }
    const data = await response.json()
    return typeof data.usd_to_jpy_rate === 'number' && data.usd_to_jpy_rate > 0
      ? data.usd_to_jpy_rate
      : DEFAULT_USD_TO_JPY_RATE
  } catch {
    return DEFAULT_USD_TO_JPY_RATE
  }
}
