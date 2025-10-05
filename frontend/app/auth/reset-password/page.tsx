"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
      setError(
        err instanceof Error ? err.message : "パスワードリセットに失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="space-y-8 w-full max-w-md">
          <div className="text-center">
            <div className="mb-4 text-xl text-green-600">
              パスワードリセット完了
            </div>
            <p className="mb-4 text-gray-600">
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
    <div className="flex justify-center items-center min-h-screen">
      <div className="space-y-8 w-full max-w-md">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900">
            新しいパスワード設定
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600">
            メールに送信された確認コードと新しいパスワードを入力してください。
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
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="mx-auto w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
