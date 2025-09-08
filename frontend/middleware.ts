import { NextResponse, type NextRequest } from 'next/server'

const publicRoutes = ['/', '/auth/login', '/auth/signup', '/auth/callback', '/setup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // パブリックルートの場合はそのまま通す
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next()
  }

  // 環境変数チェック
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl === 'your_supabase_project_url_here' || 
      supabaseAnonKey === 'your_supabase_anon_key_here') {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // 認証チェックはページレベルで行うため、ミドルウェアでは環境チェックのみ

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}