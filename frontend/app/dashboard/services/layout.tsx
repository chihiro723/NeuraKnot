import { getAuthUser } from "@/lib/actions/auth-queries";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ServiceTypeSidebar } from "@/components/mcp/ServiceTypeSidebar";

/**
 * 外部サービスセクション全体のレイアウト
 * サイドバーは /services の各ページで共有される（再ロードなし）
 */
export default async function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // プロフィール情報を取得（DashboardSidebar で使用）
  const { profile } = await getAuthUser();

  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="外部サービス" profile={profile}>
          <ServiceTypeSidebar />
        </DashboardSidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
