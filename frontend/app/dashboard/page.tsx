"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";

/**
 * ダッシュボードのルートページ
 * /dashboard/chatsへリダイレクト
 */
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/chats");
  }, [router]);

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <LoadingSpinner centerScreen />
    </div>
  );
}
