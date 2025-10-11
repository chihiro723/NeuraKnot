import { NextRequest, NextResponse } from 'next/server'

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

/**
 * サインイン
 * backend-goからのトークンをCookieに設定
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[SIGNIN] Sending request to backend-go:', `${BACKEND_GO_URL}/api/v1/auth/signin`)
    
    // Backend-goにサインインリクエスト
    const response = await fetch(`${BACKEND_GO_URL}/api/v1/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log('[SIGNIN] Backend-go response status:', response.status)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'ログインに失敗しました' }))
      console.error('[SIGNIN] Backend-go error:', error)
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    console.log('[SIGNIN] Backend-go response data:', { user: data.user?.email, expires_in: data.expires_in })

    // backend-goからのSet-Cookieヘッダーを取得
    const setCookieHeaders = response.headers.getSetCookie()
    console.log('[SIGNIN] Set-Cookie headers from backend-go:', setCookieHeaders)
    
    // レスポンスを作成
    const nextResponse = NextResponse.json(data)
    
    // 各Cookieを個別に設定（Next.js cookies APIを使用）
    for (const cookieHeader of setCookieHeaders) {
      const [nameValue, ...attributes] = cookieHeader.split(';')
      const [name, value] = nameValue.split('=').map(s => s.trim())
      
      // Cookie属性をパース
      let maxAge = 3600
      
      for (const attr of attributes) {
        const [key, val] = attr.split('=').map(s => s?.trim().toLowerCase())
        if (key === 'max-age' && val) {
          maxAge = parseInt(val, 10)
        }
      }
      
      console.log(`[SIGNIN] Setting cookie via cookies.set: ${name} (maxAge: ${maxAge})`)
      
      // Next.js cookies APIでCookieを設定
      nextResponse.cookies.set(name, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge,
        path: '/',
      })
    }

    console.log('[SIGNIN] Cookies set:', nextResponse.cookies.getAll().map(c => c.name))

    return nextResponse
  } catch (error) {
    console.error('[SIGNIN] Error:', error)
    return NextResponse.json(
      { error: 'ログインに失敗しました' },
      { status: 500 }
    )
  }
}
