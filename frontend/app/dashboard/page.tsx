import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { requireAuth } from '@/lib/auth/server'

export default async function DashboardPage() {
  // 認証が必要 - 未認証の場合は自動的にリダイレクト
  await requireAuth()
  
  return <DashboardContent />
}