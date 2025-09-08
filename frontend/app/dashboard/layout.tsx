import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/server";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";

/**
 * ダッシュボードレイアウト（認証必須）
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log("DashboardLayout");
  await cookies();
  const supabase = await createClient();

  console.log("supabase", supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect(
      "/dashboard/error?message=" +
        encodeURIComponent(
          "プロフィールが見つかりません。アカウントが正しく設定されていない可能性があります。"
        )
    );
  }

  return (
    <DashboardProvider user={user} profile={profile}>
      <ResponsiveLayout>{children}</ResponsiveLayout>
    </DashboardProvider>
  );
}
