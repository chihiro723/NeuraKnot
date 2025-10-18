"use client";

import { useRouter } from "next/navigation";
import { AIAgentCreationPanel } from "@/components/friends/AddFriendsPanel";
import { useIsMobile } from "@/lib/hooks/useResponsive";

/**
 * AIエージェント作成ページ
 * サイドバーは layout.tsx で定義されている
 */
export default function AddAIPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const handleBack = () => {
    router.push("/dashboard/add");
  };

  return <AIAgentCreationPanel onBack={handleBack} isDesktop={!isMobile} />;
}
