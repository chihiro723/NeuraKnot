import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { getAuthState } from '@/lib/auth/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function LoginPage() {
  // ログイン済みの場合はダッシュボードにリダイレクト
  const { user } = await getAuthState()
  
  if (user) {
    redirect('/dashboard')
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景パーティクルエフェクト */}
      <div className="absolute inset-0 particle-bg opacity-30" />
      
      {/* 動的背景グラデーション */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 morphing-bg" />
      
      {/* フローティングエレメント */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl floating-element" />
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl floating-element" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl floating-element" style={{ animationDelay: '4s' }} />
      
      {/* 戻るボタン */}
      <Link 
        href="/"
        className="absolute top-6 left-6 z-20 group p-3 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
      >
        <ArrowLeft className="w-5 h-5 text-white/70 group-hover:text-white transition-colors duration-300" />
      </Link>
      
      {/* メインコンテンツ */}
      <div className="relative z-10">
        <LoginForm />
      </div>
    </div>
  )
}