"use client";

import { AppNavigation } from "./AppNavigation";

interface SidebarLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 3カラムレイアウト: 左ナビ + サイドバー + メインコンテンツ
 * デスクトップ専用（モバイルは別レイアウト）
 */
export function SidebarLayout({ sidebar, children }: SidebarLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 左側：アプリナビゲーション */}
      <AppNavigation />

      {/* 中央：サイドバー */}
      {sidebar}

      {/* 右側：メインコンテンツ */}
      <div className="flex overflow-hidden flex-col flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}


