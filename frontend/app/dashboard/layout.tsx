import { getAuthUser } from "@/lib/actions/auth-queries";
import { AppNavigation } from "@/components/layout/AppNavigation";

/**
 * ダッシュボードレイアウト（認証必須）
 * Server Component として認証情報を取得し、子コンポーネントに提供
 * 各セクションの layout.tsx がレイアウトを提供
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // サーバー側で認証ユーザー情報を取得
  // 認証失敗時は自動的に /auth/login にリダイレクト
  const { user, profile } = await getAuthUser();

  return (
    <div className="flex overflow-hidden h-screen bg-gray-50 dark:bg-gray-950">
      {/* 左側ナビゲーション */}
      <AppNavigation profile={profile} user={user} />

      {/* メインコンテンツエリア */}
      <div className="flex overflow-hidden flex-col flex-1">{children}</div>
    </div>
  );
}
