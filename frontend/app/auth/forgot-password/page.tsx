"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
      setError(
        err instanceof Error
          ? err.message
          : "パスワードリセットメールの送信に失敗しました"
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
            <div className="mb-4 text-xl text-green-600">メール送信完了</div>
            <p className="mb-4 text-gray-600">
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
    <div className="flex justify-center items-center min-h-screen">
      <div className="space-y-8 w-full max-w-md">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900">
            パスワードリセット
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600">
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
