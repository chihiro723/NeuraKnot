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

        await handleOAuthCallback(provider, code, state || undefined);

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
    return <LoadingSpinner />;
  }

  if (status === "error") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 text-xl text-red-600">認証エラー</div>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={() => router.push("/auth/login")}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            ログインページに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <div className="mb-4 text-xl text-green-600">認証成功</div>
        <p className="text-gray-600">
          ダッシュボードにリダイレクトしています...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
