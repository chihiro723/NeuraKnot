"use client";

import { LandingPage } from "@/components/landing/LandingPage";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";
import type { UserProfile } from "@/lib/auth/server";

export default function HomePage() {
  const { user } = useCognitoAuth();

  // ユーザー情報からプロフィールを生成
  const profile: UserProfile | null = user
    ? {
        id: user.id,
        username: user.email.split("@")[0],
        display_name: user.display_name,
        avatar_url: null,
        status: "online" as const,
        created_at: user.created_at,
      }
    : null;

  // ユーザーデータを簡略化
  const simpleUser = user
    ? {
        id: user.id,
        email: user.email,
        name: user.display_name,
        avatar_url: null,
        created_at: user.created_at,
      }
    : null;

  return <LandingPage user={simpleUser} profile={profile} />;
}
