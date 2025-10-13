import { Suspense } from "react";
import { Users } from "lucide-react";
import { listAIAgents } from "@/lib/actions/ai-agent-actions";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { RosterListClient } from "@/components/friends/RosterListClient";
import { ChatListSkeleton } from "@/components/ui/skeletons/ChatListSkeleton";
import { devDelayCustom } from "@/lib/utils/dev-delay";

/**
 * Roster一覧ページ（サーバーコンポーネント）
 * Suspenseを使用して部分的なローディングを実現
 */
export const revalidate = 60; // 60秒ごとに再検証

// データフェッチコンポーネント
async function RosterListData() {
  // スケルトンUI確認用の遅延（環境変数で制御）
  // await devDelayCustom();

  const agentsResult = await listAIAgents();

  return (
    <RosterListClient
      initialAgents={agentsResult.success ? agentsResult.data : null}
    />
  );
}

export default function RosterPage() {
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
      {/* メインコンテンツ: 友だち未選択時の画面 */}
      <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="p-8 text-center">
          <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-2xl shadow-lg dark:bg-green-500/20 shadow-green-500/20">
            <Users className="w-8 h-8 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            友だちを選択
          </h3>
          <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
            左側から友だちやエージェントを選択して詳細を表示します
          </p>
        </div>
      </div>
    </SidebarLayout>
  );
}
