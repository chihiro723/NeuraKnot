"use client";

import { Suspense, memo, useCallback } from "react";
import { useDashboard } from "./DashboardProvider";
import { ChatListClient } from "@/components/chat/ChatListClient";
import { FriendsListClient } from "@/components/friends/FriendsListClient";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { AddFriendsPanel } from "@/components/friends/AddFriendsPanel";
import { MCPServicePanel } from "@/components/mcp/MCPServicePanel";

/**
 * ダッシュボードのメインコンテンツ
 */
const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
  </div>
));
LoadingSpinner.displayName = "LoadingSpinner";

const ErrorDisplay = memo(({ error }: { error: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-red-500">{error}</div>
  </div>
));
ErrorDisplay.displayName = "ErrorDisplay";

export const DashboardContent = memo(function DashboardContent() {
  let dashboardContext;
  try {
    dashboardContext = useDashboard();
  } catch (err) {
    console.error("Dashboard context error:", err);
    return (
      <ErrorDisplay error="エラー: ダッシュボードの初期化に失敗しました" />
    );
  }

  const { activeTab } = dashboardContext;

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case "chats":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ChatListClient />
          </Suspense>
        );
      case "friends":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <FriendsListClient />
          </Suspense>
        );
      case "add-friends":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AddFriendsPanel />
          </Suspense>
        );
      case "mcp-servers":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <MCPServicePanel />
          </Suspense>
        );
      case "settings":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SettingsPanel />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ChatListClient />
          </Suspense>
        );
    }
  }, [activeTab]);

  return <div className="h-full">{renderContent()}</div>;
});
