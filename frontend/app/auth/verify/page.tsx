"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VerifyCodeInput } from "@/components/auth/VerifyCodeInput";
import { cognitoAuth } from "@/lib/auth/cognito";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // sessionStorageからメールアドレスとパスワードを取得
    const verifyEmail = sessionStorage.getItem("verify_email");
    const verifyPassword = sessionStorage.getItem("verify_password");

    if (!verifyEmail || !verifyPassword) {
      // メールアドレスまたはパスワードがない場合は新規登録ページへ
      router.push("/auth/signup");
      return;
    }

    setEmail(verifyEmail);
    setPassword(verifyPassword);
  }, [router]);

  // メールアドレスをマスク表示
  const maskEmail = (email: string) => {
    const [local, domain] = email.split("@");
    if (local.length <= 4) {
      return `${local[0]}***@${domain}`;
    }
    return `${local.substring(0, 4)}****@${domain}`;
  };

  const handleCodeComplete = async (code: string) => {
    setLoading(true);
    setError("");

    try {
      // メール確認
      await cognitoAuth.confirmSignUp(email, code);

      // 自動ログインを試行
      try {
        await cognitoAuth.signIn(email, password);

        // 成功したらsessionStorageをクリア
        sessionStorage.removeItem("verify_email");
        sessionStorage.removeItem("verify_password");

        // ダッシュボードへリダイレクト
        router.push("/dashboard");
      } catch (loginErr) {
        // ログインに失敗した場合はsessionStorageをクリアしてログインページへ
        sessionStorage.removeItem("verify_email");
        sessionStorage.removeItem("verify_password");

        console.error("自動ログインエラー:", loginErr);
        router.push("/auth/login?verified=true");
      }
    } catch (err) {
      // メール確認自体が失敗した場合もsessionStorageをクリア
      sessionStorage.removeItem("verify_email");
      sessionStorage.removeItem("verify_password");

      setError(
        err instanceof Error ? err.message : "認証コードの確認に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <LoadingSpinner centerScreen />
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

      {/* 戻るボタン */}
      <Link
        href="/auth/signup"
        className="absolute top-6 left-6 z-20 group p-3 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
      >
        <ArrowLeft className="w-5 h-5 transition-colors duration-300 text-white/70 group-hover:text-white" />
      </Link>

      {/* メインコンテンツ */}
      <div className="relative z-10 w-full max-w-md">
        <div className="p-8 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/10 border-white/20">
          <div className="mb-8 text-center">
            <div className="inline-flex justify-center items-center mb-4 w-16 h-16 rounded-full bg-emerald-500/20">
              <svg
                className="w-8 h-8 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-white">
              メールアドレスを確認
            </h1>
            <p className="text-sm text-white/70">
              <span className="font-medium text-emerald-400">
                {maskEmail(email)}
              </span>
              <br />
              に認証コードを送信しました
            </p>
          </div>

          <div className="mb-6">
            <VerifyCodeInput
              onComplete={handleCodeComplete}
              disabled={loading}
              error={error}
            />
          </div>

          {loading && (
            <div className="mb-4 text-sm text-center text-white/70">
              認証コードを確認しています...
            </div>
          )}

          <div className="space-y-3 text-center">
            <p className="text-sm text-white/70">
              コードが届かない場合
              <br />
              <span className="text-xs text-white/50">
                ※再送信機能は近日実装予定です
              </span>
            </p>

            <Link
              href="/auth/signup"
              className="inline-block text-sm text-emerald-400 transition-colors hover:text-emerald-300"
            >
              別のメールアドレスを使用
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
