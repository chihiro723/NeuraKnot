"use client";

import { StatsCard } from "./StatsCard";
import type { TokenStats } from "@/lib/types/analytics";
import { Coins, DollarSign, TrendingUp } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface TokenStatsSectionProps {
  stats: TokenStats;
}

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

/**
 * トークン使用量とコスト分析セクション
 */
export function TokenStatsSection({ stats }: TokenStatsSectionProps) {
  // プロバイダー別データの準備
  const providerData = stats.by_provider.map((item) => ({
    name: item.provider.toUpperCase(),
    value: item.total_tokens,
    cost: item.estimated_cost_usd,
  }));

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 md:text-xl dark:text-white">
        トークン使用量とコスト
      </h2>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatsCard
          title="総トークン数"
          value={stats.total_tokens.toLocaleString()}
          subtitle={`入力: ${stats.prompt_tokens.toLocaleString()} / 出力: ${stats.completion_tokens.toLocaleString()}`}
          icon={Coins}
        />
        <StatsCard
          title="推定コスト (USD)"
          value={`$${stats.estimated_cost_usd.toFixed(2)}`}
          subtitle="LLM API使用料"
          icon={DollarSign}
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <StatsCard
          title="推定コスト (JPY)"
          value={`¥${Math.round(stats.estimated_cost_jpy).toLocaleString()}`}
          subtitle="1 USD = 150 JPY"
          icon={TrendingUp}
          iconColor="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* プロバイダー別グラフ */}
      {providerData.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              プロバイダー別使用量
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={providerData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: { name: string; value: number }) =>
                    `${entry.name}: ${(
                      (entry.value / stats.total_tokens) *
                      100
                    ).toFixed(1)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {providerData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => value.toLocaleString()}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* モデル別コストテーブル */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              モデル別コスト
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2">モデル</th>
                    <th className="px-3 py-2 text-right">トークン</th>
                    <th className="px-3 py-2 text-right">コスト</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_model.slice(0, 5).map((model, index) => (
                    <tr
                      key={index}
                      className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                    >
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {model.provider}
                        </div>
                        {model.model}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {model.total_tokens.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ${model.estimated_cost_usd.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {providerData.length === 0 && (
        <div className="p-8 text-center bg-gray-50 rounded-lg dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            トークン使用データがありません
          </p>
        </div>
      )}
    </div>
  );
}
