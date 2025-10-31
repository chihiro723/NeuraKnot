import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

/**
 * トークンリフレッシュ
 * backend-goのリフレッシュトークンを使って新しいアクセストークンを取得し、
 * Cookieを更新する
 */
export async function POST() {
  try {
    // Cookieからリフレッシュトークンを取得
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh_token')?.value

    console.log('[REFRESH] Refresh token found:', !!refreshToken)

    if (!refreshToken) {
      console.log('[REFRESH] No refresh token found in cookies')
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      )
    }

    console.log('[REFRESH] Sending refresh request to backend-go')

    // Backend-goにリフレッシュリクエスト
    const response = await fetch(`${BACKEND_GO_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    console.log('[REFRESH] Backend-go response status:', response.status)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'トークンリフレッシュに失敗しました' }))
      console.error('[REFRESH] Backend-go error:', error)
      
      // リフレッシュ失敗時はCookieをクリア
      const nextResponse = NextResponse.json(error, { status: response.status })
      nextResponse.cookies.delete('access_token')
      nextResponse.cookies.delete('refresh_token')
      
      return nextResponse
    }

    const data = await response.json()
    console.log('[REFRESH] Backend-go response data received')

    // backend-goからのSet-Cookieヘッダーを取得
    const setCookieHeaders = response.headers.getSetCookie()
    console.log('[REFRESH] Set-Cookie headers from backend-go:', setCookieHeaders)

    // アクセストークンを抽出してレスポンスに含める（クライアント側でLocalStorageに保存するため）
    let accessToken = null
    for (const cookieHeader of setCookieHeaders) {
      if (cookieHeader.startsWith('access_token=')) {
        const [nameValue] = cookieHeader.split(';')
        const [, value] = nameValue.split('=')
        accessToken = value
        break
      }
    }

    // レスポンスを作成（トークンを含める）
    const nextResponse = NextResponse.json({
      ...data,
      access_token: accessToken // クライアント側で使用するためにトークンを追加
    })

    // 各Cookieを個別に設定
    for (const cookieHeader of setCookieHeaders) {
      const [nameValue, ...attributes] = cookieHeader.split(';')
      const [name, value] = nameValue.split('=').map(s => s.trim())

      // Cookie属性をパース
      let maxAge = 3600 // デフォルト1時間

      for (const attr of attributes) {
        const [key, val] = attr.split('=').map(s => s?.trim().toLowerCase())
        if (key === 'max-age' && val) {
          maxAge = parseInt(val, 10)
        }
      }

      console.log(`[REFRESH] Setting cookie: ${name} (maxAge: ${maxAge})`)

      // Next.js cookies APIでCookieを設定
      nextResponse.cookies.set(name, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge,
        path: '/',
      })
    }

    console.log('[REFRESH] Cookies set successfully')
    console.log('[REFRESH] All cookies:', nextResponse.cookies.getAll().map(c => c.name))

    return nextResponse
  } catch (error) {
    console.error('[REFRESH] Error:', error)
    return NextResponse.json(
      { error: 'トークンリフレッシュに失敗しました' },
      { status: 500 }
    )
  }
}

