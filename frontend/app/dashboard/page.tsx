"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";

export default function DashboardPage() {
  const { user, loading } = useCognitoAuth();
  const router = useRouter();

  useEffect(() => {
    // ローディングが完了して、ユーザーが未認証の場合はログインページへ
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  // ローディング中
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">読み込み中...</div>
      </div>
    );
  }

  // 未認証（リダイレクト前）
  if (!user) {
    return null;
  }

  return <DashboardContent />;
}
