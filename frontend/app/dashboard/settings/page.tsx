import { Settings } from "lucide-react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { SettingsListSidebar } from "@/components/settings/SettingsListSidebar";

/**
 * 設定ページ（サーバーコンポーネント）
 * デフォルト画面を表示
 */
export default function SettingsPage() {
  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="設定">
          <SettingsListSidebar />
        </DashboardSidebar>
      }
    >
      {/* デフォルト表示 */}
      <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="p-8 text-center">
          <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-2xl shadow-lg dark:bg-green-500/20 shadow-green-500/20">
            <Settings className="w-8 h-8 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            設定を選択
          </h3>
          <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
            左側から設定項目を選択してください
          </p>
        </div>
      </div>
    </SidebarLayout>
  );
}
