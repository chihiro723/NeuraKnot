"use client";

import { useRouter } from "next/navigation";
import {
  CreditCard,
  ArrowLeft,
  Zap,
  Check,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import { useIsMobile } from "@/lib/hooks/useResponsive";
import {
  createCheckoutSession,
  createBillingPortalSession,
  changeSubscriptionPlan,
  cancelSubscription,
} from "@/lib/actions/billing";

interface TierLimits {
  tier: string;
  monthly_budget_usd: number;
  price_jpy: number;
  price_usd: number;
  max_ai_agents: number;
  max_group_chats: number;
}

interface TokenUsage {
  period_start: string;
  period_end: string;
  tokens_total: number; // 統計用として残す
  cost_usd: number;
  cost_jpy: number;
  limit_usd: number;
  remaining_usd: number;
  request_count?: number;
  current_tier: string;
}

interface SubscriptionClientProps {
  tiers: TierLimits[];
  usage: TokenUsage | null;
}

export function SubscriptionClient({ tiers, usage }: SubscriptionClientProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  const tierOrder: Record<string, number> = { free: 0, pro: 1, max: 2 };
  const currentTierLevel = tierOrder[usage?.current_tier || "free"] || 0;

  const handleSubscribe = async (tier: string) => {
    try {
      // 既に有料プランの場合はプラン変更APIを呼ぶ
      if (usage?.current_tier && usage.current_tier !== "free") {
        if (!confirm(`${tier}プランに変更しますか？`)) {
          return;
        }

        const result = await changeSubscriptionPlan(tier);
        if (result.success) {
          alert("プランを変更しました。");
          window.location.reload();
        } else {
          console.error("Failed to change plan:", result.error);
          alert("プラン変更に失敗しました。");
        }
        return;
      }

      // 新規サブスクリプションの場合はCheckout Sessionを作成
      const result = await createCheckoutSession(
        tier,
        `${window.location.origin}/dashboard/settings/subscription?success=true`,
        `${window.location.origin}/dashboard/settings/subscription?canceled=true`
      );

      if (result.success && result.data) {
        window.location.href = (
          result.data as { session_url: string }
        ).session_url;
      } else {
        console.error("Failed to create checkout session:", result.error);
        alert("決済セッションの作成に失敗しました。");
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      alert("エラーが発生しました。");
    }
  };

  const handleManageBilling = async () => {
    try {
      const result = await createBillingPortalSession(
        `${window.location.origin}/dashboard/settings/subscription`
      );

      if (result.success && result.data) {
        window.location.href = (result.data as { url: string }).url;
      } else {
        console.error("Failed to create billing portal session:", result.error);
        alert("請求管理ポータルの作成に失敗しました。");
      }
    } catch (error) {
      console.error("Failed to create billing portal session:", error);
      alert("エラーが発生しました。");
    }
  };

  const handleCancel = async () => {
    if (
      !confirm(
        "本当にFreeプランへダウングレード（解約）しますか？\n解約後も現在の請求期間終了日までは引き続き有料プランの機能をご利用いただけます。"
      )
    ) {
      return;
    }

    try {
      const result = await cancelSubscription();
      if (result.success) {
        alert("解約予約が完了しました。期間終了後にFreeプランへダウングレードされます。");
        window.location.reload();
      } else {
        console.error("Failed to cancel subscription:", result.error);
        alert("解約処理に失敗しました。");
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      alert("エラーが発生しました。");
    }
  };

  const handleBack = () => {
    router.push("/dashboard/settings");
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ja-JP").format(num);
  };

  // 使用率計算（コストベースのみ）
  const calculateUsagePercentage = (u: TokenUsage) => {
    if (u.limit_usd && u.limit_usd > 0) {
      return (u.cost_usd / u.limit_usd) * 100;
    }
    return 0;
  };

  // 予算（円換算、目安）
  const getBudgetJPY = (usd: number) => {
    return Math.round(usd * 150); // 簡易計算
  };

  return (
    <div className="flex overflow-hidden flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="flex flex-shrink-0 justify-between items-center px-6 h-16 bg-white border-b border-gray-200 md:px-8 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              サブスクリプション管理
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              プランと支払い情報の管理
            </p>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={handleBack}
            className="flex justify-center items-center p-2 text-gray-600 rounded-lg transition-all duration-200 bg-gray-50/80 dark:text-gray-300 dark:bg-gray-800/50 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700"
            title="戻る"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* コンテンツ */}
      <div className="overflow-y-auto flex-1 p-6">
        <div className="mx-auto space-y-8 max-w-6xl h-full">
          {/* 使用量プログレスバー */}
          {usage && (
            <div className="overflow-hidden relative bg-white rounded-xl border-2 border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
              {/* トップボーダー */}
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-teal-500" />

              <div className="p-6 md:p-8">
                {/* ヘッダー */}
                <div className="flex justify-between items-center pb-6 mb-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex gap-3 items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        今月の使用状況
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(usage.period_start).toLocaleDateString(
                          "ja-JP"
                        )}{" "}
                        -{" "}
                        {new Date(usage.period_end).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* プログレスバー */}
                <div className="mb-8 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      利用枠使用状況
                    </span>
                    <span className="font-mono text-gray-600 dark:text-gray-400">
                      ¥{formatNumber(Math.round(usage.cost_jpy))} /{" "}
                      ¥{formatNumber(getBudgetJPY(usage.limit_usd))}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="overflow-hidden w-full h-3 bg-gray-100 rounded-full border border-gray-200 dark:bg-gray-700/50 dark:border-gray-600">
                      <div
                        className={`h-full transition-all duration-700 ease-out ${
                          calculateUsagePercentage(usage) > 100
                            ? "bg-gradient-to-r from-red-500 to-orange-500"
                            : calculateUsagePercentage(usage) > 80
                            ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                            : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            calculateUsagePercentage(usage),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="absolute right-0 -top-6">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                        {Math.round(calculateUsagePercentage(usage))}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-right text-gray-400">
                    ※使用するモデルによって消費ペースが異なります
                  </p>
                </div>

                {/* 統計情報 */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-900/50 dark:border-gray-700">
                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                      残り利用枠 (目安)
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      ¥{formatNumber(Math.round(Math.max(usage.remaining_usd * 150, 0)))}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-900/50 dark:border-gray-700">
                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                      リクエスト
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(usage.request_count || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-900/50 dark:border-gray-700">
                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                      総トークン数 (参考)
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(usage.tokens_total)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-900/50 dark:border-gray-700">
                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                      現在プラン
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                      {usage.current_tier === "free" ? "Free" : usage.current_tier === "pro" ? "Pro" : "Max"}
                    </p>
                  </div>
                </div>

                {/* 警告メッセージ */}
                {calculateUsagePercentage(usage) > 100 && (
                  <div className="p-4 mt-6 bg-orange-50 rounded-r-lg border-l-4 border-orange-500 dark:bg-orange-900/20 dark:border-orange-400">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      ⚠️ 利用制限を超過しています。現在AI機能は利用できません。
                    </p>
                  </div>
                )}
                {calculateUsagePercentage(usage) > 80 &&
                  calculateUsagePercentage(usage) <= 100 && (
                    <div className="p-4 mt-6 bg-yellow-50 rounded-r-lg border-l-4 border-yellow-500 dark:bg-yellow-900/20 dark:border-yellow-400">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        ⚠️
                        利用枠の80%を超えました。プランのアップグレードをご検討ください。
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* プランカード */}
          <div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
              {tiers.map((tier) => {
                const targetTierLevel = tierOrder[tier.tier] || 0;
                const isCurrent = tier.tier === usage?.current_tier;
                const isUpgrade = targetTierLevel > currentTierLevel;
                const isDowngrade = targetTierLevel < currentTierLevel;

                return (
                  <div
                    key={tier.tier}
                    className="overflow-hidden relative bg-white rounded-2xl shadow-xl transition-all duration-300 dark:bg-gray-800 hover:shadow-2xl hover:-translate-y-1"
                  >
                    <div className="p-6 md:p-8">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 capitalize dark:text-white">
                          {tier.tier === "free"
                            ? "Free"
                            : tier.tier === "pro"
                            ? "Pro"
                            : "Max"}
                        </h3>
                      </div>
                      <div className="mb-8">
                        <div className="flex gap-2 items-baseline">
                          <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400">
                            ¥{formatNumber(tier.price_jpy)}
                          </span>
                          <span className="text-lg text-gray-500 dark:text-gray-400">
                            /月
                          </span>
                        </div>
                        {tier.tier === "free" && (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            まずは試してみる
                          </p>
                        )}
                        {tier.tier === "pro" && (
                          <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                            個人・小規模チーム向け
                          </p>
                        )}
                        {tier.tier === "max" && (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            ヘビーユーザー向け
                          </p>
                        )}
                      </div>
                      <ul className="mb-8 space-y-4">
                        <li className="flex items-start">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3 mt-0.5">
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-bold text-gray-900 dark:text-white">
                              約{formatNumber(getBudgetJPY(tier.monthly_budget_usd))}円分
                            </span>{" "}
                            のAI利用枠
                            <br />
                            <span className="text-xs text-gray-400">
                              月額料金に含まれます
                            </span>
                          </span>
                        </li>
                        <li className="flex items-center">
                          <div className="flex flex-shrink-0 justify-center items-center mr-3 w-5 h-5 bg-green-100 rounded-full dark:bg-green-900/30">
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {tier.max_ai_agents === 0
                              ? "無制限"
                              : tier.max_ai_agents}{" "}
                            AIエージェント
                          </span>
                        </li>
                        <li className="flex items-center">
                          <div className="flex flex-shrink-0 justify-center items-center mr-3 w-5 h-5 bg-green-100 rounded-full dark:bg-green-900/30">
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {tier.max_group_chats === 0
                              ? "無制限"
                              : tier.max_group_chats}{" "}
                            グループチャット
                          </span>
                        </li>
                      </ul>
                      <button
                        onClick={() => {
                          if (isCurrent) return;
                          if (tier.tier === "free") {
                            handleCancel();
                          } else {
                            handleSubscribe(tier.tier);
                          }
                        }}
                        disabled={isCurrent}
                        className={`w-full py-3.5 px-6 rounded-xl font-semibold transition-all duration-200 ${
                          isCurrent
                            ? "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                            : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 shadow-lg hover:shadow-xl"
                        }`}
                      >
                        {isCurrent
                          ? "現在のプラン"
                          : isUpgrade
                          ? "アップグレード"
                          : isDowngrade
                          ? "ダウングレード"
                          : "プラン変更"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 請求管理ボタン */}
          {usage && usage.current_tier !== "free" && (
            <div className="pb-8 text-center flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={handleManageBilling}
                className="inline-flex gap-2 items-center px-6 py-3 font-medium text-green-600 transition-all duration-200 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20"
              >
                <CreditCard className="w-4 h-4" />
                請求履歴と支払い方法を管理
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
