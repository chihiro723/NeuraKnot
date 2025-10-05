"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

/**
 * ダッシュボードレイアウト（認証必須）
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useCognitoAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Cognitoのユーザー情報をプロフィール形式に変換
  const profile = {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.preferred_username,
    display_name: user.display_name,
    status: "online",
    created_at: user.created_at,
    updated_at: user.updated_at,
  };

  return (
    <DashboardProvider user={user} profile={profile}>
      <ResponsiveLayout>{children}</ResponsiveLayout>
    </DashboardProvider>
  );
}
