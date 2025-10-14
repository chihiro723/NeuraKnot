"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  User,
  CreditCard,
  BarChart3,
  Palette,
  Shield,
  Home,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/lib/utils/cn";
import type { Profile } from "@/lib/types";

interface SettingsListSidebarProps {
  profile: Profile;
}

/**
 * 設定のサイドバー - 設定項目一覧
 */
export function SettingsListSidebar({ profile }: SettingsListSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex overflow-y-auto flex-col pb-8 h-full bg-white lg:pb-6 dark:bg-gray-900">
      <div className="p-4 space-y-6 lg:p-6">
        {/* プロフィール情報 */}
        <Link
          href="/dashboard/settings/profile"
          className={cn(
            "relative w-full bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left block",
            pathname === "/dashboard/settings/profile"
              ? "border-green-400 bg-green-50 dark:bg-green-500/10"
              : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
          )}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="flex items-center text-lg font-medium text-gray-900 dark:text-white lg:text-base">
              <User className="mr-2 w-5 h-5" />
              プロフィール
            </h2>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="flex items-center space-x-4">
            {/* アバター */}
            <div className="flex overflow-hidden justify-center items-center w-16 h-16 bg-gray-300 rounded-full lg:w-12 lg:h-12 dark:bg-gray-600">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-lg font-medium text-white lg:text-sm">
                  {profile.display_name.charAt(0)}
                </span>
              )}
            </div>
            {/* プロフィール詳細 */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white lg:text-sm">
                {profile.display_name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 lg:text-xs">
                {profile.email}
              </p>
              <div className="flex items-center mt-1">
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${
                    profile.status === "online" ? "bg-green-500" : "bg-gray-400"
                  }`}
                ></div>
                <p className="text-xs text-gray-400 dark:text-gray-500 lg:text-[11px]">
                  {profile.status === "online" ? "オンライン" : "オフライン"}
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* サブスクリプション */}
        <Link
          href="/dashboard/settings/subscription"
          className={cn(
            "relative w-full bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left block min-h-[104px]",
            pathname === "/dashboard/settings/subscription"
              ? "border-green-400 bg-green-50 dark:bg-green-500/10"
              : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
          )}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="flex items-center font-medium text-gray-900 dark:text-white lg:text-sm">
              <CreditCard className="mr-2 w-5 h-5" />
              サブスクリプション
              <span className="ml-2 px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded dark:text-gray-400 dark:bg-gray-700">
                近日追加予定
              </span>
            </h3>
            <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 lg:text-xs">
            プラン管理と利用状況を確認
          </p>
        </Link>

        {/* 統計・分析 */}
        <Link
          href="/dashboard/settings/analytics"
          className={cn(
            "relative w-full bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left block min-h-[104px]",
            pathname === "/dashboard/settings/analytics"
              ? "border-green-400 bg-green-50 dark:bg-green-500/10"
              : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
          )}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="flex items-center font-medium text-gray-900 dark:text-white lg:text-sm">
              <BarChart3 className="mr-2 w-5 h-5" />
              統計・分析
              <span className="ml-2 px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded dark:text-gray-400 dark:bg-gray-700">
                近日追加予定
              </span>
            </h3>
            <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 lg:text-xs">
            利用統計、コスト、APIトークン使用量を確認
          </p>
        </Link>

        {/* テーマ設定 */}
        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h3 className="flex items-center mb-4 font-medium text-gray-900 dark:text-white lg:text-sm">
            <Palette className="mr-2 w-5 h-5" />
            外観設定
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm text-gray-600 dark:text-gray-400">
                テーマ
              </label>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* ランディングページへ戻る */}
        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h3 className="flex items-center mb-2 font-medium text-gray-900 dark:text-white lg:text-sm">
            <Home className="mr-2 w-5 h-5" />
            ホーム
          </h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400 lg:text-xs">
            ランディングページに戻ってサービスの詳細を確認
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg transition-all duration-200 transform hover:from-emerald-600 hover:to-cyan-600 hover:scale-105"
          >
            ランディングページへ
          </a>
        </div>

        {/* アクション */}
        <div className="space-y-4">
          <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <h3 className="flex items-center mb-2 font-medium text-gray-900 dark:text-white lg:text-sm">
              <Shield className="mr-2 w-5 h-5" />
              アカウント
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400 lg:text-xs">
              アカウント設定を管理します
            </p>
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
