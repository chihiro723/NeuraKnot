"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";

function AuthCallbackContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState("");

  const { handleOAuthCallback } = useCognitoAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const provider = searchParams.get("provider") as
          | "google"
          | "line"
          | "twitter";

        if (!code || !provider) {
          throw new Error("認証パラメータが不足しています");
        }

        await handleOAuthCallback(code, state, provider);

        setStatus("success");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (err) {
        console.error("OAuth認証エラー:", err);
        setError(err instanceof Error ? err.message : "認証に失敗しました");
        setStatus("error");
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, router]);

  if (status === "loading") {
    return <LoadingSpinner centerScreen variant="auth" />;
  }

  if (status === "error") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center p-8 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/10 border-white/20">
          <div className="mb-4 text-xl text-red-400">認証エラー</div>
          <p className="mb-4 text-white/70">{error}</p>
          <button
            onClick={() => router.push("/auth/login")}
            className="px-4 py-2 text-white bg-emerald-600 rounded hover:bg-emerald-700"
          >
            ログインページに戻る
          </button>
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
      <div className="relative z-10 text-center p-8 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/10 border-white/20">
        <div className="mb-4 text-xl text-emerald-400">認証成功</div>
        <p className="text-white/70">
          ダッシュボードにリダイレクトしています...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner centerScreen variant="auth" />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
