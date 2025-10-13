/**
 * ローディングスピナーコンポーネント
 */

import { cn } from "@/lib/utils/cn";

/**
 * パルス型リングスピナー
 * 拡大しながらフェードアウトするリングアニメーション
 */
export function PulseSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-16 h-16", className)}>
      {/* 外側のリング */}
      <div className="absolute inset-0 rounded-full border-4 border-green-500/20 dark:border-green-400/20" />

      {/* アニメーションするリング1 */}
      <div
        className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping dark:border-green-400"
        style={{ animationDuration: "2s" }}
      />

      {/* アニメーションするリング2 */}
      <div
        className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping dark:border-green-400"
        style={{ animationDuration: "2s", animationDelay: "1s" }}
      />

      {/* 中央のドット */}
      <div className="flex absolute inset-0 justify-center items-center">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse dark:bg-green-400" />
      </div>
    </div>
  );
}

/**
 * 二重リングスピナー
 * 2つのリングが逆方向に回転するモダンなアニメーション
 */
export function DoubleRingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-12 h-12", className)}>
      {/* 外側のリング（時計回り） */}
      <div className="absolute inset-0 rounded-full border-4 border-transparent animate-spin border-t-green-500 border-r-green-500 dark:border-t-green-400 dark:border-r-green-400" />

      {/* 内側のリング（反時計回り） */}
      <div
        className="absolute inset-2 rounded-full border-4 border-transparent border-b-green-500 border-l-green-500 dark:border-b-green-400 dark:border-l-green-400"
        style={{
          animation: "spin 1.5s linear infinite reverse",
        }}
      />
    </div>
  );
}

/**
 * チャットメッセージ画面用フルスクリーンローディング
 * モダンでおしゃれなデザイン
 */
interface LoadingSpinnerProps {
  /** ローディング中に表示するテキスト */
  text?: string;
}

export function LoadingSpinner({
  text = "読み込み中...",
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col flex-1 justify-center items-center h-full min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* メインスピナー */}
      <div className="relative">
        <DoubleRingSpinner />

        {/* 装飾的な背景パルス */}
        <div className="absolute -inset-8 rounded-full animate-pulse bg-green-500/5 dark:bg-green-400/5" />
      </div>

      {/* ローディングテキスト */}
      <p className="mt-12 text-sm font-medium text-gray-500 dark:text-gray-400">
        {text}
      </p>
    </div>
  );
}
