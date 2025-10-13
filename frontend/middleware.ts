import { NextResponse, type NextRequest } from 'next/server'

const publicRoutes = ['/', '/auth/login', '/auth/signup', '/auth/verify', '/auth/callback', '/auth/forgot-password', '/auth/reset-password']

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
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}