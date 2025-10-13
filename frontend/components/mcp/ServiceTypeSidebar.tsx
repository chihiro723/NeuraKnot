"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Server, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * 外部サービスのサイドバー - サービスタイプ選択
 */
export function ServiceTypeSidebar() {
  const pathname = usePathname();

  const serviceTypes = [
    {
      type: "my-services" as const,
      icon: Server,
      title: "マイサービス",
      description: "登録済みのMCPサーバーとツールを管理",
      iconColor: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      path: "/dashboard/services/my-services",
      comingSoon: false,
    },
    {
      type: "register" as const,
      icon: Plus,
      title: "新規登録",
      description: "新しいMCPサーバーを登録",
      iconColor: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      path: "/dashboard/services/register",
      comingSoon: false,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-1 justify-center items-start p-4">
        <div className="space-y-2 w-full">
          {serviceTypes.map((type) => {
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
                  "p-3 w-full text-left bg-white rounded-lg border transition-all duration-200 dark:bg-gray-800 block",
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
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
