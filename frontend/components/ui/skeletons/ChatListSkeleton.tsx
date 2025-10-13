import React from "react";

/**
 * チャットリストのスケルトンローディング
 * 実際のChatListClientの構造と一致させたスケルトンUI
 */
export function ChatListSkeleton() {
  return (
    <div className="flex flex-col h-full bg-white transition-colors duration-200 lg:border-r-0 dark:bg-gray-900">
      {/* モバイル用検索バーのスケルトン */}
      <div className="p-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700 lg:hidden">
        <div className="h-10 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-800" />
      </div>

      {/* デスクトップ用検索バーのスケルトン */}
      <div className="hidden p-4 bg-white border-b border-gray-200 lg:block dark:bg-gray-900 dark:border-gray-700">
        <div className="h-10 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-800" />
      </div>

      {/* フィルタータブのスケルトン */}
      <div className="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-1 justify-center items-center px-3 py-3"
            >
              <div className="w-16 h-5 bg-gray-100 rounded animate-pulse dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>

      {/* チャットアイテムのスケルトン */}
      <div className="overflow-y-auto flex-1">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-3">
              <div className="flex items-center space-x-3">
                {/* アバター */}
                <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />

                {/* コンテンツ */}
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <div className="w-24 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                    <div className="w-12 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
