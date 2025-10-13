"use client";

import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  User,
  Palette,
  Shield,
  Home,
  CreditCard,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SettingSection } from "@/lib/types";

/**
 * 設定パネルコンポーネント
 * ユーザープロフィール表示とアカウント管理機能を提供
 */
export function SettingsPanel() {
  const {
    profile,
    user,
    showProfileSettings,
    setShowProfileSettings,
    selectedSettingSection,
    setSelectedSettingSection,
  } = useDashboard();

  const handleProfileClick = () => {
    setShowProfileSettings(true);
    setSelectedSettingSection(null); // 他のセクションをリセット
  };

  const handleSectionClick = (section: SettingSection) => {
    setSelectedSettingSection(section);
    setShowProfileSettings(false); // プロフィール設定をリセット
  };

  return (
    <div className="flex flex-col h-full lg:border-r-0 bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 lg:hidden">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          設定
        </h1>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto pb-8 lg:pb-6">
        {/* プロフィール情報 */}
        <button
          onClick={handleProfileClick}
          className={cn(
            "relative w-full bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm animate-fadeIn hover:shadow-md transition-all duration-200 text-left",
            showProfileSettings && !selectedSettingSection
              ? "border-green-400 bg-green-50 dark:bg-green-500/10"
              : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
          )}
        >
          <ChevronRight className="absolute top-4 right-4 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 lg:text-base flex items-center">
            <User className="w-5 h-5 mr-2" />
            プロフィール
          </h2>
          <div className="flex items-center space-x-4">
            {/* アバター */}
            <div className="w-16 h-16 lg:w-12 lg:h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-medium text-lg lg:text-sm">
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
        </button>

        {/* サブスクリプション */}
        <button
          onClick={() => handleSectionClick("subscription")}
          className={cn(
            "relative w-full bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm animate-fadeIn hover:shadow-md transition-all duration-200 text-left",
            selectedSettingSection === "subscription"
              ? "border-green-400 bg-green-50 dark:bg-green-500/10"
              : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
          )}
        >
          <ChevronRight className="absolute top-4 right-4 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <h3 className="font-medium text-gray-900 dark:text-white mb-2 lg:text-sm flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            サブスクリプション
            <span className="ml-2 px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded dark:text-gray-400 dark:bg-gray-700">
              近日追加予定
            </span>
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 lg:text-xs">
            プラン管理と利用状況を確認
          </p>
        </button>

        {/* 統計・分析 */}
        <button
          onClick={() => handleSectionClick("analytics")}
          className={cn(
            "relative w-full bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm animate-fadeIn hover:shadow-md transition-all duration-200 text-left",
            selectedSettingSection === "analytics"
              ? "border-green-400 bg-green-50 dark:bg-green-500/10"
              : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
          )}
        >
          <ChevronRight className="absolute top-4 right-4 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <h3 className="font-medium text-gray-900 dark:text-white mb-2 lg:text-sm flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            統計・分析
            <span className="ml-2 px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded dark:text-gray-400 dark:bg-gray-700">
              近日追加予定
            </span>
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 lg:text-xs">
            利用統計、コスト、APIトークン使用量を確認
          </p>
        </button>

        {/* テーマ設定 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-fadeIn">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4 lg:text-sm flex items-center">
            <Palette className="w-5 h-5 mr-2" />
            外観設定
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                テーマ
              </label>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* ランディングページへ戻る */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-fadeIn">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2 lg:text-sm flex items-center">
            <Home className="w-5 h-5 mr-2" />
            ホーム
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 lg:text-xs">
            ランディングページに戻ってサービスの詳細を確認
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            ランディングページへ
          </a>
        </div>

        {/* アクション */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-fadeIn">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2 lg:text-sm flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              アカウント
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 lg:text-xs">
              アカウント設定を管理します
            </p>
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
