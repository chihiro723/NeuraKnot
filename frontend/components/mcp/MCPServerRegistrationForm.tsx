"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { createMCPServer } from "@/lib/actions/mcp-actions";
import type { RegisterMCPServerInput, MCPAuthType } from "@/lib/types/mcp";
import { cn } from "@/lib/utils/cn";

/**
 * MCPサーバー登録フォームコンポーネント
 */
export function MCPServerRegistrationForm() {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フォームデータ
  const [formData, setFormData] = useState<RegisterMCPServerInput>({
    name: "",
    description: "",
    base_url: "",
    requires_auth: false,
    auth_type: undefined,
    api_key: "",
    custom_headers: {},
  });

  // フォームをリセット
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      base_url: "",
      requires_auth: false,
      auth_type: undefined,
      api_key: "",
      custom_headers: {},
    });
    setError("");
    setSuccess(false);
  };

  // サーバーを登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsSubmitting(true);

    const result = await createMCPServer(formData);
    if (result.success) {
      setSuccess(true);
      resetForm();
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || "サーバーの登録に失敗しました");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              新規サーバー登録
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              新しいMCPサーバーを登録します
            </p>
          </div>
        </div>
      </div>

      {/* フォーム */}
      <div className="overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900">
        <form
          onSubmit={handleSubmit}
          className="p-8 mx-auto space-y-10 max-w-2xl"
        >
          {/* 成功メッセージ */}
          {success && (
            <div className="p-4 text-green-700 bg-green-50 rounded-lg border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
              サーバーを登録しました！
            </div>
          )}

          {/* エラーメッセージ */}
          {error && (
            <div className="p-4 text-red-700 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          {/* セクション1: 基本情報 */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                基本情報
              </h2>
            </div>

            {/* サーバー名 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                サーバー名 <span className="text-green-600">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例: My Slack Integration"
                className={cn(
                  "px-4 py-3 w-full bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                  "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                  "placeholder-gray-400 text-gray-900 dark:text-white dark:placeholder-gray-500"
                )}
                required
              />
            </div>

            {/* 説明 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                説明 <span className="text-xs text-gray-400">任意</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="このサーバーの用途や詳細"
                rows={3}
                className={cn(
                  "px-4 py-3 w-full bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                  "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                  "placeholder-gray-400 text-gray-900 resize-none dark:text-white dark:placeholder-gray-500"
                )}
              />
            </div>

            {/* ベースURL */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                ベースURL <span className="text-green-600">*</span>
              </label>
              <input
                type="url"
                value={formData.base_url}
                onChange={(e) =>
                  setFormData({ ...formData, base_url: e.target.value })
                }
                placeholder="https://your-mcp-server.com"
                className={cn(
                  "px-4 py-3 w-full bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                  "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                  "placeholder-gray-400 text-gray-900 dark:text-white dark:placeholder-gray-500"
                )}
                required
              />
            </div>
          </div>

          {/* セクション2: 認証設定 */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                認証設定
              </h2>
            </div>

            {/* 認証が必要 */}
            <div className="flex justify-between items-center py-3">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  認証が必要
                </h4>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  MCPサーバーへのアクセスに認証が必要な場合はオンにしてください
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    requires_auth: !formData.requires_auth,
                  })
                }
                className={cn(
                  "relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
                  formData.requires_auth
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200",
                    formData.requires_auth ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* 認証タイプとAPIキー */}
            {formData.requires_auth && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    認証タイプ
                  </label>
                  <select
                    value={formData.auth_type || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        auth_type: e.target.value as MCPAuthType,
                      })
                    }
                    className={cn(
                      "px-4 py-3 w-full bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                      "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                      "text-gray-900 dark:text-white"
                    )}
                  >
                    <option value="">選択してください</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="api_key">API Key</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    APIキー
                  </label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) =>
                      setFormData({ ...formData, api_key: e.target.value })
                    }
                    placeholder="APIキーを入力"
                    className={cn(
                      "px-4 py-3 w-full bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                      "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                      "placeholder-gray-400 text-gray-900 dark:text-white dark:placeholder-gray-500"
                    )}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ⚠️ APIキーは暗号化されてサーバーに保存されます
                  </p>
                </div>
              </>
            )}
          </div>

          {/* 登録ボタン */}
          <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-all dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              クリア
            </button>
            <button
              type="submit"
              disabled={!formData.name || !formData.base_url || isSubmitting}
              className={cn(
                "flex-1 px-6 py-3 font-medium rounded-lg transition-all",
                "flex justify-center items-center space-x-2",
                "text-white bg-green-600 hover:bg-green-700",
                "disabled:bg-gray-400 dark:disabled:bg-gray-600",
                "disabled:cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                  <span>登録中...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>サーバーを登録</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
