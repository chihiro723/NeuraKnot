"use client";

import type { TimeRange } from "@/lib/types/analytics";
import { Calendar, CalendarDays, CalendarRange, Clock } from "lucide-react";

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const timeRangeOptions: {
  value: TimeRange;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "today", label: "今日", icon: Clock },
  { value: "week", label: "今週", icon: Calendar },
  { value: "month", label: "今月", icon: CalendarDays },
  { value: "all", label: "全期間", icon: CalendarRange },
];

/**
 * 期間フィルター選択コンポーネント
 */
export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <div className="flex gap-1 p-0.5 bg-gray-100 rounded-md dark:bg-gray-800">
      {timeRangeOptions.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              px-2 py-1 text-xs font-medium rounded transition-all duration-200
              ${
                isSelected
                  ? "bg-white text-green-600 shadow-sm dark:bg-gray-700 dark:text-green-400"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
