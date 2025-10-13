import { getAuthUser } from "@/lib/actions/auth-queries";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { AddTypeSidebar } from "@/components/friends/AddTypeSidebar";

/**
 * 新規追加セクション全体のレイアウト
 * サイドバーは /add の各ページで共有される（再ロードなし）
 */
export default async function AddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // プロフィール情報を取得（DashboardSidebar で使用）
  const { profile } = await getAuthUser();

  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="新規追加" profile={profile}>
          <AddTypeSidebar />
        </DashboardSidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
