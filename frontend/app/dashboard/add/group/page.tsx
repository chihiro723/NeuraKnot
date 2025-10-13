import { getAuthUser } from "@/lib/actions/auth-queries";
import { GroupCreationPanel } from "@/components/friends/AddFriendsPanel";

/**
 * グループ作成ページ（サーバーコンポーネント）
 * サイドバーは layout.tsx で定義されている
 */
export default async function AddGroupPage() {
  const { user } = await getAuthUser();

  return <GroupCreationPanel onBack={() => {}} isDesktop user={user} />;
}
