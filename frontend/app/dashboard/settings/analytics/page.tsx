"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { BarChart3, ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/lib/hooks/useResponsive";
import { getAnalytics } from "@/lib/actions/analytics";
import type { AnalyticsData, TimeRange } from "@/lib/types/analytics";
import { TimeRangeFilter } from "@/components/analytics/TimeRangeFilter";
import { TokenStatsSection } from "@/components/analytics/TokenStatsSection";
import { ActivityStatsSection } from "@/components/analytics/ActivityStatsSection";
import { AgentPerformanceSection } from "@/components/analytics/AgentPerformanceSection";
import { ToolUsageSection } from "@/components/analytics/ToolUsageSection";
import { ServiceStatsSection } from "@/components/analytics/ServiceStatsSection";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";
import { showToast } from "@/components/ui/ToastContainer";

/**
 * 統計・分析ページ
 * サイドバーは layout.tsx で定義されている
 */
export default function AnalyticsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const handleBack = () => {
    router.push("/dashboard/settings");
  };

  // 統計データを取得
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const data = await getAnalytics(timeRange);
        setAnalyticsData(data);
      } catch (error: unknown) {
        showToast({
          message:
            error instanceof Error
              ? error.message
              : "統計データの取得に失敗しました",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex justify-between items-center h-16 px-4 bg-white border-b border-gray-200 md:h-16 md:px-6 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              統計・分析
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              使用状況とパフォーマンス
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 期間フィルター */}
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

          {/* 戻るボタン（モバイルのみ） */}
          {isMobile && (
            <button
              onClick={handleBack}
              className="flex justify-center items-center p-2 text-gray-600 rounded-lg transition-all duration-200 bg-gray-50/80 dark:text-gray-300 dark:bg-gray-800/50 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700"
              title="戻る"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <LoadingSpinner />
          </div>
        ) : analyticsData ? (
          <div className="p-4 space-y-6 md:p-6 md:space-y-8">
            {/* トークン使用量とコスト */}
            <TokenStatsSection stats={analyticsData.token_stats} />

            {/* 活動量統計 */}
            <ActivityStatsSection stats={analyticsData.activity_stats} />

            {/* エージェント別パフォーマンス */}
            <AgentPerformanceSection agents={analyticsData.agent_performance} />

            {/* ツール使用統計 */}
            <ToolUsageSection stats={analyticsData.tool_usage_stats} />

            {/* サービス連携状況 */}
            <ServiceStatsSection stats={analyticsData.service_stats} />
          </div>
        ) : (
          <div className="flex flex-1 justify-center items-center h-full">
            <div className="p-4 text-center md:p-8">
              <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-red-100 rounded-2xl shadow-lg dark:bg-red-500/20">
                <BarChart3 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                データの取得に失敗しました
              </h3>
              <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
                統計データを取得できませんでした
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
