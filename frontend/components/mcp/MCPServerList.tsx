"use client";

import { useState, useEffect } from "react";
import { Server, RefreshCw, Trash2, Eye } from "lucide-react";
import {
  listMCPServers,
  deleteMCPServer,
  syncMCPTools,
  listMCPTools,
} from "@/lib/actions/mcp-actions";
import type { MCPServer, MCPTool } from "@/lib/types/mcp";

/**
 * MCPサーバー一覧表示コンポーネント
 */
export function MCPServerList() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [tools, setTools] = useState<Record<string, MCPTool[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedServer, setSelectedServer] = useState<string | null>(null);

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
      <div className="flex flex-col h-full">
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
              <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                マイサービス
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                登録済みのMCPサーバーを管理
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center flex-1 bg-gray-50 dark:bg-gray-900">
          <div className="w-8 h-8 rounded-full border-b-2 border-green-500 animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              マイサービス
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {servers.length}個のサーバーが登録されています
            </p>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="overflow-y-auto flex-1 p-6 bg-gray-50 dark:bg-gray-900">
        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* サーバー一覧 */}
        <div className="space-y-3">
          {servers.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-2xl shadow-lg dark:bg-green-500/20 shadow-green-500/20">
                <Server className="w-8 h-8 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
              </div>
              <p>MCPサーバーが登録されていません</p>
              <p className="mt-1 text-sm">
                左側から「新規登録」を選択して登録してください
              </p>
            </div>
          ) : (
            servers.map((server) => (
              <div
                key={server.id}
                className="p-4 bg-white rounded-xl border border-gray-200 transition-colors dark:bg-gray-800 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Server className="w-5 h-5 text-green-500" />
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
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
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
    </div>
  );
}
