"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, TrendingUp, Zap, X } from "lucide-react";
import { getTiers } from "@/lib/actions/billing";
import { convertUsdToJpy } from "@/lib/utils/currency";
import { useExchangeRate } from "@/lib/hooks/useExchangeRate";
import { ModalOverlay } from "@/components/ui/ModalOverlay";

interface TierLimits {
  tier: string;
  monthly_budget_usd: number;
  price_jpy: number;
  price_usd: number;
  max_ai_agents: number;
  max_group_chats: number;
}

interface TokenLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: string;
  costUsd: number;
  budgetLimitUsd: number;
  usagePercentage: number;
  periodEnd: string;
}

export function TokenLimitModal({
  isOpen,
  onClose,
  tier,
  costUsd,
  budgetLimitUsd,
  usagePercentage,
  periodEnd,
}: TokenLimitModalProps) {
  const router = useRouter();
  const [tiers, setTiers] = useState<TierLimits[]>([]);
  const usdToJpyRate = useExchangeRate();

  // 上限・価格はプラン定義（check-limit/getTiers）を正本とし、固定文言は持たない。
  useEffect(() => {
    if (!isOpen) return;
    getTiers()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setTiers(res.data as TierLimits[]);
        }
      })
      .catch(() => setTiers([]));
  }, [isOpen]);

  const handleUpgrade = () => {
    router.push("/dashboard/settings/subscription");
    onClose();
  };

  const formatYen = (usd: number) =>
    new Intl.NumberFormat("ja-JP").format(
      Math.round(convertUsdToJpy(usd, usdToJpyRate)),
    );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const findTier = (name: string) => tiers.find((t) => t.tier === name);
  const proTier = findTier("pro");
  const maxTier = findTier("max");

  const describeTier = (t: TierLimits) =>
    `${t.tier === "pro" ? "Pro" : "Max"}プラン（月${new Intl.NumberFormat(
      "ja-JP",
    ).format(
      t.price_jpy,
    )}円）で月あたり約${formatYen(t.monthly_budget_usd)}円分まで利用可能`;

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={false}
      className="bg-black/50 backdrop-blur-none"
    >
      <div
        className="relative w-full max-w-[500px] bg-white rounded-xl shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 rounded-lg transition-colors hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ヘッダー */}
        <div className="p-6 pb-4">
          <div className="flex gap-3 items-center">
            <div className="flex justify-center items-center w-12 h-12 bg-red-100 rounded-full dark:bg-red-900/20">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                利用上限に達しました
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                今月の利用枠が上限に達したため、チャットを送信できません
              </p>
            </div>
          </div>
        </div>

        {/* 使用状況 */}
        <div className="px-6 pb-4">
          <div className="p-4 space-y-3 bg-gray-50 rounded-lg border dark:bg-gray-900/50">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                現在のプラン
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {tier === "free" && "Free"}
                {tier === "pro" && "Pro"}
                {tier === "max" && "Max"}
              </span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  使用量
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  ¥{formatYen(costUsd)} / ¥{formatYen(budgetLimitUsd)}
                </span>
              </div>
              <div className="overflow-hidden relative w-full h-3 bg-gray-200 rounded-full dark:bg-gray-700">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  上限達成
                </span>
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {usagePercentage.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                リセット日
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(periodEnd)}
              </span>
            </div>
          </div>
        </div>

        {/* 解決策 */}
        <div className="px-6 pb-4">
          <h3 className="flex gap-2 items-center mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            <Zap className="w-4 h-4 text-yellow-500" />
            解決方法
          </h3>

          <div className="space-y-2">
            {tier === "free" && (
              <>
                <div className="p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
                  <div className="flex gap-2 items-start">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-primary">
                        プランをアップグレードする（推奨）
                      </p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {proTier && maxTier
                          ? `${describeTier(proTier)}。${describeTier(maxTier)}。`
                          : "上位プランにアップグレードすると、より多くの利用枠が使えます。"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-100 rounded-lg border dark:bg-gray-800/30">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    または、{formatDate(periodEnd)}のリセット日まで待つ
                  </p>
                </div>
              </>
            )}

            {tier === "pro" && (
              <div className="p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
                <div className="flex gap-2 items-start">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary">
                      Maxプランにアップグレード
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {maxTier
                        ? `${describeTier(maxTier)}。超過分は割安な料金で自動課金されます。`
                        : "Maxプランでより多くの利用枠が使えます。"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3 p-6 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-all dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            閉じる
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg transition-all hover:from-green-600 hover:to-emerald-700 flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            プランを変更
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
