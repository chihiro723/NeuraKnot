import { getAuthUser } from "@/lib/actions/auth-queries";
import { ProfileSettingsPanel } from "@/components/settings/ProfileSettingsPanel";

/**
 * プロフィール設定ページ（サーバーコンポーネント）
 * サイドバーは layout.tsx で定義されている
 */
export default async function ProfileSettingsPage() {
  const { user, profile } = await getAuthUser();

  return <ProfileSettingsPanel user={user} profile={profile} />;
}
