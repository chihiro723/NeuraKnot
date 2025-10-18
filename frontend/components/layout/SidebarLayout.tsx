"use client";

import { useIsMobile, useIsDetailPage } from "@/lib/hooks/useResponsive";

interface SidebarLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 2カラムレイアウト: サイドバー + メインコンテンツ
 *
 * デスクトップ: サイドバー + メインコンテンツの2カラム表示
 * モバイル:
 *   - 一覧ページ: サイドバーのみ表示
 *   - 詳細ページ: メインコンテンツのみ表示
 */
export function SidebarLayout({ sidebar, children }: SidebarLayoutProps) {
  const isMobile = useIsMobile();
  const isDetailPage = useIsDetailPage();

  // デスクトップ: 常に2カラム表示（既存の動作）
  if (!isMobile) {
    return (
      <div className="flex overflow-hidden flex-1">
        {/* 中央：サイドバー */}
        {sidebar}

        {/* 右側：メインコンテンツ */}
        <div className="flex overflow-hidden flex-col flex-1 min-w-0">
          {children}
        </div>
      </div>
    );
  }

  // モバイル: 一覧ページはサイドバーのみ表示
  if (!isDetailPage) {
    return <div className="flex overflow-hidden flex-1">{sidebar}</div>;
  }

  // モバイル: 詳細ページはメインコンテンツのみ表示
  return <div className="flex overflow-hidden flex-col flex-1">{children}</div>;
}
