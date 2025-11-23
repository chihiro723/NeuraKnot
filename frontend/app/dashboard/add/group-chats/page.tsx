"use client";

import { useRouter } from "next/navigation";
import { GroupChatCreationPanel } from "@/components/group-chat/GroupChatCreationPanel";
import { useIsMobile } from "@/lib/hooks/useResponsive";

/**
 * グループチャット作成ページ
 * サイドバーは layout.tsx で定義されている
 */
export default function AddGroupChatPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const handleBack = () => {
    router.push("/dashboard/add");
  };

  return <GroupChatCreationPanel onBack={handleBack} isDesktop={!isMobile} />;
}
