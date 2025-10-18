"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Server, Plus, Code, ChevronRight, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * サービスのサイドバー - サービス項目一覧
 */
export function ServiceListSidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      href: "/dashboard/services/my-services",
      icon: Server,
      title: "マイサービス",
      description: "登録済みサービス一覧",
      comingSoon: false,
    },
    {
      href: "/dashboard/services/register",
      icon: ClipboardList,
      title: "サービス登録",
      description: "カタログからサービスを登録",
      comingSoon: false,
    },
    {
      href: "#",
      icon: Code,
      title: "フルカスタム登録",
      description: "独自APIサーバーを登録",
      comingSoon: true,
    },
  ];

  return (
    <div className="flex overflow-y-auto flex-col pb-8 h-full bg-white lg:pb-6 dark:bg-gray-900">
      <div className="p-4 space-y-4 lg:p-6">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.comingSoon ? "#" : item.href}
            onClick={(e) => {
              if (item.comingSoon) e.preventDefault();
            }}
            className={cn(
              "relative w-full bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left block min-h-[104px]",
              item.comingSoon
                ? "opacity-60 cursor-not-allowed border-gray-300 dark:border-gray-700"
                : pathname === item.href
                ? "border-green-400 bg-green-50 dark:bg-green-500/10"
                : "border-gray-300 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
            )}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="flex items-center font-medium text-gray-900 dark:text-white lg:text-sm">
                <item.icon className="mr-2 w-5 h-5" />
                {item.title}
                {item.comingSoon && (
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded dark:text-gray-400 dark:bg-gray-700">
                    近日追加予定
                  </span>
                )}
              </h3>
              <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 lg:text-xs">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
