import { UserFriendAddPanel } from "@/components/friends/AddFriendsPanel";

/**
 * ユーザー追加ページ（サーバーコンポーネント）
 * サイドバーは layout.tsx で定義されている
 */
export default function AddUserPage() {
  return <UserFriendAddPanel onBack={() => {}} isDesktop />;
}
