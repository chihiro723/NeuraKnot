"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// バリデーション関数
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function CognitoSignUpForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });
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
      console.log("SignUp API呼び出し開始:", {
        email: formData.email.toLowerCase(),
        display_name: formData.displayName,
      });

      await signUp({
        email: formData.email.toLowerCase(),
        password: formData.password,
        display_name: formData.displayName,
      });

      console.log("SignUp成功");
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
          className="mt-1"
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
          className="mt-1"
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
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          minLength={8}
          className="mt-1"
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
          minLength={8}
          className="mt-1"
          placeholder="パスワードを再入力"
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div style={{ marginTop: "2rem" }}>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "サインアップ中..." : "サインアップ"}
        </Button>
      </div>
    </form>
  );
}
