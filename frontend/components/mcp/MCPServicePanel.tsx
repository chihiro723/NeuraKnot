"use client";

import { useState } from "react";
import { Server, Plus, ArrowRight } from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { cn } from "@/lib/utils/cn";
import type { MCPServiceType } from "@/lib/types/mcp";

/**
 * MCPサービスパネル - 新規追加画面と同じ構造
 */
export function MCPServicePanel() {
  const { selectedMCPServiceType, setSelectedMCPServiceType } = useDashboard();

  const serviceTypes = [
    {
      type: "my-services" as const,
      icon: Server,
      title: "マイサービス",
      description: "登録済みのMCPサーバーとツールを管理",
      iconColor: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      comingSoon: false,
    },
    {
      type: "register" as const,
      icon: Plus,
      title: "新規登録",
      description: "新しいMCPサーバーを登録",
      iconColor: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      comingSoon: false,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* デスクトップ用レイアウト */}
      <div className="flex flex-col h-full">
        {/* 選択カード */}
        <div className="flex flex-1 justify-center items-start p-4">
          <div className="space-y-2 w-full">
            {serviceTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedMCPServiceType === type.type;
              return (
                <button
                  key={type.type}
                  onClick={() =>
                    !type.comingSoon && setSelectedMCPServiceType(type.type)
                  }
                  disabled={type.comingSoon}
                  className={cn(
                    "p-3 w-full text-left bg-white rounded-lg border transition-all duration-200 dark:bg-gray-800 animate-fadeIn",
                    type.comingSoon
                      ? "opacity-60 cursor-not-allowed"
                      : isSelected
                      ? `bg-green-50 border-green-500 dark:bg-green-500/10 dark:border-green-500`
                      : `border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750`
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-green-100 dark:bg-green-500/20"
                          : type.bgColor
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5",
                          isSelected
                            ? "text-green-600 dark:text-green-400"
                            : type.iconColor
                        )}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex gap-2 items-center">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {type.title}
                        </h3>
                        {type.comingSoon && (
                          <span className="px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded dark:text-gray-400 dark:bg-gray-800">
                            近日追加予定
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
