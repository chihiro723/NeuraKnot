"use client";

import { useState } from "react";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import {
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Power,
  PowerOff,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getServiceIcon, getServiceGradient } from "@/lib/utils/serviceIcons";
import type { Service, Tool, ServiceConfig } from "@/lib/types/service";

interface ServiceDetailModalProps {
  service: Service | null;
  config: ServiceConfig | null;
  tools: Tool[];
  isOpen: boolean;
  onClose: () => void;
  onToggleEnabled?: (id: string, enabled: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

/**
 * サービス詳細モーダル
 * サービスの詳細情報とツール一覧を表示
 */
export function ServiceDetailModal({
  service,
  config,
  tools,
  isOpen,
  onClose,
  onToggleEnabled,
  onDelete,
}: ServiceDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // 背景スクロールをロック
  useBodyScrollLock(isOpen);

  if (!isOpen || !service) return null;

  // ツールをカテゴリ別にグループ化
  const groupedTools = tools.reduce((acc, tool) => {
    const category = tool.category || "その他";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleToggleEnabled = async () => {
    if (!config || !onToggleEnabled) return;
    setIsToggling(true);
    try {
      await onToggleEnabled(config.id, !config.is_enabled);
      onClose(); // 操作後にモーダルを閉じる
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!config || !onDelete) return;
    if (!confirm(`「${service.name}」を削除してもよろしいですか？`)) return;
    setIsDeleting(true);
    try {
      await onDelete(config.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const canModify = service.type !== "built_in";

  // サービスに適したアイコンとグラデーションを取得
  const ServiceIcon = getServiceIcon(service.name);
  const gradientClass = getServiceGradient(service.name);

  return (
    <div
      className="flex fixed inset-0 z-50 justify-center items-center p-4 backdrop-blur-sm bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {service.name}
              </h2>
              <div className="flex gap-2 items-center mt-1">
                {config && !config.is_enabled && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    無効
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 space-y-6">
          {/* 説明 */}
          {service.description && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {service.description}
              </p>
            </div>
          )}

          {/* 詳細情報 */}
          <div className="p-4 space-y-2 bg-gray-50 rounded-lg dark:bg-gray-900">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                クラス名
              </span>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                {service.class_name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                タイプ
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {service.type === "built_in"
                  ? "組み込み"
                  : service.type === "api_wrapper"
                  ? "API ラッパー"
                  : "カスタム"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                ツール数
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {tools.length}個
              </span>
            </div>
            {config && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    状態
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {config.is_enabled ? "有効" : "無効"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    登録日
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {new Date(config.created_at).toLocaleString("ja-JP")}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ツール一覧 */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              ツール一覧
            </h3>
            {tools.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                ツールが登録されていません
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(groupedTools).map(
                  ([category, categoryTools]) => (
                    <div
                      key={category}
                      className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      {/* カテゴリヘッダー */}
                      <button
                        onClick={() => toggleCategory(category)}
                        className="flex justify-between items-center px-4 py-3 w-full bg-gray-50 transition-colors dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {category}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({categoryTools.length}個)
                          </span>
                        </div>
                        {expandedCategories.has(category) ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>

                      {/* ツールリスト */}
                      {expandedCategories.has(category) && (
                        <div className="p-3 space-y-2 bg-white dark:bg-gray-800">
                          {categoryTools.map((tool) => (
                            <div
                              key={tool.name}
                              className="p-3 bg-gray-50 rounded-lg dark:bg-gray-900"
                            >
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {tool.name}
                              </div>
                              {tool.description && (
                                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                  {tool.description}
                                </div>
                              )}
                              {tool.tags && tool.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {tool.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* アクションボタン */}
        {config && (
          <div className="flex gap-3 justify-end px-6 py-4 bg-gray-50 border-t border-gray-200 dark:border-gray-700 dark:bg-gray-900">
            {canModify && onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={cn(
                  "flex items-center px-4 py-2 space-x-2 rounded-lg transition-colors",
                  "text-white bg-red-600 hover:bg-red-700",
                  "disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                )}
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? "削除中..." : "削除"}</span>
              </button>
            )}

            {onToggleEnabled && (
              <button
                onClick={handleToggleEnabled}
                disabled={isToggling}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors",
                  config.is_enabled
                    ? "bg-gray-500 text-white hover:bg-gray-600"
                    : "bg-green-600 text-white hover:bg-green-700",
                  "disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                )}
              >
                {config.is_enabled ? (
                  <PowerOff className="w-4 h-4" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                <span>
                  {isToggling
                    ? "処理中..."
                    : config.is_enabled
                    ? "無効化"
                    : "有効化"}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
