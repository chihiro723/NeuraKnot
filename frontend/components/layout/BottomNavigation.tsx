"use client";

import { MessageCircle, Users, UserPlus, Settings } from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { cn } from "@/lib/utils/cn";

/**
 * 画面下部のナビゲーションバー（モバイル用） - 完璧に統一されたデザインシステム
 */
export function BottomNavigation() {
  const { activeTab, setActiveTab } = useDashboard();

  // ナビゲーションタブの定義
  const tabs = [
    { id: "chats" as const, icon: MessageCircle, label: "トーク" },
    { id: "friends" as const, icon: Users, label: "友だち" },
    { id: "add-friends" as const, icon: UserPlus, label: "新規追加" },
    { id: "settings" as const, icon: Settings, label: "設定" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-2 py-2 safe-area-pb lg:hidden">
      <div className="flex justify-around gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center py-2 px-3 rounded-xl transition-all flex-1",
                isActive
                  ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/20"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:text-gray-500 dark:hover:text-gray-400 dark:hover:bg-gray-800/50"
              )}
            >
              <Icon
                className={cn("w-5 h-5 mb-1", isActive && "stroke-[2.5]")}
              />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
