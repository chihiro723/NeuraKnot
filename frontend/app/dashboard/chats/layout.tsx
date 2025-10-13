import { Suspense } from "react";
import { listConversations } from "@/lib/actions/conversation";
import { listAIAgents } from "@/lib/actions/ai-agent";
import { getAuthUser } from "@/lib/actions/auth-queries";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ChatListClient } from "@/components/chat/ChatListClient";
import { ChatListSkeleton } from "@/components/ui/skeletons/ChatListSkeleton";

/**
 * チャットセクション全体のレイアウト
 * サイドバーは /chats と /chats/[id] で共有される（再ロードなし）
 */
export const revalidate = 60; // 60秒ごとに再検証

// データフェッチコンポーネント（1回だけ呼ばれる）
async function ChatListData() {
  const [conversationsResult, agentsResult] = await Promise.all([
    listConversations(),
    listAIAgents(),
  ]);

  return (
    <ChatListClient
      initialConversations={
        conversationsResult.success ? conversationsResult.data : null
      }
      initialAgents={agentsResult.success ? agentsResult.data : null}
    />
  );
}

export default async function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // プロフィール情報を取得（DashboardSidebar で使用）
  const { profile } = await getAuthUser();

  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="トーク" profile={profile}>
          <Suspense fallback={<ChatListSkeleton />}>
            <ChatListData />
          </Suspense>
        </DashboardSidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
