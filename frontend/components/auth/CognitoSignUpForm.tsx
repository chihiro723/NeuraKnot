"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff } from "lucide-react";

// バリデーション関数
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function CognitoSignUpForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { signUp } = useCognitoAuth();
  const router = useRouter();

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
    if (!emailRegex.test(formData.email)) {
      setError("有効なメールアドレスを入力してください");
      setLoading(false);
      return;
    }

    if (formData.displayName.length < 1 || formData.displayName.length > 50) {
      setError("表示名は1〜50文字で入力してください");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("パスワードと確認パスワードが一致しません");
      setLoading(false);
      return;
    }

    try {
      await signUp({
        email: formData.email.toLowerCase(),
        password: formData.password,
        display_name: formData.displayName,
      });

      // メールアドレスとパスワードをsessionStorageに保存（自動ログイン用）
      sessionStorage.setItem("verify_email", formData.email.toLowerCase());
      sessionStorage.setItem("verify_password", formData.password);
      // 認証コード入力ページへ遷移
      router.push("/auth/verify");
    } catch (err) {
      console.error("SignUpエラー:", err);
      // エラー時はsessionStorageをクリア
      sessionStorage.removeItem("verify_email");
      sessionStorage.removeItem("verify_password");
      setError(
        err instanceof Error ? err.message : "アカウント作成に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
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
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 autofill:bg-white/10 autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] autofill:text-white"
          placeholder="your@email.com"
          autoFocus
        />
      </div>

      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-white/90"
        >
          表示名
        </label>
        <Input
          id="displayName"
          name="displayName"
          type="text"
          value={formData.displayName}
          onChange={handleChange}
          required
          minLength={1}
          maxLength={50}
          className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 autofill:bg-white/10 autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] autofill:text-white"
          placeholder="太郎"
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
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
            placeholder="8文字以上のパスワード"
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

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-white/90"
        >
          パスワード確認
        </label>
        <div className="relative mt-1">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            minLength={8}
            placeholder="パスワードを再入力"
            className="pr-10 bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 autofill:bg-white/10 autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] autofill:text-white"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transition-colors -translate-y-1/2 text-white/50 hover:text-white/80"
            aria-label={
              showConfirmPassword ? "パスワードを隠す" : "パスワードを表示"
            }
          >
            {showConfirmPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-center text-red-300 rounded-lg border bg-red-500/20 border-red-500/30">
          {error}
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "サインアップ中..." : "サインアップ"}
        </Button>
      </div>
    </form>
  );
}
