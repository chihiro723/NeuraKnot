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
      await confirmForgotPassword({
        email,
        confirmation_code: formData.confirmationCode,
        new_password: formData.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      console.error("Reset password error:", err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="space-y-8 w-full max-w-md p-8 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/10 border-white/20">
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
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* 中央ハイライト効果 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 bg-emerald-400/30"></div>
      </div>
      <div className="relative z-10 space-y-8 w-full max-w-md p-8 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/10 border-white/20">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-center text-white">
            新しいパスワード設定
          </h2>
          <p className="mt-2 text-sm text-center text-white/70">
            メールに送信された確認コードと新しいパスワードを入力してください。
            <br />
            <span className="text-xs text-white/50">
              ※確認コードは24時間以内に入力してください
            </span>
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
              disabled
              className="mt-1 bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="confirmationCode"
              className="block text-sm font-medium text-gray-700"
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
              className="mt-1"
              placeholder="6桁の確認コード"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700"
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
              className="mt-1"
              placeholder="8文字以上のパスワード"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
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
              className="mt-1"
              placeholder="パスワードを再入力"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "処理中..." : "パスワードをリセット"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
