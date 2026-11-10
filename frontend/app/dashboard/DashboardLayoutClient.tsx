"use client";

import type { ReactNode } from "react";
import { AppNavigation } from "@/components/layout/AppNavigation";
import { useIsMobile, useIsDetailPage } from "@/lib/hooks/useResponsive";
import { useAutoTokenRefresh } from "@/lib/hooks/useAutoTokenRefresh";
import { LocalLLMProvider } from "@/lib/contexts/LocalLLMContext";
import { VoiceCallProvider } from "@/lib/contexts/VoiceCallContext";
import { VoiceCallHost } from "@/components/voice/VoiceCallHost";
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
  
  // トークンの自動リフレッシュを有効化
  useAutoTokenRefresh();

  // モバイル詳細画面ではナビゲーションを非表示
  const showNavigation = !(isMobile && isDetailPage);

  return (
    <LocalLLMProvider>
      <VoiceCallProvider>
        <DashboardShell
          profile={profile}
          user={user}
          showNavigation={showNavigation}
          isMobile={isMobile}
        >
          {children}
        </DashboardShell>
      </VoiceCallProvider>
    </LocalLLMProvider>
  );
}

function DashboardShell({
  profile,
  user,
  showNavigation,
  isMobile,
  children,
}: {
  profile: Profile;
  user: AuthUser;
  showNavigation: boolean;
  isMobile: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex overflow-hidden h-[var(--app-dvh)] md:h-screen bg-gray-50 dark:bg-gray-950">
      {showNavigation && <AppNavigation profile={profile} user={user} />}

      <div
        className={cn(
          "flex flex-col flex-1 overflow-y-auto overflow-x-hidden",
          showNavigation && isMobile ? "pb-12" : "pb-0",
        )}
      >
        {children}
      </div>

      <VoiceCallHost />
    </div>
  );
}
