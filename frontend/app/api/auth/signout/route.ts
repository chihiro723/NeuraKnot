import { NextRequest, NextResponse } from 'next/server'
import { signOutApiAction } from '@/lib/auth/actions'

export async function POST(request: NextRequest) {
  try {
    const result = await signOutApiAction()
    
    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: result.error || 'ログアウトに失敗しました' }, 
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('API ログアウトエラー:', error)
    return NextResponse.json(
      { error: 'ログアウト中にエラーが発生しました' }, 
      { status: 500 }
    )
  }
}