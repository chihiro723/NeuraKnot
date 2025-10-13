"use client";

import { Server } from "lucide-react";

/**
 * マイサービスページ
 * 登録済みMCPサーバー一覧を表示
 * サイドバーは layout.tsx で定義されている
 */
export default function MyServicesPage() {
  // TODO: MCPサーバー一覧の取得と表示
  return (
    <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
      <div className="p-8 text-center">
        <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-2xl shadow-lg dark:bg-green-500/20 shadow-green-500/20">
          <Server className="w-8 h-8 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          サービス一覧
        </h3>
        <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
          登録済みのMCPサーバーがここに表示されます
        </p>
      </div>
    </div>
  );
}
