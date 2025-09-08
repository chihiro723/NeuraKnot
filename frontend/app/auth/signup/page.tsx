import { redirect } from 'next/navigation'
import { SignUpForm } from "@/components/auth/SignUpForm";
import { getAuthState } from '@/lib/auth/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function SignUpPage() {
  // ログイン済みの場合はダッシュボードにリダイレクト
  const { user } = await getAuthState()
  
  if (user) {
    redirect('/dashboard')
  }
  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* 背景パーティクルエフェクト */}
      <div className="absolute inset-0 particle-bg opacity-30" />

      {/* 動的背景グラデーション */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 morphing-bg" />

      {/* フローティングエレメント */}
      <div className="absolute w-32 h-32 rounded-full top-20 left-20 bg-emerald-500/10 blur-3xl floating-element" />
      <div
        className="absolute w-40 h-40 rounded-full bottom-20 right-20 bg-cyan-500/10 blur-3xl floating-element"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute w-24 h-24 rounded-full top-1/2 left-10 bg-blue-500/10 blur-2xl floating-element"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="absolute w-20 h-20 rounded-full top-1/3 right-1/4 bg-purple-500/10 blur-2xl floating-element"
        style={{ animationDelay: "6s" }}
      />

      {/* 戻るボタン */}
      <Link 
        href="/"
        className="absolute top-6 left-6 z-20 group p-3 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
      >
        <ArrowLeft className="w-5 h-5 text-white/70 group-hover:text-white transition-colors duration-300" />
      </Link>

      {/* メインコンテンツ */}
      <div className="relative z-10">
        <SignUpForm />
      </div>
    </div>
  );
}
