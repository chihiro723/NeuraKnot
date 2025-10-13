"use client";

import { GroupCreationPanel } from "@/components/friends/AddFriendsPanel";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { AddTypeSidebar } from "@/components/friends/AddTypeSidebar";

/**
 * グループ作成ページ
 */
export default function AddGroupPage() {
  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="新規追加">
          <AddTypeSidebar />
        </DashboardSidebar>
      }
    >
      <GroupCreationPanel onBack={() => {}} isDesktop />
    </SidebarLayout>
  );
}
