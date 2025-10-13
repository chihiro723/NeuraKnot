"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorDisplayProps {
  error: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  description?: string;
}

/**
 * エラー表示コンポーネント
 * 統一されたエラーUIを提供
 */
export function ErrorDisplay({
  error,
  reset,
  title = "エラーが発生しました",
  description = "問題が発生しました。もう一度お試しください。",
}: ErrorDisplayProps) {
  useEffect(() => {
    // エラーをコンソールに記録
    console.error("Error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-8 max-w-md text-center">
        {/* エラーアイコン */}
        <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 bg-red-100 rounded-2xl shadow-lg animate-pulse dark:bg-red-500/20 shadow-red-500/20">
          <AlertCircle className="w-10 h-10 text-red-600 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)] dark:text-red-400" />
        </div>

        {/* タイトル */}
        <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h2>

        {/* 説明 */}
        <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          {description}
        </p>

        {/* エラー詳細（開発環境のみ） */}
        {process.env.NODE_ENV === "development" && (
          <div className="p-4 mb-6 text-xs text-left bg-gray-100 rounded-lg dark:bg-gray-800">
            <p className="mb-2 font-mono font-semibold text-red-600 dark:text-red-400">
              {error.message}
            </p>
            {error.digest && (
              <p className="font-mono text-gray-500 dark:text-gray-400">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-3 justify-center">
          {reset && (
            <button
              onClick={reset}
              className="inline-flex gap-2 items-center px-6 py-3 text-sm font-medium text-white bg-green-500 rounded-lg shadow-lg transition-all duration-200 hover:bg-green-600 hover:shadow-xl hover:scale-105 active:scale-95 dark:bg-green-600 dark:hover:bg-green-700"
            >
              <RefreshCw className="w-4 h-4" />
              再試行
            </button>
          )}
          <button
            onClick={() => (window.location.href = "/dashboard/chats")}
            className="inline-flex gap-2 items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 shadow transition-all duration-200 hover:bg-gray-50 hover:shadow-md hover:scale-105 active:scale-95 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
