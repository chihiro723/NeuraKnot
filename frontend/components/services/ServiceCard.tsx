"use client";

import { Check, Lock, Unlock, Sparkles, Star, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getServiceIcon, getServiceGradient } from "@/lib/utils/serviceIcons";
import type { Service } from "@/lib/types/service";

interface ServiceCardProps {
  service: Service;
  onClick: () => void;
  isConfigured?: boolean;
  isHighlighted?: boolean;
  isDisabled?: boolean;
  requiresAuth?: boolean;
  isUnlocked?: boolean;
  isEnabled?: boolean;
}

/**
 * サービスカードコンポーネント
 * 正方形のカードでサービスを表示
 */
export function ServiceCard({
  service,
  onClick,
  isConfigured = false,
  isHighlighted = false,
  isDisabled = false,
  requiresAuth = false,
  isUnlocked = false,
  isEnabled = true,
}: ServiceCardProps) {
  // 認証が必要かどうかを判定
  const needsAuth =
    requiresAuth ||
    (service.auth_schema &&
      Object.keys(service.auth_schema.properties || {}).length > 0);

  // サービスに適したアイコンとグラデーションを取得
  const ServiceIcon = getServiceIcon(service.name);
  const gradientClass = getServiceGradient(service.name);

  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        "group relative w-full aspect-square rounded-xl border-2 transition-all duration-300",
        "flex flex-col items-center justify-center p-6 text-center",
        "overflow-hidden",
        // アンロック状態の特別なスタイル（登録画面用は暗く）
        isUnlocked && isDisabled
          ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50"
          : isUnlocked
          ? "bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/20 dark:via-amber-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-600 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30"
          : isDisabled
          ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          : isHighlighted
          ? "border-green-500 shadow-lg shadow-green-500/30 animate-pulse bg-white dark:bg-gray-800"
          : !isEnabled
          ? "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
          : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 bg-white dark:bg-gray-800",
        !isDisabled && "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      )}
    >
      {/* アンロック状態の装飾 */}
      {isUnlocked && !isDisabled && (
        <>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400" />
          <div className="absolute top-2 right-2">
            <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
          </div>
          <div className="absolute top-2 left-2">
            <Star className="w-3 h-3 text-amber-500" />
          </div>
        </>
      )}
      {/* 登録済み状態の装飾（暗い） */}
      {isUnlocked && isDisabled && (
        <>
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-400 dark:bg-gray-600" />
          <div className="absolute top-2 right-2">
            <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
        </>
      )}

      {/* アイコンエリア */}
      <div
        className={cn(
          "flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg transition-transform relative",
          !isDisabled && "group-hover:scale-110",
          isUnlocked && !isDisabled
            ? `bg-gradient-to-br ${gradientClass} shadow-xl shadow-yellow-500/30`
            : isUnlocked && isDisabled
            ? `bg-gradient-to-br ${gradientClass} opacity-30`
            : `bg-gradient-to-br ${gradientClass}`
        )}
      >
        <ServiceIcon
          className={cn(
            "w-8 h-8 text-white",
            isUnlocked && isDisabled && "opacity-40"
          )}
        />
      </div>

      {/* サービス名 */}
      <h3
        className={cn(
          "font-bold mb-2 line-clamp-2 text-sm leading-tight",
          isUnlocked && !isDisabled
            ? "text-amber-900 dark:text-yellow-200"
            : isUnlocked && isDisabled
            ? "text-gray-400 dark:text-gray-500"
            : isDisabled
            ? "text-gray-400 dark:text-gray-600"
            : "text-gray-900 dark:text-white"
        )}
      >
        {service.name}
      </h3>

      {/* バッジ - 認証状態のみ表示 */}
      <div className="flex flex-wrap gap-1 justify-center mb-2">
        {needsAuth && (
          <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded flex items-center gap-1">
            <Lock className="w-3 h-3" />
            認証必要
          </span>
        )}
        {!needsAuth && (
          <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1">
            <Unlock className="w-3 h-3" />
            認証不要
          </span>
        )}
      </div>

      {/* 説明（短縮版） */}
      <p
        className={cn(
          "text-xs line-clamp-2",
          isUnlocked && !isDisabled
            ? "text-amber-700 dark:text-yellow-300"
            : isUnlocked && isDisabled
            ? "text-gray-400 dark:text-gray-500"
            : isDisabled
            ? "text-gray-400 dark:text-gray-600"
            : "text-gray-500 dark:text-gray-400"
        )}
      >
        {service.description}
      </p>

      {/* ハイライトインジケーター */}
      {isHighlighted && !isUnlocked && isEnabled && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full animate-ping" />
      )}

      {/* 無効バッジ - 右上角 */}
      {!isEnabled && (
        <div className="absolute top-2 right-2">
          <span className="flex gap-1 items-center px-3 py-1 text-xs font-semibold text-white bg-gray-500 rounded-full shadow-lg">
            無効
          </span>
        </div>
      )}

      {/* アンロック状態の光るエフェクト */}
      {isUnlocked && !isDisabled && (
        <div className="absolute inset-0 bg-gradient-to-br via-transparent rounded-xl pointer-events-none from-yellow-400/10 to-amber-400/10" />
      )}

      {/* 無効状態の装飾（アンロック状態を模倣） */}
      {!isEnabled && (
        <>
          {/* 上部のグレーバー */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-400" />
          {/* 左上の無効アイコン */}
          <div className="absolute top-2 left-2">
            <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </div>
          {/* 全体の無効エフェクト */}
          <div className="absolute inset-0 bg-gradient-to-br via-transparent rounded-xl pointer-events-none from-gray-400/10 to-gray-500/10" />
        </>
      )}
    </button>
  );
}
