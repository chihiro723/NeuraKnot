"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getAuthErrorMessage } from "@/lib/utils/auth-errors";

function ResetPasswordForm() {
  const [formData, setFormData] = useState({
    confirmationCode: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { confirmForgotPassword } = useCognitoAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // バリデーション
    if (formData.newPassword !== formData.confirmPassword) {
      setError("新しいパスワードと確認パスワードが一致しません");
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError("新しいパスワードは8文字以上で入力してください");
      setLoading(false);
      return;
    }

    try {
      const result = await confirmForgotPassword(
        email.toLowerCase(),
        formData.confirmationCode,
        formData.newPassword
      );
      if (result.success) {
        setSuccess(true);
      } else {
        setError("パスワードリセットに失敗しました");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex justify-center items-center min-h-[var(--app-dvh)] overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="p-5 space-y-6 w-full max-w-sm rounded-2xl border shadow-2xl backdrop-blur-md md:space-y-8 md:max-w-md md:p-8 bg-white/10 border-white/20">
          <div className="text-center">
            <div className="mb-4 text-xl text-emerald-400">
              パスワードリセット完了
            </div>
            <p className="mb-4 text-white/70">
              パスワードが正常にリセットされました。
              新しいパスワードでログインしてください。
            </p>
            <Button
              onClick={() => router.push("/auth/login")}
              className="w-full"
            >
              ログインページに移動
            </Button>
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
            新しいパスワード設定
          </h2>
          <p className="mt-2 text-sm text-center text-white/70">
            メールに送信された確認コードと新しいパスワードを入力してください。
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
              disabled
              className="mt-1 bg-white/5 border-white/20 text-white/50"
            />
          </div>

          <div>
            <label
              htmlFor="confirmationCode"
              className="block text-sm font-medium text-white/90"
            >
              確認コード
            </label>
            <Input
              id="confirmationCode"
              name="confirmationCode"
              type="text"
              value={formData.confirmationCode}
              onChange={handleChange}
              required
              className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
              placeholder="6桁の確認コード"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-white/90"
            >
              新しいパスワード
            </label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              required
              className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
              placeholder="8文字以上のパスワード"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-white/90"
            >
              パスワード確認
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
              placeholder="パスワードを再入力"
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-center text-red-300 rounded-lg border bg-red-500/20 border-red-500/30">
              {error}
            </div>
          )}

          <div style={{ marginTop: "2rem" }}>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "処理中..." : "パスワードをリセット"}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="text-sm text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              ログインページに戻る
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner centerScreen variant="auth" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
