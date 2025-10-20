"use client";

import { useState } from "react";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import { X, Plus, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getServiceIcon, getServiceGradient } from "@/lib/utils/serviceIcons";
import { registerService, validateServiceAuth } from "@/lib/actions/services";
import type { Service, ServiceConfig, Tool } from "@/lib/types/service";

interface ServiceRegistrationModalProps {
  service: Service | null;
  tools: Tool[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (config: ServiceConfig) => void;
}

/**
 * サービス登録モーダル
 * サービス詳細と認証情報入力フォームを表示
 */
export function ServiceRegistrationModal({
  service,
  tools,
  isOpen,
  onClose,
  onSuccess,
}: ServiceRegistrationModalProps) {
  const [authData, setAuthData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // 背景スクロールをロック
  useBodyScrollLock(isOpen);

  if (!isOpen || !service) return null;

  // サービスに適したアイコンとグラデーションを取得
  const ServiceIcon = getServiceIcon(service.name);
  const gradientClass = getServiceGradient(service.name);

  // 認証が必要かチェック
  const requiresAuth = Boolean(
    service.auth_schema &&
      service.auth_schema.properties &&
      Object.keys(service.auth_schema.properties).length > 0
  );

  // デバッグ用ログ
  console.log("Service auth check:", {
    serviceName: service.name,
    hasAuthSchema: !!service.auth_schema,
    authProperties: service.auth_schema?.properties,
    requiresAuth,
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // 認証が必要な場合は検証を実行
      if (requiresAuth) {
        console.log(
          "Validating auth for service:",
          service.class_name,
          "with data:",
          authData
        );

        // 認証情報が入力されているかチェック
        const hasAuthData = Object.values(authData).some(
          (value) => value && value.trim() !== ""
        );
        if (!hasAuthData) {
          console.log("No auth data provided");
          setError("認証情報を入力してください");
          setIsSubmitting(false);
          return;
        }

        console.log("Calling validateServiceAuth...");
        const validation = await validateServiceAuth(
          service.class_name,
          authData
        );

        console.log("Validation result:", validation);

        if (!validation.valid) {
          setError(validation.error || "認証情報が正しくありません");
          setIsSubmitting(false);
          return;
        }

        console.log("Auth validation successful");
      } else {
        console.log("No auth required for service:", service.class_name);
      }

      const config = await registerService(
        service.class_name,
        undefined,
        requiresAuth ? authData : undefined
      );

      if (onSuccess) {
        onSuccess(config);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "サービスの登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex fixed inset-0 z-50 justify-center items-center p-4 backdrop-blur-sm bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div
              className={cn(
                "flex justify-center items-center w-12 h-12 bg-gradient-to-br rounded-xl shadow-lg",
                gradientClass
              )}
            >
              {service.icon ? (
                <span className="text-2xl">{service.icon}</span>
              ) : (
                <ServiceIcon className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {service.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                サービスを登録
              </p>
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

          {/* 認証情報入力フォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {requiresAuth ? (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  認証情報を入力
                </h3>
                <div className="space-y-4">
                  {Object.entries(service.auth_schema.properties || {}).map(
                    ([key, field]: [string, any]) => (
                      <div key={key}>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {field.title || key}
                          {field.required && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </label>
                        <input
                          type={field.type === "string" ? "text" : "password"}
                          value={authData[key] || ""}
                          onChange={(e) =>
                            setAuthData({
                              ...authData,
                              [key]: e.target.value,
                            })
                          }
                          placeholder={field.description || `Enter ${key}`}
                          required={field.required}
                          className="px-4 py-3 w-full text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        />
                        {field.description && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {field.description}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                <div className="flex items-center">
                  <Check className="mr-2 w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    このサービスは認証情報が不要です
                  </p>
                </div>
              </div>
            )}

            {/* エラー表示 */}
            {error && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
            )}
          </form>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3 justify-end px-6 py-4 bg-gray-50 border-t border-gray-200 dark:border-gray-700 dark:bg-gray-900">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-white rounded-lg border border-gray-300 transition-colors dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "flex items-center px-6 py-2 space-x-2 rounded-lg transition-colors",
              "text-white bg-green-600 hover:bg-green-700",
              "disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                <span>接続確認中...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>登録する</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
