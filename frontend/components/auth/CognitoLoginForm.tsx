"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// バリデーション
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function CognitoLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { signIn } = useCognitoAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // メール認証完了後の遷移時に成功メッセージを表示
  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      setSuccessMessage("アカウントが確認されました。ログインしてください。");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    // バリデーション
    if (!emailRegex.test(email)) {
      setError("有効なメールアドレスを入力してください");
      setLoading(false);
      return;
    }

    try {
      await signIn({
        email: email.toLowerCase(),
        password,
      });
      router.push("/dashboard");
    } catch (err) {
      setError("メールアドレスまたはパスワードが間違っています");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {successMessage && (
        <div className="p-3 text-sm text-center text-emerald-300 rounded-lg border bg-emerald-500/20 border-emerald-500/30">
          {successMessage}
        </div>
      )}

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
          className="mt-1"
          placeholder="your@email.com"
          autoFocus
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-white/90"
        >
          パスワード
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1"
          placeholder="パスワードを入力"
        />
      </div>

      {error && (
        <div className="p-3 text-sm text-center text-red-300 rounded-lg border bg-red-500/20 border-red-500/30">
          {error}
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "ログイン中..." : "ログイン"}
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-white/50">
          パスワードを忘れた場合
          <br />
          <span className="text-xs">
            ※パスワードリセット機能は近日実装予定です
          </span>
        </p>
      </div>
    </form>
  );
}
