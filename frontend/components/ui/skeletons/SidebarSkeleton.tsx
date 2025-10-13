import React from "react";

/**
 * サイドバーのスケルトンローディング
 */
export function SidebarSkeleton() {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* ヘッダーのスケルトン */}
      <div className="flex justify-between items-center px-4 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex flex-col space-y-2">
          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
          <div className="w-20 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
        </div>
      </div>

      {/* コンテンツエリアのスケルトン */}
      <div className="overflow-hidden flex-1 p-4 space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-800"
          />
        ))}
      </div>
    </div>
  );
}
