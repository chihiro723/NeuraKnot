"use client";

import { useRouter } from "next/navigation";
import { UserFriendAddPanel } from "@/components/friends/AddFriendsPanel";
import { useIsMobile } from "@/lib/hooks/useResponsive";

/**
 * ユーザー追加ページ
 * サイドバーは layout.tsx で定義されている
 */
export default function AddUserPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const handleBack = () => {
    router.push("/dashboard/add");
  };

  return <UserFriendAddPanel onBack={handleBack} isDesktop={!isMobile} />;
}
