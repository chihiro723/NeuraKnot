"use client";

import { StatsCard } from "./StatsCard";
import type { ServiceStats } from "@/lib/types/analytics";
import { Package, Check, X } from "lucide-react";

interface ServiceStatsSectionProps {
  stats: ServiceStats;
}

/**
 * サービス連携状況セクション
 */
export function ServiceStatsSection({ stats }: ServiceStatsSectionProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 md:text-xl dark:text-white">
        サービス連携状況
      </h2>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatsCard
          title="登録サービス数"
          value={stats.total_services.toLocaleString()}
          subtitle="連携しているサービス"
          icon={Package}
        />
        <StatsCard
          title="有効サービス"
          value={stats.enabled_services.toLocaleString()}
          subtitle="現在使用中"
          icon={Check}
          iconColor="text-green-600 dark:text-green-400"
        />
        <StatsCard
          title="無効サービス"
          value={stats.disabled_services.toLocaleString()}
          subtitle="一時停止中"
          icon={X}
          iconColor="text-gray-600 dark:text-gray-400"
        />
      </div>

      {/* サービス別統計テーブル */}
      {stats.by_service.length > 0 ? (
        <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            サービス別利用状況
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">サービス名</th>
                  <th className="px-4 py-3 text-center">状態</th>
                  <th className="px-4 py-3 text-right">利用エージェント数</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_service.map((service, index) => (
                  <tr
                    key={index}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {service.service_class}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {service.is_enabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full dark:text-green-400 dark:bg-green-500/20">
                          <Check className="w-3 h-3" />
                          有効
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full dark:text-gray-400 dark:bg-gray-500/20">
                          <X className="w-3 h-3" />
                          無効
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {service.agent_count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-gray-50 rounded-lg dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            登録されているサービスがありません
          </p>
        </div>
      )}
    </div>
  );
}
