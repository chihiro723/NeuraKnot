"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bot, User, Handshake, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * 新規追加のサイドバー - タイプ選択
 */
export function AddTypeSidebar() {
  const pathname = usePathname();

  const addTypes = [
    {
      type: "user" as const,
      icon: User,
      title: "ユーザー",
      description: "他のユーザーとつながって会話しよう",
      path: "/dashboard/add/user",
      comingSoon: true,
    },
    {
      type: "ai" as const,
      icon: Bot,
      title: "エージェント",
      description: "様々な個性を持つAIと会話しよう",
      path: "/dashboard/add/ai",
      comingSoon: false,
    },
    {
      type: "group" as const,
      icon: Handshake,
      title: "グループ",
      description: "複数の友だちやAIとグループチャット",
      path: "/dashboard/add/group",
      comingSoon: true,
    },
  ];

  return (
    <div className="flex overflow-y-auto flex-col pb-8 h-full bg-white lg:pb-6 dark:bg-gray-900">
      <div className="p-4 space-y-4 lg:p-6">
        {addTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = pathname === type.path;
          return (
            <Link
              key={type.type}
              href={type.comingSoon ? "#" : type.path}
              onClick={(e) => {
                if (type.comingSoon) e.preventDefault();
              }}
              className={cn(
                "relative w-full bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left block min-h-[104px]",
                type.comingSoon
                  ? "opacity-60 cursor-not-allowed border-gray-300 dark:border-gray-700"
                  : isSelected
                  ? "border-green-400 bg-green-50 dark:bg-green-500/10"
                  : "border-gray-300 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="flex items-center font-medium text-gray-900 dark:text-white lg:text-sm">
                  <Icon className="mr-2 w-5 h-5" />
                  {type.title}
                  {type.comingSoon && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded dark:text-gray-400 dark:bg-gray-700">
                      近日追加予定
                    </span>
                  )}
                </h3>
                <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 lg:text-xs">
                {type.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
