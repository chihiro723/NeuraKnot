"use client";

import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

/**
 * 統計値を表示するカードコンポーネント
 */
export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-green-600 dark:text-green-400",
  trend,
}: StatsCardProps) {
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </p>
        <div className="flex items-baseline gap-2 mt-2">
          <h3 className="text-2xl font-bold text-gray-900 md:text-3xl dark:text-white">
            {value}
          </h3>
          {trend && (
            <span
              className={`text-sm font-medium ${
                trend.isPositive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
