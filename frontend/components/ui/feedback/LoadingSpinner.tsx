/**
 * ローディングスピナーコンポーネント
 */

import { cn } from "@/lib/utils/cn";

/**
 * パルス型スピナー
 * 拡大しながらフェードアウトするアニメーション
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
function DoubleRingSpinner({ className }: { className?: string }) {
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
  /** 画面中央に配置するかどうか */
  centerScreen?: boolean;
  /** 背景色のバリアント */
  variant?: "default" | "auth" | "transparent";
}

export function LoadingSpinner({
  text,
  centerScreen = false,
  variant = "default",
}: LoadingSpinnerProps) {
  // 背景色のバリアント設定
  const getBackgroundClass = () => {
    switch (variant) {
      case "auth":
        return "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900";
      case "transparent":
        return "bg-transparent";
      default:
        return "bg-gray-50 dark:bg-gray-900";
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col justify-center items-center",
        centerScreen
          ? `fixed inset-0 z-50 ${getBackgroundClass()}`
          : `flex-1 h-full min-h-screen ${getBackgroundClass()}`
      )}
    >
      {/* メインスピナー */}
      <div className="relative">
        <DoubleRingSpinner />

        {/* 装飾的な背景パルス */}
        <div className="absolute -inset-8 rounded-full animate-pulse bg-green-500/5 dark:bg-green-400/5" />
      </div>

      {/* ローディングテキスト */}
      {text && (
        <p
          className={cn(
            "mt-12 text-sm font-medium",
            variant === "auth"
              ? "text-white/70"
              : "text-gray-500 dark:text-gray-400"
          )}
        >
          {text}
        </p>
      )}
    </div>
  );
}
