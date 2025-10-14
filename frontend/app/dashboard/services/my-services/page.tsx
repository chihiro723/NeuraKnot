"use client";

import { useSearchParams } from "next/navigation";
import { Server, Plus } from "lucide-react";
import Link from "next/link";
import { ServiceList } from "@/components/services/ServiceList";

/**
 * マイサービスページ
 * 登録済みサービスをカードグリッドで表示
 */
export default function MyServicesPage() {
  const searchParams = useSearchParams();
  const highlightServiceId = searchParams.get("highlight");

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
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
      </div>

      {/* コンテンツ */}
      <div className="overflow-y-auto flex-1 p-6 bg-gray-50 dark:bg-gray-900">
        <ServiceList highlightedServiceId={highlightServiceId || undefined} />
      </div>
    </div>
  );
}
