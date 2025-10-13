"use client";

import { CreditCard, BarChart3, Settings } from "lucide-react";
import type { SettingSection } from "@/lib/types";

interface SettingsRightPanelProps {
  selectedSection: SettingSection;
}

/**
 * 設定右側パネル
 */
export function SettingsRightPanel({
  selectedSection,
}: SettingsRightPanelProps) {
  // サブスクリプション画面
  if (selectedSection === "subscription") {
    return (
      <div className="flex flex-col h-full">
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
              <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                サブスクリプション
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                プラン管理と利用状況
              </p>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
          <div className="p-8 max-w-md text-center">
            <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-2xl shadow-lg dark:bg-green-500/20 shadow-green-500/20">
              <CreditCard className="w-8 h-8 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              サブスクリプション管理
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              この機能は近日追加予定です
            </p>
            <div className="p-6 text-left bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                実装予定の機能
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>プラン選択と変更</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>利用状況の確認</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>支払い方法の管理</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>請求履歴の確認</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 統計・分析画面
  if (selectedSection === "analytics") {
    return (
      <div className="flex flex-col h-full">
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
              <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                統計・分析
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                利用統計、コスト、使用量の確認
              </p>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
          <div className="p-8 max-w-md text-center">
            <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-2xl shadow-lg dark:bg-green-500/20 shadow-green-500/20">
              <BarChart3 className="w-8 h-8 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              統計・分析
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              この機能は近日追加予定です
            </p>
            <div className="p-6 text-left bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                実装予定の機能
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>メッセージ数・AI応答の統計</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>月間コストとグラフ分析</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>ツール使用統計</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // デフォルト表示
  return (
    <>
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <Settings className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              設定
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              左側から設定項目を選択してください
            </p>
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="p-8 text-center">
          <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-2xl shadow-lg dark:bg-green-500/20 shadow-green-500/20">
            <Settings className="w-8 h-8 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            設定を選択
          </h3>
          <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
            左側から設定項目を選択してください
          </p>
        </div>
      </div>
    </>
  );
}
