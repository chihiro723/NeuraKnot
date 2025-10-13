"use client";

import { AIAgentCreationPanel } from "@/components/friends/AddFriendsPanel";

/**
 * AIエージェント作成ページ
 * サイドバーは layout.tsx で定義されている
 */
export default function AddAIPage() {
  return <AIAgentCreationPanel onBack={() => {}} isDesktop />;
}
