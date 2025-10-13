"use client";

import { AIAgentCreationPanel } from "@/components/friends/AddFriendsPanel";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { AddTypeSidebar } from "@/components/friends/AddTypeSidebar";

/**
 * AIエージェント作成ページ
 */
export default function AddAIPage() {
  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="新規追加">
          <AddTypeSidebar />
        </DashboardSidebar>
      }
    >
      <AIAgentCreationPanel onBack={() => {}} isDesktop />
    </SidebarLayout>
  );
}
