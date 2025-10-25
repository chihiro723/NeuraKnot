"use client";

import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

/**
 * 汎用的な確認モーダル
 * 削除確認やその他のアクション確認に使用可能
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "確認",
  cancelText = "キャンセル",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-100 dark:bg-red-900/20",
      button: "bg-red-600 hover:bg-red-700 text-white",
    },
    warning: {
      icon: "text-yellow-600 dark:text-yellow-400",
      iconBg: "bg-yellow-100 dark:bg-yellow-900/20",
      button: "bg-yellow-600 hover:bg-yellow-700 text-white",
    },
    info: {
      icon: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-100 dark:bg-blue-900/20",
      button: "bg-blue-600 hover:bg-blue-700 text-white",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black/50">
      <div
        className="relative w-full max-w-md bg-white rounded-xl shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 text-gray-400 rounded-lg transition-colors hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        {/* コンテンツ */}
        <div className="p-6">
          {/* アイコン */}
          <div
            className={cn(
              "flex justify-center items-center mx-auto mb-4 w-12 h-12 rounded-full",
              styles.iconBg
            )}
          >
            <AlertTriangle className={cn("w-6 h-6", styles.icon)} />
          </div>

          {/* タイトル */}
          <h3 className="mb-2 text-lg font-semibold text-center text-gray-900 dark:text-white">
            {title}
          </h3>

          {/* メッセージ */}
          <p className="mb-6 text-sm text-center text-gray-600 dark:text-gray-300">
            {message}
          </p>

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-all dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                "flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                styles.button
              )}
            >
              {isLoading ? (
                <div className="flex justify-center items-center">
                  <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

