import { getAuthUser } from "@/lib/actions/auth-queries";
import { DashboardLayoutClient } from "./DashboardLayoutClient";

/**
 * ダッシュボードレイアウト（認証必須）
 * Server Component として認証情報を取得し、子コンポーネントに提供
 * 各セクションの layout.tsx がレイアウトを提供
 *
 * デスクトップ: 左側にナビゲーション
 * モバイル: 下部にナビゲーション（詳細画面では非表示）
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
    <DashboardLayoutClient profile={profile} user={user}>
      {children}
    </DashboardLayoutClient>
  );
}
