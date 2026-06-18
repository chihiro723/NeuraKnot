"use client";

import { StatsCard } from "./StatsCard";
import type { TokenStats } from "@/lib/types/analytics";
import type { LLMPricing } from "@/lib/types/llm-model";
import { Info, Calculator } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { listLLMModels } from "@/lib/actions/llm-models";
import { useExchangeRate } from "@/lib/hooks/useExchangeRate";

interface TokenStatsSectionProps {
  stats: TokenStats;
}

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

/**
 * トークン使用量とコスト分析セクション
 */
export function TokenStatsSection({ stats }: TokenStatsSectionProps) {
  const [showPricing, setShowPricing] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);
  const [pricingList, setPricingList] = useState<LLMPricing[]>([]);
  const usdToJpyRate = useExchangeRate();

  // 料金表は管理ダッシュボードに登録済みのモデル（llm_models）の現行単価のみを
  // 表示する。llm_pricing にはシード由来でダッシュボード未登録のモデルも含まれる
  // ため、モデル定義側を起点に単価を引くことで「設定しているもののみ」に揃える。
  useEffect(() => {
    let active = true;
    listLLMModels(undefined, false)
      .then((res) => {
        if (!active) return;
        const pricings = res.models
          .map((model) => model.current_pricing)
          .filter((pricing): pricing is LLMPricing => pricing !== null);
        setPricingList(pricings);
      })
      .catch(() => {
        if (active) setPricingList([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // 料金表をプロバイダー別にグルーピング
  const pricingByProvider = useMemo(() => {
    const grouped = new Map<string, LLMPricing[]>();
    for (const item of pricingList) {
      const existing = grouped.get(item.provider);
      if (existing) {
        existing.push(item);
      } else {
        grouped.set(item.provider, [item]);
      }
    }
    return Array.from(grouped.entries());
  }, [pricingList]);

  // プロバイダー別データの準備
  const providerData = stats.by_provider.map((item) => ({
    name: item.provider.toUpperCase(),
    value: item.total_tokens,
    cost: item.estimated_cost_usd,
    provider: item.provider,
  }));

  // プロバイダー別のモデル詳細を取得
  const getProviderModels = (provider: string) => {
    return stats.by_model.filter((model) => model.provider === provider);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 md:text-xl dark:text-white">
          トークン使用量とコスト
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCalculation(!showCalculation)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30"
          >
            <Calculator className="w-3.5 h-3.5" />
            計算式
          </button>
          <button
            onClick={() => setShowPricing(!showPricing)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
          >
            <Info className="w-3.5 h-3.5" />
            料金表
          </button>
        </div>
      </div>

      {/* 計算式の説明 */}
      {showCalculation && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200 dark:bg-green-900/10 dark:border-green-800">
          <div className="flex gap-2 items-start">
            <Calculator className="w-5 h-5 text-green-600 mt-0.5 dark:text-green-400" />
            <div className="flex-1">
              <h3 className="mb-2 text-sm font-semibold text-green-900 dark:text-green-300">
                コスト計算式
              </h3>
              <div className="text-sm text-green-800 dark:text-green-400">
                <p className="p-2 font-mono text-xs rounded bg-white/50 dark:bg-gray-900/50">
                  コスト = (入力トークン数 ÷ 1,000,000) × 入力単価 +
                  (出力トークン数 ÷ 1,000,000) × 出力単価
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 料金表 */}
      {showPricing && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-900/10 dark:border-blue-800">
          <div className="flex gap-2 items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 dark:text-blue-400" />
            <div className="flex-1">
              <h3 className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-300">
                モデル別料金表（100万トークンあたり USD）
              </h3>
              {pricingByProvider.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {pricingByProvider.map(([provider, models]) => (
                    <div
                      key={provider}
                      className="p-3 bg-white rounded-lg border border-blue-100 dark:bg-gray-900/50 dark:border-blue-900"
                    >
                      <h4 className="mb-2 text-xs font-semibold text-gray-900 uppercase dark:text-white">
                        {provider}
                      </h4>
                      <div className="space-y-1.5">
                        {models.map((pricing) => (
                          <div key={pricing.id} className="text-xs">
                            <div className="font-medium text-gray-700 truncate dark:text-gray-300">
                              {pricing.model}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">
                              入力: ${pricing.prompt_cost_per_1m} / 出力: $
                              {pricing.completion_cost_per_1m}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-blue-800 dark:text-blue-400">
                  登録済みの単価がありません
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatsCard
          title="総トークン数"
          value={stats.total_tokens.toLocaleString()}
          subtitle={`入力: ${stats.prompt_tokens.toLocaleString()} / 出力: ${stats.completion_tokens.toLocaleString()}`}
        />
        <StatsCard
          title="コスト (USD)"
          value={`$${stats.estimated_cost_usd.toFixed(2)}`}
          subtitle="LLM API使用料"
        />
        <StatsCard
          title="コスト (JPY)"
          value={`¥${Math.round(stats.estimated_cost_jpy).toLocaleString()}`}
          subtitle={`1 USD = ${usdToJpyRate} JPY`}
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
                  label={(entry: unknown) => {
                    const data = entry as { name: string; value: number };
                    return `${data.name}: ${(
                      (data.value / stats.total_tokens) *
                      100
                    ).toFixed(1)}%`;
                  }}
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
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as {
                        name: string;
                        value: number;
                        provider: string;
                      };
                      const models = getProviderModels(data.provider);

                      return (
                        <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-4 dark:bg-gray-800 dark:border-gray-700">
                          <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                            {data.name}
                          </p>
                          <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                            合計: {data.value.toLocaleString()} トークン
                          </p>
                          {models.length > 0 && (
                            <>
                              <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>
                              <div className="space-y-1.5">
                                {models.map((model, idx) => (
                                  <div
                                    key={idx}
                                    className="flex gap-4 justify-between items-center text-xs"
                                  >
                                    <span className="text-gray-700 truncate dark:text-gray-300">
                                      {model.model}
                                    </span>
                                    <span className="font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                      {model.total_tokens.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* モデル別コストテーブル（詳細） */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              モデル別コスト（詳細）
            </h3>
            <div
              className="overflow-y-auto space-y-3"
              style={{ height: "250px" }}
            >
              {stats.by_model.map((model, index) => {
                const hasPricing =
                  model.avg_prompt_cost_per_1m > 0 ||
                  model.avg_completion_cost_per_1m > 0;
                const inputCost =
                  (model.prompt_tokens / 1000000) *
                  model.avg_prompt_cost_per_1m;
                const outputCost =
                  (model.completion_tokens / 1000000) *
                  model.avg_completion_cost_per_1m;

                return (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-900/50 dark:border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-xs text-gray-500 uppercase dark:text-gray-400">
                          {model.provider}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {model.model}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600 dark:text-green-400">
                          ${model.estimated_cost_usd.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                        <span>
                          入力: {model.prompt_tokens.toLocaleString()} トークン
                        </span>
                        {hasPricing && (
                          <span className="font-mono">
                            ${inputCost.toFixed(4)} ($
                            {model.avg_prompt_cost_per_1m}/1M)
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                        <span>
                          出力: {model.completion_tokens.toLocaleString()}{" "}
                          トークン
                        </span>
                        {hasPricing && (
                          <span className="font-mono">
                            ${outputCost.toFixed(4)} ($
                            {model.avg_completion_cost_per_1m}/1M)
                          </span>
                        )}
                      </div>
                      <div className="pt-1 border-t border-gray-300 dark:border-gray-600">
                        <div className="flex justify-between items-center font-medium text-gray-700 dark:text-gray-300">
                          <span>
                            合計: {model.total_tokens.toLocaleString()} トークン
                          </span>
                          <span className="font-mono text-green-600 dark:text-green-400">
                            ${model.estimated_cost_usd.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
