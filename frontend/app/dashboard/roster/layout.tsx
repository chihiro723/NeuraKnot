import { Suspense } from "react";
import { listAIAgents } from "@/lib/actions/ai-agent";
import { getAuthUser } from "@/lib/actions/auth-queries";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { RosterListClient } from "@/components/friends/RosterListClient";
import { ChatListSkeleton } from "@/components/ui/skeletons/ChatListSkeleton";

/**
 * 一覧管理セクション全体のレイアウト
 * サイドバーは /roster と /roster/[id] で共有される（再ロードなし）
 */
export const revalidate = 60; // 60秒ごとに再検証

// データフェッチコンポーネント（1回だけ呼ばれる）
async function RosterListData() {
  const agentsResult = await listAIAgents();

  return (
    <RosterListClient
      initialAgents={agentsResult.success ? agentsResult.data : null}
    />
  );
}

export default async function RosterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // プロフィール情報を取得（DashboardSidebar で使用）
  const { profile } = await getAuthUser();

  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="一覧管理" profile={profile}>
          <Suspense fallback={<ChatListSkeleton />}>
            <RosterListData />
          </Suspense>
        </DashboardSidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
