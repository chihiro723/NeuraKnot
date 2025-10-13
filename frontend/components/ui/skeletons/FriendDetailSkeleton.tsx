/**
 * 友だち詳細のスケルトンローディング
 * 実際のFriendDetailPanelと構造を一致させたスケルトンUI
 */
export function FriendDetailSkeleton() {
  return (
    <>
      {/* ヘッダーのスケルトン */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-700" />
          <div className="space-y-2">
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
            <div className="w-32 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-700" />
          <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-700" />
          <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-700" />
          <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-700" />
        </div>
      </div>

      {/* メインコンテンツのスケルトン */}
      <div className="overflow-y-auto flex-1 bg-white dark:bg-gray-900">
        <div className="p-8 mx-auto space-y-10 max-w-2xl">
          {/* 基本情報セクション */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="w-24 h-6 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
            </div>

            <div className="space-y-4">
              {/* 名前 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="w-16 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                  <div className="w-32 h-5 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                </div>
              </div>

              {/* 説明 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="w-16 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                  <div className="w-full h-4 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                  <div className="w-3/4 h-4 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                </div>
              </div>

              {/* 作成日 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="w-16 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                  <div className="w-40 h-4 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                </div>
              </div>
            </div>
          </div>

          {/* エージェント情報セクション */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="w-40 h-6 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
            </div>

            <div className="space-y-4">
              {/* パーソナリティ */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="w-24 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                  <div className="w-36 h-5 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                </div>
              </div>

              {/* 説明 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="w-16 h-3 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                  <div className="w-full h-4 bg-gray-100 rounded animate-pulse dark:bg-gray-600" />
                </div>
              </div>
            </div>
          </div>

          {/* 設定セクション */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="w-20 h-6 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
                <div className="w-32 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                <div className="w-12 h-6 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
                <div className="w-40 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                <div className="w-12 h-6 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
