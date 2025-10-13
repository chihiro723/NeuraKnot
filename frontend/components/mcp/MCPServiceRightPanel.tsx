"use client";

import { Server, Plus } from "lucide-react";
import type { MCPServiceType } from "@/lib/types/mcp";
import { MCPServerList } from "./MCPServerList";
import { MCPServerRegistrationForm } from "./MCPServerRegistrationForm";

interface MCPServiceRightPanelProps {
  selectedType: MCPServiceType;
}

/**
 * デスクトップ用の右側パネル - MCPサービス管理
 */
export function MCPServiceRightPanel({
  selectedType,
}: MCPServiceRightPanelProps) {
  if (selectedType === "my-services") {
    return <MCPServerList />;
  }

  if (selectedType === "register") {
    return <MCPServerRegistrationForm />;
  }

  // デフォルト表示
  return (
    <>
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              外部サービス連携
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              左側から操作を選択してください
            </p>
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="p-8 text-center">
          <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-2xl shadow-lg dark:bg-green-500/20 shadow-green-500/20">
            <Server className="w-8 h-8 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            MCPサービスを管理
          </h3>
          <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
            左側から操作を選択してMCPサーバーを管理しましょう
          </p>
          <div className="flex gap-6 justify-center mt-6">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-center items-center w-8 h-8 bg-green-100 rounded-lg dark:bg-green-500/20">
                <Server className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span>マイサービス</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-center items-center w-8 h-8 bg-green-100 rounded-lg dark:bg-green-500/20">
                <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span>新規登録</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
