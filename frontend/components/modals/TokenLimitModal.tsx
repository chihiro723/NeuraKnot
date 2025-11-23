'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AlertCircle, TrendingUp, Zap, X } from 'lucide-react';

interface TokenLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: string;
  tokensUsed: number;
  tokensLimit: number;
  usagePercentage: number;
  periodEnd: string;
}

export function TokenLimitModal({
  isOpen,
  onClose,
  tier,
  tokensUsed,
  tokensLimit,
  usagePercentage,
  periodEnd,
}: TokenLimitModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    router.push('/dashboard/settings/subscription');
    onClose();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black/50">
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
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                トークン上限に達しました
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                今月のトークン使用量が上限に達したため、チャットを送信できません
              </p>
            </div>
          </div>
        </div>

        {/* 使用状況 */}
        <div className="px-6 pb-4">
          <div className="rounded-lg border bg-gray-50 dark:bg-gray-900/50 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">現在のプラン</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {tier === 'free' && 'Free'}
                {tier === 'pro' && 'Pro'}
                {tier === 'max' && 'Max'}
              </span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">使用量</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatNumber(tokensUsed)} / {formatNumber(tokensLimit)} トークン
                </span>
              </div>
              <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">上限達成</span>
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {usagePercentage.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">リセット日</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(periodEnd)}</span>
            </div>
          </div>
        </div>

        {/* 解決策 */}
        <div className="px-6 pb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-gray-900 dark:text-white">
            <Zap className="h-4 w-4 text-yellow-500" />
            解決方法
          </h3>

          <div className="space-y-2">
            {tier === 'free' && (
              <>
                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-primary">
                        プランをアップグレードする（推奨）
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Proプラン（月980円）で1,300万トークン、Maxプラン（月2,980円）で4,000万トークンまで利用可能
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-gray-100 dark:bg-gray-800/30 p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    または、{formatDate(periodEnd)}のリセット日まで待つ
                  </p>
                </div>
              </>
            )}

            {tier === 'pro' && (
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary">Maxプランにアップグレード</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      月2,980円で4,000万トークンまで利用可能。超過分は割安な料金で自動課金されます。
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
            <TrendingUp className="h-4 w-4" />
            プランを変更
          </button>
        </div>
      </div>
    </div>
  );
}
