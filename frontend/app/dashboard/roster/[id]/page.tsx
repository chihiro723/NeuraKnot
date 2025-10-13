import { Suspense } from "react";
import { notFound } from "next/navigation";
import { listAIAgents } from "@/lib/actions/ai-agent-actions";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { RosterListClient } from "@/components/friends/RosterListClient";
import { FriendDetailPanel } from "@/components/friends/FriendDetailPanel";
import { ChatListSkeleton } from "@/components/ui/skeletons/ChatListSkeleton";
import { FriendDetailSkeleton } from "@/components/ui/skeletons/FriendDetailSkeleton";
import { devDelayCustom } from "@/lib/utils/dev-delay";

/**
 * 友だち詳細ページ（サーバーコンポーネント）
 * URLパラメータから友だちIDを取得してSSRで表示
 */
export const revalidate = 60; // 60秒ごとに再検証

interface FriendDetailPageProps {
  params: {
    id: string;
  };
}

/**
 * サイドバーのロスターリストデータを取得
 * 詳細ページでは遅延なし（高速ロード）
 */
async function RosterListData() {
  const agentsResult = await listAIAgents();

  return (
    <RosterListClient
      initialAgents={agentsResult.success ? agentsResult.data : null}
    />
  );
}

/**
 * 友だち詳細データを取得
 */
async function FriendDetailData({ friendId }: { friendId: string }) {
  // スケルトンUI確認用の遅延（環境変数で制御）
  // await devDelayCustom();

  // サーバーサイドでデータフェッチ
  const agentsResult = await listAIAgents();

  const agents = agentsResult.success ? agentsResult.data?.agents || [] : [];

  // friendIdに該当するエージェントを検索
  const agent = agents.find((a: any) => a.id === friendId);

  // 友だちが見つからない場合は404
  if (!agent) {
    notFound();
  }

  // 友だちデータを整形
  const friendData = {
    id: agent.id,
    type: "ai" as const,
    name: agent.name,
    avatar_url: agent.avatar_url,
    status: "online" as const,
    personality_preset: agent.persona_type,
    created_at: agent.created_at,
    description:
      agent.description ||
      `${agent.name}は${agent.persona_type}タイプのAIエージェントです。`,
  };

  return <FriendDetailPanel friend={friendData} />;
}

export default async function FriendDetailPage({
  params,
}: FriendDetailPageProps) {
  const { id: friendId } = await params;

  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="一覧管理">
          <Suspense fallback={<ChatListSkeleton />}>
            <RosterListData />
          </Suspense>
        </DashboardSidebar>
      }
    >
      <Suspense fallback={<FriendDetailSkeleton />}>
        <FriendDetailData friendId={friendId} />
      </Suspense>
    </SidebarLayout>
  );
}
