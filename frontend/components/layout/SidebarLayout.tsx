"use client";

interface SidebarLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 2カラムレイアウト: サイドバー + メインコンテンツ
 * AppNavigation は親の dashboard/layout.tsx で表示されます
 */
export function SidebarLayout({ sidebar, children }: SidebarLayoutProps) {
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
