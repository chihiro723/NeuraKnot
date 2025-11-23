import { Suspense } from "react";
import { notFound } from "next/navigation";
import { listAIAgents } from "@/lib/actions/ai-agent";
import { listGroupChats } from "@/lib/actions/group-chat";
import { FriendDetailPanel } from "@/components/friends/FriendDetailPanel";
import { GroupChatDetailPanel } from "@/components/group-chat/GroupChatDetailPanel";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";
import type { AIAgent } from "@/lib/types/agent";

/**
 * 友だち詳細ページ（サーバーコンポーネント）
 * URLパラメータから友だち/グループIDを取得してSSRで表示
 * サイドバーは layout.tsx で定義されている
 */
export const revalidate = 60; // 60秒ごとに再検証

interface FriendDetailPageProps {
  params: {
    id: string;
  };
}

/**
 * 友だち/グループ詳細データを取得
 */
async function FriendDetailData({ friendId }: { friendId: string }) {
  // サーバーサイドでデータフェッチ
  const [agentsResult, groupChatsResult] = await Promise.all([
    listAIAgents(),
    listGroupChats(),
  ]);

  const agents = agentsResult.success ? agentsResult.data?.agents || [] : [];
  const groupChats = groupChatsResult.success
    ? groupChatsResult.data?.group_chats || []
    : [];

  // エージェントを検索
  const agent = agents.find((a: AIAgent) => a.id === friendId);

  if (agent) {
    // エージェントが見つかった場合
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

  // グループチャットを検索
  const groupChat = groupChats.find((gc: any) => gc.id === friendId);

  if (groupChat) {
    // グループチャットデータをそのまま渡す（APIレスポンスに既にメンバー情報が含まれている）
    return <GroupChatDetailPanel groupChat={groupChat} />;
  }

  // どちらも見つからない場合は404
  notFound();
}

export default async function FriendDetailPage({
  params,
}: FriendDetailPageProps) {
  const { id: friendId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-full">
          <LoadingSpinner />
        </div>
      }
    >
      <FriendDetailData friendId={friendId} />
    </Suspense>
  );
}
