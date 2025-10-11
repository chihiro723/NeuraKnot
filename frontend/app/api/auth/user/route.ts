import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || 'http://localhost:8080'

/**
 * 現在のユーザー情報取得
 */
export async function GET(request: NextRequest) {
  try {
    // Cookieからアクセストークンを取得
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    const allCookies = cookieStore.getAll()

    console.log('[GET USER] All cookies:', allCookies.map(c => c.name))
    console.log('[GET USER] Access token found:', !!accessToken)

    if (!accessToken) {
      console.log('[GET USER] No access token found in cookies')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[GET USER] Sending request to backend-go with token')

    // Backend-goにユーザー情報リクエスト（Cookieとして送信）
    const response = await fetch(`${BACKEND_GO_URL}/api/v1/users/profile`, {
      headers: {
        'Cookie': `access_token=${accessToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'ユーザー情報の取得に失敗しました' }))
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in get user route:', error)
    return NextResponse.json(
      { error: 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
