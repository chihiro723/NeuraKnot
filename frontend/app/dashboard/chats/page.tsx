import { Suspense } from "react";
import { MessageCircle } from "lucide-react";
import { listConversations } from "@/lib/actions/conversation-actions";
import { listAIAgents } from "@/lib/actions/ai-agent-actions";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ChatListClient } from "@/components/chat/ChatListClient";
import { ChatListSkeleton } from "@/components/ui/skeletons/ChatListSkeleton";
import { devDelayCustom } from "@/lib/utils/dev-delay";

/**
 * チャット一覧ページ（サーバーコンポーネント）
 * Suspenseを使用して部分的なローディングを実現
 */
export const revalidate = 60; // 60秒ごとに再検証

// データフェッチコンポーネント
async function ChatListData() {
  // スケルトンUI確認用の遅延（環境変数で制御）
  // await devDelayCustom();

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

export default function ChatsPage() {
  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="トーク">
          <Suspense fallback={<ChatListSkeleton />}>
            <ChatListData />
          </Suspense>
        </DashboardSidebar>
      }
    >
      {/* メインコンテンツ: 会話未選択時の画面 */}
      <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="p-8 text-center">
          <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-2xl shadow-lg dark:bg-green-500/20 shadow-green-500/20">
            <MessageCircle className="w-8 h-8 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            会話を選択
          </h3>
          <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
            左側から会話を選んでトークを開始しましょう
          </p>
        </div>
      </div>
    </SidebarLayout>
  );
}
