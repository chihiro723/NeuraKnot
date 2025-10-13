import React from "react";
import { Search } from "lucide-react";

/**
 * チャットリストのスケルトンローディング
 * 検索窓とフィルターは静的UIとして表示、リストアイテムのみスケルトン
 */
export function ChatListSkeleton() {
  const filters = [
    { id: "all", label: "All" },
    { id: "users", label: "User" },
    { id: "ai", label: "Agent" },
    { id: "groups", label: "Group" },
  ];

  return (
    <div className="flex flex-col h-full bg-white transition-colors duration-200 lg:border-r-0 dark:bg-gray-900">
      {/* モバイル用検索バー */}
      <div className="p-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700 lg:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transition-colors -translate-y-1/2" />
          <input
            type="text"
            placeholder="検索"
            disabled
            className="py-2 pr-10 pl-10 w-full placeholder-gray-500 text-gray-900 bg-gray-50 rounded-lg border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* デスクトップ用検索バー */}
      <div className="hidden p-4 bg-white border-b border-gray-200 lg:block dark:bg-gray-900 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transition-colors -translate-y-1/2" />
          <input
            type="text"
            placeholder="検索"
            disabled
            className="py-1.5 pr-10 pl-10 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 transition-colors placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* フィルタータブ */}
      <div className="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex">
          {filters.map((filter, i) => (
            <button
              key={filter.id}
              disabled
              className={`flex flex-1 justify-center items-center px-3 py-3 transition-all duration-200 ${
                i === 0
                  ? "text-green-500 bg-green-50 border-b-2 border-green-500 dark:text-green-400 dark:bg-green-900/20 dark:border-green-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <span className="text-sm font-medium">{filter.label} (0)</span>
            </button>
          ))}
        </div>
      </div>

      {/* チャットアイテムのスケルトン */}
      <div className="overflow-y-auto flex-1">
        <div className="pb-4 divide-y divide-gray-100 lg:pb-0 dark:divide-gray-800">
          {Array.from({ length: 8 }).map((_, i) => {
            // 名前とサブテキストの長さをバリエーション
            const nameWidths = [
              "w-24",
              "w-28",
              "w-20",
              "w-32",
              "w-24",
              "w-28",
              "w-20",
              "w-24",
            ];
            const subtextWidths = [
              "w-2/3",
              "w-3/4",
              "w-1/2",
              "w-4/5",
              "w-3/5",
              "w-2/3",
              "w-3/4",
              "w-1/2",
            ];

            return (
              <div
                key={i}
                className="p-3 w-full transition-all lg:border-b lg:border-gray-100 dark:lg:border-gray-800 last:border-b-0"
              >
                <div className="flex items-center space-x-3">
                  {/* アバター */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />
                  </div>

                  {/* コンテンツ */}
                  <div className="flex-1 space-y-2 min-w-0">
                    {/* 名前 */}
                    <div
                      className={`h-4 bg-gray-200 rounded animate-pulse ${nameWidths[i]} dark:bg-gray-700`}
                    />
                    {/* サブテキスト */}
                    <div
                      className={`h-3 bg-gray-100 rounded animate-pulse ${subtextWidths[i]} dark:bg-gray-600`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
