import React from "react";

/**
 * チャットウィンドウのスケルトンローディング
 * 実際のChatWindowと構造を一致させたスケルトンUI
 */
export function ChatWindowSkeleton() {
  return (
    <>
      {/* ヘッダーのスケルトン */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          {/* アバター */}
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />

          {/* 名前と状態 */}
          <div className="space-y-2">
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
            <div className="w-32 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-700" />
          <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-700" />
          <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-700" />
        </div>
      </div>

      {/* メッセージエリアのスケルトン */}
      <div className="overflow-y-auto overflow-x-hidden flex-1 p-4 bg-gray-50 lg:p-6 dark:bg-gray-900">
        <div className="space-y-6">
          {/* AIメッセージのスケルトン（左側） */}
          <div className="flex justify-start">
            <div className="flex items-end space-x-3 max-w-[85%] lg:max-w-[75%]">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />
              <div className="flex flex-col space-y-1 min-w-0">
                <div className="w-20 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                <div className="flex space-x-2 min-w-0">
                  <div className="w-64 h-16 bg-gray-200 rounded-2xl rounded-tl-sm animate-pulse dark:bg-gray-700" />
                  <div className="flex-shrink-0 self-end pb-1 w-12 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                </div>
              </div>
            </div>
          </div>

          {/* ユーザーメッセージのスケルトン（右側） */}
          <div className="flex justify-end">
            <div className="flex flex-row-reverse items-end space-x-3 space-x-reverse max-w-[85%] lg:max-w-[75%]">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />
              <div className="flex flex-col items-end space-y-1 min-w-0">
                <div className="w-16 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                <div className="flex space-x-2 min-w-0">
                  <div className="flex-shrink-0 self-end pb-1 w-12 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                  <div className="w-56 h-12 bg-gray-200 rounded-2xl rounded-tr-sm animate-pulse dark:bg-gray-700" />
                </div>
              </div>
            </div>
          </div>

          {/* AIメッセージのスケルトン（左側） */}
          <div className="flex justify-start">
            <div className="flex items-end space-x-3 max-w-[85%] lg:max-w-[75%]">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />
              <div className="flex flex-col space-y-1 min-w-0">
                <div className="w-24 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                <div className="flex space-x-2 min-w-0">
                  <div className="w-72 h-20 bg-gray-200 rounded-2xl rounded-tl-sm animate-pulse dark:bg-gray-700" />
                  <div className="flex-shrink-0 self-end pb-1 w-12 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                </div>
              </div>
            </div>
          </div>

          {/* ユーザーメッセージのスケルトン（右側） */}
          <div className="flex justify-end">
            <div className="flex flex-row-reverse items-end space-x-3 space-x-reverse max-w-[85%] lg:max-w-[75%]">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />
              <div className="flex flex-col items-end space-y-1 min-w-0">
                <div className="w-16 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                <div className="flex space-x-2 min-w-0">
                  <div className="flex-shrink-0 self-end pb-1 w-12 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                  <div className="w-48 h-14 bg-gray-200 rounded-2xl rounded-tr-sm animate-pulse dark:bg-gray-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 入力エリアのスケルトン */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="relative w-full">
          {/* 入力コンテナ */}
          <div className="flex flex-col gap-2 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600">
            {/* テキストエリア */}
            <div className="w-full h-8 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />

            {/* ボタン類 */}
            <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-600">
              <div className="flex gap-1 items-center">
                {/* アクションボタン */}
                <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-600" />
                <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-600" />
              </div>

              {/* 送信ボタン */}
              <div className="w-16 h-8 bg-gray-100 rounded-xl animate-pulse dark:bg-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
