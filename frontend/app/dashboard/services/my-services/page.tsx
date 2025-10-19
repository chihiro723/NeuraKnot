"use client";

import { useRouter } from "next/navigation";
import { Server, ArrowLeft } from "lucide-react";
import { ServiceList } from "@/components/services/ServiceList";
import { useIsMobile } from "@/lib/hooks/useResponsive";

/**
 * マイサービスページ
 * 登録済みサービスをカードグリッドで表示
 */
export default function MyServicesPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const handleBack = () => {
    router.push("/dashboard/services");
  };

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-4 h-16 bg-white border-b border-gray-200 md:h-16 md:px-6 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              マイサービス
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              登録されているサービス一覧
            </p>
          </div>
        </div>
        {/* 戻るボタン（モバイルのみ、右側に配置） */}
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

      {/* コンテンツ */}
      <div className="overflow-y-auto flex-1 p-4 bg-gray-50 md:p-6 dark:bg-gray-900">
        <ServiceList />
      </div>
    </div>
  );
}
