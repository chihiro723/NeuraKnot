import { getAuthUser } from "@/lib/actions/auth-queries";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ServiceListSidebar } from "@/components/services/ServiceListSidebar";

/**
 * 外部サービスセクション全体のレイアウト
 * サイドバーは /services の各ページで共有される（再ロードなし）
 */
export default async function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getAuthUser();

  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="外部サービス" profile={profile}>
          <ServiceListSidebar />
        </DashboardSidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
