import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { SettingsListSidebar } from "@/components/settings/SettingsListSidebar";
import { ProfileSettingsPanel } from "@/components/settings/ProfileSettingsPanel";

/**
 * プロフィール設定ページ（サーバーコンポーネント）
 */
export default function ProfileSettingsPage() {
  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="設定">
          <SettingsListSidebar />
        </DashboardSidebar>
      }
    >
      <ProfileSettingsPanel />
    </SidebarLayout>
  );
}
