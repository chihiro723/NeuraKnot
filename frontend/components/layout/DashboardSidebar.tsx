"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import type { Profile } from "@/lib/types";

interface DashboardSidebarProps {
  title: string;
  children: React.ReactNode;
  profile: Profile;
}

/**
 * ダッシュボード共通サイドバー
 * リサイズ可能で、ヘッダー付きサイドバーコンテナ
 */
export function DashboardSidebar({
  title,
  children,
  profile,
}: DashboardSidebarProps) {
  // サイドバーの幅を管理（初期値は常に384、useEffectでlocalStorageから読み込む）
  const [sidebarWidth, setSidebarWidth] = useState(384); // デフォルト値: 96 * 4 = 384px (w-96)
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // クライアント側でのみ localStorage から幅を読み込む（ハイドレーションミスマッチを防ぐ）
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarWidth");
      if (saved) {
        setSidebarWidth(parseInt(saved, 10));
      }
    }
  }, []);

  // リサイズ開始
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  // リサイズ中
  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth = e.clientX - 80; // 80px は AppNavigation の幅
        // 最小幅280px、最大幅600px
        if (newWidth >= 280 && newWidth <= 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  // リサイズ終了
  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  // マウスイベントの登録・解除
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResizing);
    } else {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResizing);
    }

    return () => {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // サイドバーの幅をローカルストレージに保存（リサイズ終了時）
  useEffect(() => {
    if (!isResizing && typeof window !== "undefined") {
      localStorage.setItem("sidebarWidth", sidebarWidth.toString());
    }
  }, [sidebarWidth, isResizing]);

  return (
    <div
      ref={sidebarRef}
      style={{ width: `${sidebarWidth}px` }}
      className="flex relative flex-col flex-shrink-0 bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-700"
    >
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-4 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-white">
            {title}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {profile.display_name}
          </span>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="overflow-hidden flex-1">{children}</div>

      {/* リサイズハンドル */}
      <div
        onMouseDown={startResizing}
        className={cn(
          "absolute top-0 right-0 w-1 h-full cursor-col-resize transition-all duration-200 z-50",
          isResizing
            ? "bg-green-500 w-1"
            : "bg-gray-300 dark:bg-gray-600 opacity-0 hover:opacity-100 hover:w-1.5"
        )}
      >
        {/* ドラッグ可能エリアを拡大（UX向上） */}
        <div className="absolute inset-y-0 -right-2 -left-2 w-5" />
      </div>
    </div>
  );
}
