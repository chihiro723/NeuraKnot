import { NextResponse, type NextRequest } from 'next/server'

const publicRoutes = ['/', '/auth/login', '/auth/signup', '/auth/verify', '/auth/callback', '/auth/forgot-password', '/auth/reset-password']

/**
 * JWTトークンをデコードして有効期限をチェック
 * @param token JWTトークン
 * @returns トークンが有効な場合はtrue、無効または期限切れの場合はfalse
 */
function isTokenValid(token: string): { valid: boolean; expiresIn?: number } {
  try {
    // JWTの構造: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { valid: false }
    }

    // payloadをデコード（Base64URL）
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    )

    // 有効期限（exp）をチェック
    if (!payload.exp) {
      return { valid: false }
    }

    const now = Math.floor(Date.now() / 1000)
    const expiresIn = payload.exp - now

    // トークンが既に期限切れ
    if (expiresIn <= 0) {
      return { valid: false, expiresIn: 0 }
    }

    return { valid: true, expiresIn }
  } catch (error) {
    console.error('[Middleware] Token validation error:', error)
    return { valid: false }
  }
}

/**
 * トークンをリフレッシュ
 */
async function refreshAccessToken(request: NextRequest): Promise<{ success: boolean; accessToken?: string; refreshToken?: string }> {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value
    
    if (!refreshToken) {
      return { success: false }
    }

    const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'
    
    // Backend-goにリフレッシュリクエスト
    const response = await fetch(`${BACKEND_GO_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      return { success: false }
    }

    const data = await response.json()
    
    // Set-Cookieヘッダーからトークンを抽出
    const setCookieHeaders = response.headers.getSetCookie()
    let newAccessToken: string | undefined
    let newRefreshToken: string | undefined
    
    for (const cookieHeader of setCookieHeaders) {
      if (cookieHeader.startsWith('access_token=')) {
        const [nameValue] = cookieHeader.split(';')
        const [, value] = nameValue.split('=')
        newAccessToken = value
      } else if (cookieHeader.startsWith('refresh_token=')) {
        const [nameValue] = cookieHeader.split(';')
        const [, value] = nameValue.split('=')
        newRefreshToken = value
      }
    }

    return { 
      success: true, 
      accessToken: newAccessToken || data.access_token,
      refreshToken: newRefreshToken || data.refresh_token
    }
  } catch (error) {
    console.error('[Middleware] Token refresh error:', error)
    return { success: false }
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // パブリックルートの場合はそのまま通す
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next()
  }

  // ダッシュボードへのアクセス時は認証チェック
  if (pathname.startsWith('/dashboard')) {
    const accessToken = request.cookies.get('access_token')?.value
    
    if (!accessToken) {
      console.log('[Middleware] No access token found, redirecting to login')
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // トークンの有効期限をチェック
    const { valid, expiresIn } = isTokenValid(accessToken)
    
    if (!valid) {
      console.log('[Middleware] Access token is invalid or expired')
      
      // トークンをリフレッシュ
      const refreshResult = await refreshAccessToken(request)
      
      if (refreshResult.success && refreshResult.accessToken) {
        console.log('[Middleware] Token refreshed successfully')
        
        // 新しいトークンでリクエストを続行
        const response = NextResponse.next()
        
        // 新しいaccess_tokenを設定
        response.cookies.set('access_token', refreshResult.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 3600, // 1時間
          path: '/',
        })
        
        // 新しいrefresh_tokenがある場合は設定
        if (refreshResult.refreshToken) {
          response.cookies.set('refresh_token', refreshResult.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 604800, // 7日間
            path: '/',
          })
        }
        
        return response
      } else {
        console.log('[Middleware] Token refresh failed, redirecting to login')
        // リフレッシュ失敗 - ログインページへリダイレクト
        const response = NextResponse.redirect(new URL('/auth/login', request.url))
        response.cookies.delete('access_token')
        response.cookies.delete('refresh_token')
        return response
      }
    }
    
    // トークンの有効期限が5分以内の場合は警告ログ
    if (expiresIn && expiresIn < 300) {
      console.log(`[Middleware] Access token expires in ${expiresIn} seconds`)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}