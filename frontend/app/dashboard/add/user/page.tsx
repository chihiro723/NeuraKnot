"use client";

import { UserFriendAddPanel } from "@/components/friends/AddFriendsPanel";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { AddTypeSidebar } from "@/components/friends/AddTypeSidebar";

/**
 * ユーザー追加ページ
 */
export default function AddUserPage() {
  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="新規追加">
          <AddTypeSidebar />
        </DashboardSidebar>
      }
    >
      <UserFriendAddPanel onBack={() => {}} isDesktop />
    </SidebarLayout>
  );
}
