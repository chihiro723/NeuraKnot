"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";

/**
 * サインアウトボタンコンポーネント
 * ユーザーのログアウト処理を実行
 */
export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { signOut } = useCognitoAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      setIsLoading(true);

      // サインアウト処理を実行
      await signOut();

      // ログインページにリダイレクト
      router.push("/auth/login");
    } catch (error) {
      console.error("Sign out error:", error);
      // エラーが発生してもログインページにリダイレクト
      router.push("/auth/login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className={cn(
        "w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
        "bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30",
        "text-red-600 dark:text-red-400",
        "border border-red-200 dark:border-red-800",
        "hover:shadow-sm transform hover:scale-[1.02]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
          サインアウト中...
        </>
      ) : (
        <>
          <LogOut className="mr-2 w-4 h-4" />
          サインアウト
        </>
      )}
    </button>
  );
}
