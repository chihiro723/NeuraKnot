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
      await forgotPassword({ email: email.trim() });
      setSuccess(true);
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex justify-center items-center min-h-[var(--app-dvh)] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="space-y-8 w-full max-w-md p-8 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/10 border-white/20">
          <div className="text-center">
            <div className="mb-4 text-xl text-emerald-400">メール送信完了</div>
            <p className="mb-4 text-white/70">
              {email} にパスワードリセット用のメールを送信しました。
              メール内のリンクをクリックして、新しいパスワードを設定してください。
            </p>
            <Button
              onClick={() => router.push("/auth/login")}
              className="w-full"
            >
              ログインページに戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[var(--app-dvh)] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* 中央ハイライト効果 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 bg-emerald-400/30"></div>
      </div>
      <div className="relative z-10 space-y-8 w-full max-w-md p-8 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/10 border-white/20">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-center text-white">
            パスワードリセット
          </h2>
          <p className="mt-2 text-sm text-center text-white/70">
            登録されているメールアドレスを入力してください。
            パスワードリセット用のメールを送信します。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              メールアドレス
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
              placeholder="your@email.com"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "送信中..." : "リセットメールを送信"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ログインページに戻る
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
