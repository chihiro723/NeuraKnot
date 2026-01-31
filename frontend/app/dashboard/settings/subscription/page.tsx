import { Suspense } from "react";
import { getTiers, getUsage } from "@/lib/actions/billing";
import { SubscriptionClient } from "@/components/subscription/SubscriptionClient";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";

/**
 * サブスクリプション管理ページ（サーバーコンポーネント）
 */
export const dynamic = 'force-dynamic'; // cookies()とno-store fetchを使用するため動的レンダリング必須

async function SubscriptionData() {
  // サーバーサイドでデータフェッチ
  const [tiersResult, usageResult] = await Promise.all([
    getTiers(),
    getUsage(),
  ]);

  const tiers = tiersResult.success && tiersResult.data ? tiersResult.data : [];
  const usage = usageResult.success && usageResult.data ? usageResult.data : null;

  return <SubscriptionClient tiers={tiers} usage={usage} />;
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-full">
          <LoadingSpinner />
        </div>
      }
    >
      <SubscriptionData />
    </Suspense>
  );
}
