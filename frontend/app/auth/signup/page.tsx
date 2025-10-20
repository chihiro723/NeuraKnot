"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CognitoSignUpForm } from "@/components/auth/CognitoSignUpForm";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";

export default function SignUpPage() {
  const { isAuthenticated, loading } = useCognitoAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <LoadingSpinner centerScreen variant="auth" />;
  }

  return (
    <div className="flex relative justify-center items-center p-4 min-h-[var(--app-dvh)] overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* 中央ハイライト効果 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 bg-emerald-400/30"></div>
      </div>

      {/* 戻るボタン */}
      <Link
        href="/"
        className="absolute top-4 md:top-6 left-4 md:left-6 z-20 group p-2 md:p-3 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
      >
        <ArrowLeft className="w-5 h-5 transition-colors duration-300 text-white/70 group-hover:text-white" />
      </Link>

      {/* メインコンテンツ */}
      <div className="relative z-10 w-full max-w-sm md:max-w-md">
        <div className="p-5 md:p-8 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/10 border-white/20">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl md:text-3xl font-bold text-white">
              新規登録
            </h1>
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
