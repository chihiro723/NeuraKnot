"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getAuthErrorMessage } from "@/lib/utils/auth-errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { forgotPassword } = useCognitoAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await forgotPassword(email.toLowerCase());
      if (result.success) {
        setSuccess(true);
      } else {
        setError("パスワードリセットメールの送信に失敗しました");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex justify-center items-center min-h-[var(--app-dvh)] overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="p-8 space-y-8 w-full max-w-md rounded-2xl border shadow-2xl backdrop-blur-md bg-white/10 border-white/20">
          <div className="text-center">
            <div className="mb-4 text-xl text-emerald-400">メール送信完了</div>
            <p className="mb-6 text-white/70">
              {email} にメールを送信しました。
              <br />
              メール内の確認コードを使用して、パスワードをリセットしてください。
            </p>
            <div className="space-y-3">
              <Button
                onClick={() =>
                  router.push(
                    `/auth/reset-password?email=${encodeURIComponent(email)}`
                  )
                }
                className="w-full"
              >
                確認コードを入力してパスワードをリセット
              </Button>
              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className="w-full text-sm text-blue-400 underline transition-colors hover:text-blue-300"
              >
                ログインページに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[var(--app-dvh)] overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* 中央ハイライト効果 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 bg-emerald-400/30"></div>
      </div>
      <div className="relative z-10 p-5 w-full max-w-sm rounded-2xl border shadow-2xl backdrop-blur-md md:max-w-md md:p-8 bg-white/10 border-white/20">
        <div className="mb-4">
          <h2 className="text-3xl font-extrabold text-center text-white">
            パスワードリセット
          </h2>
          <p className="mt-2 text-sm text-center text-white/70">
            登録されているメールアドレスを入力してください。
            パスワードリセット用のメールを送信します。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-white/90"
            >
              メールアドレス
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 text-white bg-white/10 border-white/20 placeholder-white/50 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
              placeholder="your@email.com"
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-center text-red-300 rounded-lg border bg-red-500/20 border-red-500/30">
              {error}
            </div>
          )}

          <div style={{ marginTop: "2rem" }}>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "送信中..." : "リセットメールを送信"}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="text-sm text-blue-400 underline transition-colors hover:text-blue-300"
            >
              ログインページに戻る
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
