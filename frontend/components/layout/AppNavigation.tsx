"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVIGATION_TABS } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";
import { useIsMobile } from "@/lib/hooks/useResponsive";
import type { Profile } from "@/lib/types";
import type { AuthUser } from "@/lib/types/auth";

interface AppNavigationProps {
  profile: Profile;
  user: AuthUser;
}

/**
 * アプリケーションナビゲーション
 * デスクトップ: 左側の縦型ナビゲーション
 * モバイル: 下部の横型ナビゲーション
 */
export function AppNavigation({ profile }: AppNavigationProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // モバイル版: 下部横型ナビゲーション
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around h-16 bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700 safe-area-inset-bottom">
        {NAVIGATION_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname.startsWith(tab.path);

          return (
            <Link
              key={tab.id}
              href={tab.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 relative",
                isActive
                  ? "text-green-500 dark:text-green-400"
                  : "text-gray-400 dark:text-gray-500"
              )}
            >
              {/* アクティブインジケーター（上部のバー） */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500 dark:bg-green-400" />
              )}

              <Icon className="w-6 h-6" />
              <span className="mt-1 text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  // デスクトップ版: 左側縦型ナビゲーション（既存）
  return (
    <div className="flex relative flex-col w-20 h-screen bg-gradient-to-br from-black via-gray-950 to-black border-r border-gray-800/80 shadow-[0_0_20px_rgba(0,0,0,0.4),inset_0_0_15px_rgba(0,0,0,0.2)] z-20">
      {/* 左側のハイライト（立体感） */}
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent to-transparent pointer-events-none via-gray-700/30" />

      {/* プロフィールアバター */}
      <div className="flex relative justify-center items-center h-20 group">
        <div className="relative">
          <div className="flex overflow-hidden justify-center items-center w-11 h-11 bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 rounded-2xl ring-2 shadow-[0_4px_20px_rgba(34,197,94,0.4),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.3)] transition-all duration-300 ring-green-500/30 group-hover:ring-4 group-hover:ring-green-400/50 group-hover:scale-105 group-hover:shadow-[0_6px_30px_rgba(34,197,94,0.6),inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)]">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-lg font-bold text-white">
                {profile.display_name.charAt(0)}
              </span>
            )}
          </div>
          {/* オンラインインジケーター */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-black shadow-lg animate-pulse" />
        </div>
      </div>

      {/* ナビゲーションアイコン */}
      <nav className="flex flex-col items-center pt-4 space-y-2">
        {NAVIGATION_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname.startsWith(tab.path);

          return (
            <div key={tab.id} className="relative group">
              {/* アクティブインジケーター（左側のバー） */}
              <div
                className={cn(
                  "absolute -left-5 top-1/2 z-10 w-1 h-8 bg-gradient-to-b from-green-400 to-emerald-500 rounded-r-full shadow-lg transition-all duration-300 -translate-y-1/2 shadow-green-500/50",
                  isActive ? "opacity-100 scale-100" : "opacity-0 scale-75"
                )}
              />

              {/* ナビゲーションリンク */}
              <Link
                href={tab.path}
                className={cn(
                  "flex relative justify-center items-center w-12 h-12 rounded-2xl transition-all duration-300 transform",
                  isActive
                    ? "text-green-400 bg-gradient-to-br from-green-500/30 via-green-500/20 to-emerald-600/30 shadow-[0_4px_15px_rgba(34,197,94,0.4),inset_0_1px_2px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.3)] scale-100"
                    : "text-gray-400 bg-gradient-to-br from-gray-800/30 to-gray-900/50 shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)] hover:text-white hover:from-gray-700/40 hover:to-gray-800/60 hover:shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.1)] hover:scale-110"
                )}
                title={tab.label}
              >
                <Icon
                  className={cn(
                    "w-6 h-6 transition-all duration-300",
                    isActive && "drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                  )}
                />

                {/* ホバーエフェクト */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-br rounded-2xl animate-pulse from-green-400/10 to-emerald-500/10" />
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* スペーサー */}
      <div className="flex-1" />

      {/* ログアウトボタン（下部） */}
      <div className="flex justify-center items-center h-20">
        <button
          className="flex justify-center items-center w-12 h-12 text-gray-400 bg-gradient-to-br from-gray-800/30 to-gray-900/50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-300 transform hover:text-red-400 hover:from-red-900/30 hover:to-red-950/50 hover:shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] hover:scale-110 group"
          title="ログアウト"
        >
          <LogOut className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
