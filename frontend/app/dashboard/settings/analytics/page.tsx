"use client";

import { useRouter } from "next/navigation";
import { BarChart3, ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/lib/hooks/useResponsive";

/**
 * 統計・分析ページ
 * サイドバーは layout.tsx で定義されている
 */
export default function AnalyticsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const handleBack = () => {
    router.push("/dashboard/settings");
  };

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
        {/* 戻るボタン（モバイルのみ、右側に配置） */}
        {isMobile && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center p-2 text-gray-600 bg-gray-50/80 transition-all duration-200 dark:text-gray-300 dark:bg-gray-800/50 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700 rounded-lg"
            title="戻る"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* コンテンツ */}
      <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="p-4 text-center md:p-8">
          <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-2xl shadow-lg dark:bg-green-500/20 shadow-green-500/20">
            <BarChart3 className="w-8 h-8 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            統計・分析
          </h3>
          <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
            近日追加予定の機能です
          </p>
        </div>
      </div>
    </div>
  );
}
