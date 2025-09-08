import { LandingPage } from '@/components/landing/LandingPage'
import { getAuthState } from '@/lib/auth/server'

export default async function HomePage() {
  // 認証状態をチェック（リダイレクトなし）
  const { user, profile } = await getAuthState()
  
  return <LandingPage user={user} profile={profile} />
}