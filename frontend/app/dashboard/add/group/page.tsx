"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getAuthUser } from "@/lib/actions/auth-queries";
import { GroupCreationPanel } from "@/components/friends/AddFriendsPanel";
import type { AuthUser } from "@/lib/types/auth";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";
import { useIsMobile } from "@/lib/hooks/useResponsive";

/**
 * グループ作成ページ
 * サイドバーは layout.tsx で定義されている
 */
export default function AddGroupPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { user: userData } = await getAuthUser();
        setUser(userData);
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleBack = () => {
    router.push("/dashboard/add");
  };

  if (loading || !user) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <GroupCreationPanel onBack={handleBack} isDesktop={!isMobile} user={user} />
  );
}
