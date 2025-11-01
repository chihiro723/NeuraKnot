"use client";

import { StatsCard } from "./StatsCard";
import type { ToolUsageStats } from "@/lib/types/analytics";
import { CustomTooltip } from "./CustomTooltip";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface ToolUsageSectionProps {
  stats: ToolUsageStats;
}

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];

/**
 * ツール使用統計セクション
 */
export function ToolUsageSection({ stats }: ToolUsageSectionProps) {
  // カテゴリ別データ
  const categoryData = stats.by_category.map((item) => ({
    name: item.category === "basic" ? "基本ツール" : "サービスツール",
    value: item.call_count,
  }));

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 md:text-xl dark:text-white">
        ツール使用統計
      </h2>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatsCard
          title="総ツール使用回数"
          value={stats.total_tool_calls.toLocaleString()}
          subtitle={`成功: ${stats.successful_calls.toLocaleString()} / 失敗: ${stats.failed_calls.toLocaleString()}`}
        />
        <StatsCard
          title="成功率"
          value={`${stats.success_rate.toFixed(1)}%`}
          subtitle="ツール実行成功率"
        />
        <StatsCard
          title="失敗数"
          value={stats.failed_calls.toLocaleString()}
          subtitle="エラーが発生した回数"
        />
      </div>

      {stats.by_tool.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* カテゴリ別使用比率 */}
          {categoryData.length > 0 && (
            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                カテゴリ別使用比率
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: unknown) => {
                      const data = entry as { name: string; value: number };
                      return `${data.name}: ${(
                        (data.value / stats.total_tool_calls) *
                        100
                      ).toFixed(1)}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ツール別使用統計 */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              ツール別使用回数
            </h3>
            <div className="overflow-y-auto" style={{ maxHeight: '250px' }}>
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">ツール名</th>
                    <th className="px-3 py-2 text-right">使用回数</th>
                    <th className="px-3 py-2 text-right">成功率</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_tool.map((tool, index) => (
                    <tr
                      key={index}
                      className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                    >
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {tool.category}
                        </div>
                        {tool.tool_name}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {tool.call_count.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`font-medium ${
                            tool.success_rate >= 90
                              ? "text-green-600 dark:text-green-400"
                              : tool.success_rate >= 70
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {tool.success_rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-gray-50 rounded-lg dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            ツール使用データがありません
          </p>
        </div>
      )}
    </div>
  );
}
