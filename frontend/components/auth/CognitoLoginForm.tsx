"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff } from "lucide-react";
import {
  getAuthErrorMessage,
  isUnconfirmedUserError,
} from "@/lib/utils/auth-errors";

// バリデーション
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function CognitoLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { signIn, error: authError, clearError } = useCognitoAuth();
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
    clearError();

    // バリデーション
    if (!emailRegex.test(email)) {
      setError("有効なメールアドレスを入力してください");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn({ email: email.toLowerCase(), password });

      if (result.success) {
        // 成功: 即座にダッシュボード(chats)へ遷移
        router.replace("/dashboard/chats");
        router.refresh();

        // フェイルセーフ: 300ms後に遷移できていなければ強制遷移
        setTimeout(() => {
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.startsWith("/dashboard")
          ) {
            window.location.assign("/dashboard/chats");
          }
        }, 300);
      } else {
        // 失敗: エラーをチェックして適切に処理
        if (authError) {
          const err = new Error(authError);
          if (isUnconfirmedUserError(err)) {
            const lower = email.toLowerCase();
            sessionStorage.setItem("verify_email", lower);
            router.push(`/auth/verify?email=${encodeURIComponent(lower)}`);
          } else {
            setError(getAuthErrorMessage(err));
          }
        } else {
          setError("ログインに失敗しました");
        }
        setLoading(false);
      }
    } catch {
      // 予期しないエラー
      setError("ログイン処理中にエラーが発生しました");
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
          className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 autofill:bg-white/10 autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] autofill:text-white"
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
        <div className="relative mt-1">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="パスワードを入力"
            className="pr-10 bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 autofill:bg-white/10 autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] autofill:text-white"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transition-colors -translate-y-1/2 text-white/50 hover:text-white/80"
            aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {(error || authError) && (
        <div className="p-3 text-sm text-center text-red-300 rounded-lg border bg-red-500/20 border-red-500/30">
          {error || authError}
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
