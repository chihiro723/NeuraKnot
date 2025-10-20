"use client";

import { AppNavigation } from "@/components/layout/AppNavigation";
import { useIsMobile, useIsDetailPage } from "@/lib/hooks/useResponsive";
import { cn } from "@/lib/utils/cn";
import type { Profile } from "@/lib/types";
import type { AuthUser } from "@/lib/types/auth";

interface DashboardLayoutClientProps {
  profile: Profile;
  user: AuthUser;
  children: React.ReactNode;
}

/**
 * ダッシュボードレイアウトのクライアントコンポーネント
 * レスポンシブ対応とナビゲーションの表示制御を行う
 */
export function DashboardLayoutClient({
  profile,
  user,
  children,
}: DashboardLayoutClientProps) {
  const isMobile = useIsMobile();
  const isDetailPage = useIsDetailPage();

  // モバイル詳細画面ではナビゲーションを非表示
  const showNavigation = !(isMobile && isDetailPage);

  return (
    <div className="flex overflow-hidden min-h-[var(--app-dvh)] bg-gray-50 dark:bg-gray-950">
      {/* ナビゲーション（モバイル詳細画面では非表示） */}
      {showNavigation && <AppNavigation profile={profile} user={user} />}

      {/* メインコンテンツエリア */}
      <div
        className={cn(
          "flex overflow-hidden flex-col flex-1",
          // モバイルでナビゲーションバーが表示される時のみ下部パディングを追加
          showNavigation && isMobile ? "pb-12" : "pb-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}
