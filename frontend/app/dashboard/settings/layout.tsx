import { getAuthUser } from "@/lib/actions/auth-queries";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { SettingsListSidebar } from "@/components/settings/SettingsListSidebar";

/**
 * 設定セクション全体のレイアウト
 * サイドバーは /settings の各ページで共有される（再ロードなし）
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // プロフィール情報を取得（DashboardSidebar と SettingsListSidebar で使用）
  const { profile } = await getAuthUser();

  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="設定" profile={profile}>
          <SettingsListSidebar profile={profile} />
        </DashboardSidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
