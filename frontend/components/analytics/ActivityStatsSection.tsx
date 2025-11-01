"use client";

import { StatsCard } from "./StatsCard";
import type { ActivityStats } from "@/lib/types/analytics";
import { CustomTooltip } from "./CustomTooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ActivityStatsSectionProps {
  stats: ActivityStats;
}

const COLORS = ["#10b981", "#3b82f6"];

/**
 * メッセージ/会話の活動量セクション
 */
export function ActivityStatsSection({ stats }: ActivityStatsSectionProps) {
  // メッセージタイプ別のデータ
  const messageTypeData = [
    { name: "ユーザー", value: stats.user_messages },
    { name: "AI", value: stats.ai_messages },
  ];

  // 日別活動データ（最新10日分を逆順で表示）
  const dailyData = stats.daily_activity
    .slice(0, 10)
    .reverse()
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString("ja-JP", {
        month: "numeric",
        day: "numeric",
      }),
      ユーザー: item.user_messages,
      AI: item.ai_messages,
    }));

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 md:text-xl dark:text-white">
        活動量統計
      </h2>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatsCard
          title="総メッセージ数"
          value={stats.total_messages.toLocaleString()}
          subtitle={`ユーザー: ${stats.user_messages.toLocaleString()} / AI: ${stats.ai_messages.toLocaleString()}`}
        />
        <StatsCard
          title="総会話数"
          value={stats.total_conversations.toLocaleString()}
          subtitle={`アクティブ: ${stats.active_conversations.toLocaleString()}`}
        />
        <StatsCard
          title="平均応答時間"
          value={`${(stats.average_response_time_ms / 1000).toFixed(2)}s`}
          subtitle="AI処理時間"
        />
      </div>

      {/* グラフ */}
      {dailyData.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* 日別活動量グラフ */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              日別メッセージ数
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="ユーザー" fill="#10b981" />
                <Bar dataKey="AI" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* メッセージタイプ別比率 */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              メッセージタイプ別比率
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={messageTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: unknown) => {
                    const data = entry as { name: string; value: number };
                    return `${data.name}: ${(
                      (data.value / stats.total_messages) *
                      100
                    ).toFixed(1)}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {messageTypeData.map((entry, index) => (
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
        </div>
      )}

      {dailyData.length === 0 && (
        <div className="p-8 text-center bg-gray-50 rounded-lg dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            活動データがありません
          </p>
        </div>
      )}
    </div>
  );
}
