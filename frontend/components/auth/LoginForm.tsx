"use client";

import { useState, useActionState, useEffect } from "react";
import { MessageCircle, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInActionState } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(signInActionState, {
    error: undefined,
    success: false,
  });

  // ログイン成功時のリダイレクト処理
  useEffect(() => {
    if (state.success) {
      location.href = "/dashboard";
    }
  }, [state.success, router]);

  return (
    <div className="relative w-full max-w-md p-8 overflow-hidden glass-card group">
      {/* 背景パーティクルエフェクト */}
      <div className="absolute inset-0 particle-bg opacity-20" />

      {/* シマーエフェクト */}
      <div className="absolute inset-0 transition-opacity duration-500 opacity-0 shimmer-effect group-hover:opacity-30" />

      <div className="relative z-10 mb-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl neon-glow floating-element">
          <MessageCircle className="w-8 h-8 text-white" />
          {/* アイコンのグローエフェクト */}
          <div className="absolute inset-0 bg-emerald-400 rounded-2xl blur-lg opacity-30 -z-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 text-glow">
          ログイン
        </h1>
        <p className="mt-2 text-slate-400">
          アカウントにサインインしてください
        </p>

        {/* フローティングスパークル */}
        <Sparkles className="absolute top-0 w-3 h-3 right-8 text-emerald-400/60 floating-element" />
        <Sparkles
          className="absolute w-2 h-2 top-4 right-4 text-cyan-400/50 floating-element"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {state.error && (
        <div className="relative px-4 py-3 mb-6 overflow-hidden text-sm text-red-300 border rounded-lg glass-card bg-red-500/10 border-red-500/30">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-pink-500/5" />
          <div className="relative z-10 flex items-start space-x-2">
            <span className="text-red-400 mt-0.5">⚠️</span>
            <div>{state.error}</div>
          </div>
        </div>
      )}

      {state.success && state.message && (
        <div className="relative px-4 py-3 mb-6 overflow-hidden text-sm text-green-300 border rounded-lg glass-card bg-green-500/10 border-green-500/30">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5" />
          <div className="relative z-10 flex items-start space-x-2">
            <span className="text-green-400 mt-0.5">✅</span>
            <div>{state.message}</div>
          </div>
        </div>
      )}

      <form action={formAction} className="relative z-10 space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block mb-2 text-sm font-medium text-slate-300"
          >
            メールアドレス
          </label>
          <div className="relative group">
            <Mail className="absolute w-5 h-5 transition-all duration-300 transform -translate-y-1/2 left-3 top-1/2 text-slate-400 group-focus-within:text-emerald-400" />
            <input
              type="email"
              id="email"
              name="email"
              className={cn(
                "w-full pl-10 pr-4 py-3 glass-surface border border-slate-600/30 rounded-xl",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50",
                "text-slate-100 placeholder-slate-500 transition-all duration-300",
                "hover:border-slate-500/50"
              )}
              placeholder="your@email.com"
              required
              disabled={isPending}
            />
            {/* フォーカス時のグローエフェクト */}
            <div className="absolute inset-0 transition-opacity duration-300 opacity-0 pointer-events-none rounded-xl bg-gradient-to-r from-emerald-400/0 via-emerald-400/5 to-emerald-400/0 group-focus-within:opacity-100" />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block mb-2 text-sm font-medium text-slate-300"
          >
            パスワード
          </label>
          <div className="relative group">
            <Lock className="absolute w-5 h-5 transition-all duration-300 transform -translate-y-1/2 left-3 top-1/2 text-slate-400 group-focus-within:text-emerald-400" />
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              className={cn(
                "w-full pl-10 pr-12 py-3 glass-surface border border-slate-600/30 rounded-xl",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50",
                "text-slate-100 placeholder-slate-500 transition-all duration-300",
                "hover:border-slate-500/50"
              )}
              placeholder="パスワードを入力"
              required
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute transition-all duration-300 transform -translate-y-1/2 right-3 top-1/2 text-slate-400 hover:text-slate-200 hover:scale-110"
              disabled={isPending}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
            {/* フォーカス時のグローエフェクト */}
            <div className="absolute inset-0 transition-opacity duration-300 opacity-0 pointer-events-none rounded-xl bg-gradient-to-r from-emerald-400/0 via-emerald-400/5 to-emerald-400/0 group-focus-within:opacity-100" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className={cn(
            "w-full py-3 px-4 rounded-xl font-semibold transition-all duration-500 ease-out relative overflow-hidden group",
            "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600",
            "text-white shadow-lg hover:shadow-emerald-500/25 neon-glow",
            "transform hover:scale-105 active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          )}
        >
          {/* ボタン背景エフェクト */}
          <div className="absolute inset-0 opacity-50 bg-gradient-to-r from-emerald-400/20 via-cyan-400/20 to-blue-400/20 morphing-bg" />

          {/* シマーエフェクト */}
          <div className="absolute inset-0 transition-transform duration-1000 ease-out -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full" />

          {isPending ? (
            <div className="relative z-10 flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />
              <span>ログイン中...</span>
            </div>
          ) : (
            <span className="relative z-10">ログイン</span>
          )}
        </button>
      </form>

      <div className="relative z-10 mt-6 text-center">
        <p className="text-slate-400">
          アカウントをお持ちでない方は{" "}
          <Link
            href="/auth/signup"
            className="font-medium transition-all duration-300 text-emerald-400 hover:text-emerald-300 hover:underline"
          >
            新規登録
          </Link>
        </p>
      </div>

      {/* ホバー時のグローエフェクト */}
      <div className="absolute inset-0 transition-opacity duration-500 opacity-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:opacity-100 rounded-2xl" />
    </div>
  );
}
