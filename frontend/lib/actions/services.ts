/**
 * サービス関連のServer Actions
 * 
 * Goバックエンドとの通信を行う
 */

'use server'

import { cookies } from 'next/headers'
import type {
  Service,
  Tool,
  ServiceConfig,
  CreateServiceConfigInput,
  UpdateServiceConfigInput,
} from '@/lib/types/service'

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

/**
 * 認証トークンを取得
 */
async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('access_token')?.value || null
}

/**
 * API リクエストヘッダーを取得
 */
async function getHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Cookie: `access_token=${token}` }),
  }
}

/**
 * 全サービス一覧を取得（Pythonプロキシ）
 */
export async function listServices(): Promise<Service[]> {
  const headers = await getHeaders()

  const response = await fetch(`${BACKEND_GO_URL}/api/v1/services`, {
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`サービス一覧の取得に失敗しました: ${response.status}`)
  }

  const data = await response.json()
  return data || []
}

/**
 * サービスのツール一覧を取得（Pythonプロキシ）
 */
export async function getServiceTools(serviceClass: string): Promise<Tool[]> {
  const headers = await getHeaders()

  const response = await fetch(
    `${BACKEND_GO_URL}/api/v1/services/${serviceClass}/tools`,
    {
      headers,
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(`ツール一覧の取得に失敗しました: ${response.status}`)
  }

  const data = await response.json()
  return data || []
}

/**
 * ユーザーのサービス設定一覧を取得
 */
export async function listUserServiceConfigs(): Promise<ServiceConfig[]> {
  const headers = await getHeaders()

  const response = await fetch(`${BACKEND_GO_URL}/api/v1/services/config`, {
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`サービス設定一覧の取得に失敗しました: ${response.status}`)
  }

  const data = await response.json()
  return data || []
}

/**
 * サービス設定を作成
 */
export async function createServiceConfig(
  input: CreateServiceConfigInput
): Promise<ServiceConfig> {
  const headers = await getHeaders()

  const response = await fetch(`${BACKEND_GO_URL}/api/v1/services/config`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `サービス設定の作成に失敗しました: ${response.status}`)
  }

  return response.json()
}

/**
 * サービス設定を取得
 */
export async function getServiceConfigByID(id: string): Promise<ServiceConfig> {
  const headers = await getHeaders()

  const response = await fetch(`${BACKEND_GO_URL}/api/v1/services/config/${id}`, {
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`サービス設定の取得に失敗しました: ${response.status}`)
  }

  return response.json()
}

/**
 * サービス設定を更新
 */
export async function updateServiceConfig(
  id: string,
  input: UpdateServiceConfigInput
): Promise<ServiceConfig> {
  const headers = await getHeaders()

  const response = await fetch(`${BACKEND_GO_URL}/api/v1/services/config/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `サービス設定の更新に失敗しました: ${response.status}`)
  }

  return response.json()
}

/**
 * サービス設定を削除
 */
export async function deleteServiceConfig(id: string): Promise<void> {
  const headers = await getHeaders()

  const response = await fetch(`${BACKEND_GO_URL}/api/v1/services/config/${id}`, {
    method: 'DELETE',
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `サービス設定の削除に失敗しました: ${response.status}`)
  }
}

/**
 * サービスとその設定・ツールをまとめて取得
 */
export async function getUserServicesWithDetails() {
  const [services, configs] = await Promise.all([
    listServices(),
    listUserServiceConfigs(),
  ])

  // nullチェック: 空配列をデフォルト値として使用
  if (!configs || configs.length === 0) {
    return []
  }

  // ユーザーが設定しているサービスの詳細を取得
  const userServices = await Promise.all(
    configs.map(async (config) => {
      const service = services.find((s) => s.class_name === config.service_class)
      if (!service) {
        return null
      }

      const tools = await getServiceTools(config.service_class)

      return {
        config,
        service,
        tools,
      }
    })
  )

  return userServices.filter((s) => s !== null)
}

/**
 * 利用可能なサービス一覧を取得（未登録のもの）
 */
export async function getAvailableServices() {
  const [allServices, userConfigs] = await Promise.all([
    listServices(),
    listUserServiceConfigs(),
  ])

  const registeredClasses = new Set(userConfigs.map((c) => c.service_class))

  return allServices.filter((s) => !registeredClasses.has(s.class_name))
}

/**
 * サービスを登録（設定作成）
 */
export async function registerService(
  serviceClass: string,
  config?: Record<string, unknown>,
  auth?: Record<string, unknown>
): Promise<ServiceConfig> {
  return createServiceConfig({
    service_class: serviceClass,
    config,
    auth,
  })
}

/**
 * サービスを有効化/無効化
 */
export async function toggleServiceEnabled(
  id: string,
  isEnabled: boolean
): Promise<ServiceConfig> {
  return updateServiceConfig(id, {
    is_enabled: isEnabled,
  })
}

/**
 * サービスの認証情報を検証
 */
export async function validateServiceAuth(
  serviceClass: string,
  auth: Record<string, unknown>
): Promise<{ valid: boolean; error?: string }> {
  const headers = await getHeaders()
  
  const response = await fetch(`${BACKEND_GO_URL}/api/v1/services/validate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ service_class: serviceClass, auth }),
  })
  
  if (!response.ok) {
    throw new Error('検証リクエストに失敗しました')
  }
  
  return response.json()
}



