"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VerifyCodeInput } from "@/components/auth/VerifyCodeInput";
import { cognitoAuth } from "@/lib/auth/cognito";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";
import { getAuthErrorMessage } from "@/lib/utils/auth-errors";

function VerifyEmailContent() {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [canResend, setCanResend] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // URLパラメータまたはsessionStorageからメールアドレスを取得
    const urlEmail = searchParams.get("email");
    const storageEmail = sessionStorage.getItem("verify_email");
    const email = urlEmail || storageEmail;

    if (!email) {
      // メールアドレスがない場合は新規登録ページへ
      router.push("/auth/signup");
      return;
    }

    setEmail(email);
  }, [router, searchParams]);

  const handleCodeComplete = async (code: string) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // メール確認
      await cognitoAuth.confirmSignUp(email, code);

      // 成功したらsessionStorageをクリア
      sessionStorage.removeItem("verify_email");
      sessionStorage.removeItem("verify_password");

      // ログインページへリダイレクト（認証完了メッセージ付き）
      router.push("/auth/login?verified=true");
    } catch (err) {
      console.error("Verify error:", err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await cognitoAuth.resendConfirmationCode(email);
      setSuccessMessage("認証コードを再送信しました");
      setCanResend(false);
      setResendCountdown(60);
    } catch (err) {
      console.error("Resend error:", err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // カウントダウンタイマー
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0 && !canResend) {
      setCanResend(true);
    }
  }, [resendCountdown, canResend]);

  if (!email) {
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
        href="/auth/signup"
        className="absolute top-4 md:top-6 left-4 md:left-6 z-20 group p-2 md:p-3 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
      >
        <ArrowLeft className="w-5 h-5 transition-colors duration-300 text-white/70 group-hover:text-white" />
      </Link>

      {/* メインコンテンツ */}
      <div className="relative z-10 w-full max-w-sm md:max-w-md">
        <div className="p-5 md:p-8 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/10 border-white/20">
          <div className="mb-6 text-center">
            <div className="inline-flex justify-center items-center mb-4 w-12 h-12 md:w-16 md:h-16 rounded-full bg-emerald-500/20">
              <svg
                className="w-6 h-6 md:w-8 md:h-8 text-emerald-400"
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
            <h1 className="mb-2 text-2xl md:text-3xl font-bold text-white">
              メールアドレスを確認
            </h1>
            <p className="text-sm text-white/70">
              <span className="font-medium text-emerald-400">{email}</span>
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

          {successMessage && (
            <div className="p-3 mb-4 text-sm text-center text-green-300 rounded-lg border bg-green-500/20 border-green-500/30">
              {successMessage}
            </div>
          )}

          <div className="space-y-3 text-center">
            <div className="space-y-2">
              <p className="text-sm text-white/70">コードが届かない場合</p>

              {canResend ? (
                <button
                  onClick={handleResendCode}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-emerald-400 rounded-lg border transition-colors border-emerald-400/30 hover:bg-emerald-400/10 hover:border-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  認証コードを再送信
                </button>
              ) : (
                <div className="text-sm text-white/50">
                  再送信可能まで {resendCountdown} 秒
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/10">
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
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingSpinner centerScreen variant="auth" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
