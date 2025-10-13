import React from "react";
import { SearchX } from "lucide-react";
import Link from "next/link";

interface NotFoundDisplayProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  backLink?: string;
  backLabel?: string;
}

/**
 * 404表示コンポーネント
 * 統一された404 UIを提供
 */
export function NotFoundDisplay({
  icon: Icon = SearchX,
  title = "ページが見つかりません",
  description = "お探しのページは存在しないか、削除された可能性があります。",
  backLink = "/dashboard/chats",
  backLabel = "ダッシュボードに戻る",
}: NotFoundDisplayProps) {
  return (
    <div className="flex flex-1 justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-8 max-w-md text-center">
        {/* アイコン */}
        <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 bg-gray-100 rounded-2xl shadow-lg dark:bg-gray-800 shadow-gray-500/20">
          <Icon className="w-10 h-10 text-gray-600 dark:text-gray-400" />
        </div>

        {/* タイトル */}
        <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h2>

        {/* 説明 */}
        <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          {description}
        </p>

        {/* 戻るボタン */}
        <Link
          href={backLink}
          className="inline-flex gap-2 items-center px-6 py-3 text-sm font-medium text-white bg-green-500 rounded-lg shadow-lg transition-all duration-200 hover:bg-green-600 hover:shadow-xl hover:scale-105 active:scale-95 dark:bg-green-600 dark:hover:bg-green-700"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
