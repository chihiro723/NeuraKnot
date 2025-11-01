import { getAuthUser } from "@/lib/actions/auth-queries";
import { ProfileSettingsPanel } from "@/components/settings/ProfileSettingsPanel";

/**
 * プロフィール設定ページ（サーバーコンポーネント）
 * サイドバーは layout.tsx で定義されている
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProfileSettingsPage() {
  const { user, profile } = await getAuthUser();

  return <ProfileSettingsPanel user={user} profile={profile} key={profile.avatar_url || profile.updated_at} />;
}
