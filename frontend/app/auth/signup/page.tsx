"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CognitoSignUpForm } from "@/components/auth/CognitoSignUpForm";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  const { isAuthenticated, loading } = useCognitoAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex overflow-hidden relative justify-center items-center p-4 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* 背景パーティクルエフェクト */}
      <div className="absolute inset-0 opacity-30 particle-bg" />

      {/* 動的背景グラデーション */}
      <div className="absolute inset-0 bg-gradient-to-br via-transparent from-emerald-500/5 to-cyan-500/5 morphing-bg" />

      {/* フローティングエレメント */}
      <div className="absolute top-20 left-20 w-32 h-32 rounded-full blur-3xl bg-emerald-500/10 floating-element" />
      <div
        className="absolute right-20 bottom-20 w-40 h-40 rounded-full blur-3xl bg-cyan-500/10 floating-element"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute left-10 top-1/2 w-24 h-24 rounded-full blur-2xl bg-blue-500/10 floating-element"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="absolute top-1/3 right-1/4 w-20 h-20 rounded-full blur-2xl bg-purple-500/10 floating-element"
        style={{ animationDelay: "6s" }}
      />

      {/* 戻るボタン */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 group p-3 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
      >
        <ArrowLeft className="w-5 h-5 transition-colors duration-300 text-white/70 group-hover:text-white" />
      </Link>

      {/* メインコンテンツ */}
      <div className="relative z-10 w-full max-w-md">
        <div className="p-8 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/10 border-white/20">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">新規登録</h1>
            <p className="text-white/70">新しいアカウントを作成してください</p>
          </div>

          <CognitoSignUpForm />

          <div className="mt-6 text-center">
            <p className="text-white/70">
              既にアカウントをお持ちの方は{" "}
              <Link
                href="/auth/login"
                className="font-medium text-emerald-400 hover:text-emerald-300"
              >
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
