"use client";

/**
 * MCPサーバー管理画面
 * MCPサーバーの一覧表示、登録、編集、削除、ツール同期
 */

import { useState, useEffect } from "react";
import {
  Server,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Check,
  X,
  Eye,
} from "lucide-react";
import {
  listMCPServers,
  createMCPServer,
  updateMCPServer,
  deleteMCPServer,
  syncMCPTools,
  listMCPTools,
} from "@/lib/actions/mcp-actions";
import type {
  MCPServer,
  RegisterMCPServerInput,
  MCPAuthType,
  MCPTool,
} from "@/lib/types/mcp";

export function MCPServerManager() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [tools, setTools] = useState<Record<string, MCPTool[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);

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

  // サーバー一覧を取得
  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    setLoading(true);
    setError("");
    const result = await listMCPServers();
    if (result.success && result.servers) {
      setServers(result.servers);
    } else {
      setError(result.error || "サーバー一覧の取得に失敗しました");
    }
    setLoading(false);
  };

  // ツール一覧を取得
  const fetchTools = async (serverId: string) => {
    const result = await listMCPTools(serverId);
    if (result.success && result.tools) {
      setTools((prev) => ({ ...prev, [serverId]: result.tools! }));
    }
  };

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
    setEditingServer(null);
    setShowForm(false);
  };

  // サーバーを登録
  const handleCreate = async () => {
    setError("");
    const result = await createMCPServer(formData);
    if (result.success) {
      resetForm();
      fetchServers();
    } else {
      setError(result.error || "サーバーの登録に失敗しました");
    }
  };

  // ツールを同期
  const handleSync = async (serverId: string) => {
    setError("");
    const result = await syncMCPTools(serverId);
    if (result.success) {
      fetchServers();
      fetchTools(serverId);
    } else {
      setError(result.error || "ツールの同期に失敗しました");
    }
  };

  // サーバーを削除
  const handleDelete = async (serverId: string) => {
    if (!confirm("このサーバーを削除してもよろしいですか？")) return;

    setError("");
    const result = await deleteMCPServer(serverId);
    if (result.success) {
      fetchServers();
    } else {
      setError(result.error || "サーバーの削除に失敗しました");
    }
  };

  // ツールを表示
  const toggleTools = async (serverId: string) => {
    if (selectedServer === serverId) {
      setSelectedServer(null);
    } else {
      setSelectedServer(serverId);
      if (!tools[serverId]) {
        await fetchTools(serverId);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 rounded-full border-b-2 border-emerald-500 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            外部サービス連携
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            外部ツールを連携してAIを強化
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 space-x-2 text-white bg-emerald-500 rounded-lg transition-colors hover:bg-emerald-600"
          >
            <Plus className="w-4 h-4" />
            <span>サーバー追加</span>
          </button>
        )}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="p-4 text-red-700 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* 登録フォーム */}
      {showForm && (
        <div className="p-6 space-y-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingServer ? "サーバー編集" : "新規サーバー登録"}
            </h3>
            <button
              onClick={resetForm}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* サーバー名 */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              サーバー名 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="px-4 py-2 w-full text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="例: My Slack Integration"
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              説明
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="px-4 py-2 w-full text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              rows={2}
              placeholder="このサーバーの用途や詳細"
            />
          </div>

          {/* ベースURL */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              ベースURL *
            </label>
            <input
              type="url"
              value={formData.base_url}
              onChange={(e) =>
                setFormData({ ...formData, base_url: e.target.value })
              }
              className="px-4 py-2 w-full text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="https://your-mcp-server.com"
            />
          </div>

          {/* 認証設定 */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.requires_auth}
              onChange={(e) =>
                setFormData({ ...formData, requires_auth: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              認証が必要
            </label>
          </div>

          {/* 認証タイプとAPIキー */}
          {formData.requires_auth && (
            <>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  className="px-4 py-2 w-full text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">選択してください</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  APIキー
                </label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) =>
                    setFormData({ ...formData, api_key: e.target.value })
                  }
                  className="px-4 py-2 w-full text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="APIキーを入力"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  ⚠️ APIキーは暗号化されてサーバーに保存されます
                </p>
              </div>
            </>
          )}

          {/* 送信ボタン */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              キャンセル
            </button>
            <button
              onClick={handleCreate}
              disabled={!formData.name || !formData.base_url}
              className="flex items-center px-4 py-2 space-x-2 text-white bg-emerald-500 rounded-lg transition-colors hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>{editingServer ? "更新" : "登録"}</span>
            </button>
          </div>
        </div>
      )}

      {/* サーバー一覧 */}
      <div className="space-y-3">
        {servers.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <Server className="mx-auto mb-3 w-12 h-12 opacity-50" />
            <p>MCPサーバーが登録されていません</p>
            <p className="mt-1 text-sm">
              「サーバー追加」ボタンから登録してください
            </p>
          </div>
        ) : (
          servers.map((server) => (
            <div
              key={server.id}
              className="p-4 bg-white rounded-xl border border-gray-200 transition-colors dark:bg-gray-800 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Server className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {server.name}
                    </h3>
                    {server.server_type === "built_in" && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                        Built-in
                      </span>
                    )}
                  </div>
                  {server.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {server.description}
                    </p>
                  )}
                  <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{server.base_url}</span>
                    <span>ツール数: {server.tools_count}</span>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleTools(server.id)}
                    className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="ツールを表示"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {server.server_type !== "built_in" && (
                    <>
                      <button
                        onClick={() => handleSync(server.id)}
                        className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="ツールを同期"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(server.id)}
                        className="p-2 text-red-600 rounded-lg transition-colors hover:bg-red-100 dark:hover:bg-red-900/20 dark:text-red-400"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ツール一覧 */}
              {selectedServer === server.id && tools[server.id] && (
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    利用可能なツール ({tools[server.id].length}個)
                  </h4>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {tools[server.id].map((tool) => (
                      <div
                        key={tool.id}
                        className="p-2 text-sm bg-gray-50 rounded-lg dark:bg-gray-700/50"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {tool.tool_name}
                        </div>
                        {tool.tool_description && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {tool.tool_description}
                          </div>
                        )}
                        {tool.category && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded">
                            {tool.category}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
