"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { ToolUsageData } from "@/lib/types";

interface ToolUsageIndicatorProps {
  tools: ToolUsageData[];
  onToggle?: (toolId: string) => void;
}

export function ToolUsageIndicator({
  tools,
  onToggle,
}: ToolUsageIndicatorProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const toggleTool = (toolId: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(toolId)) {
      newExpanded.delete(toolId);
    } else {
      newExpanded.add(toolId);
    }
    setExpandedTools(newExpanded);
    onToggle?.(toolId);
  };

  if (tools.length === 0) return null;

  return (
    <div className="my-3 space-y-2">
      {tools.map((tool, index) => {
        const isExpanded = expandedTools.has(tool.tool_id);
        const isRunning = tool.status === "running";
        const isCompleted = tool.status === "completed";
        const isFailed = tool.status === "failed";

        // ステータスに応じた色
        const statusColor = isRunning
          ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30"
          : isCompleted
          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
          : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30";

        return (
          <div
            key={`${tool.tool_id}-${index}`}
            className={`overflow-hidden rounded-lg border transition-all duration-200 ${statusColor}`}
          >
            {/* ヘッダー */}
            <div
              className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              onClick={() => toggleTool(tool.tool_id)}
            >
              <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                {/* ステータスアイコン */}
                <div className="flex-shrink-0">
                  {isRunning && (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin dark:text-blue-400" />
                  )}
                  {isCompleted && (
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  )}
                  {isFailed && (
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                </div>

                {/* ツール情報 */}
                <div className="flex flex-1 items-center space-x-2 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate dark:text-gray-200">
                    {tool.tool_name}
                  </span>

                  {isCompleted && tool.execution_time_ms !== undefined && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({tool.execution_time_ms}ms)
                    </span>
                  )}
                </div>
              </div>

              {/* 展開ボタン */}
              <div className="flex-shrink-0 ml-2">
                <div
                  className={`transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                >
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
              </div>
            </div>

            {/* 詳細（展開時） - アニメーション付き */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-3 pb-2.5 pt-2.5 space-y-2 border-t border-current/10 bg-white/30 dark:bg-gray-900/30 max-h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {/* 入力 */}
                {tool.input && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      入力
                    </span>
                    <div className="p-2 text-xs text-gray-700 bg-gray-50 rounded border border-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700">
                      <pre className="font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
                        {typeof tool.input === "string"
                          ? tool.input
                          : JSON.stringify(tool.input, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 出力 */}
                {tool.output && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      結果
                    </span>
                    <div className="p-2 text-xs text-gray-700 bg-gray-50 rounded border border-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700">
                      <pre className="font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto max-w-none">
                        {typeof tool.output === "string"
                          ? tool.output
                          : JSON.stringify(tool.output, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* エラー */}
                {tool.error && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-red-700 dark:text-red-300">
                      エラー
                    </span>
                    <div className="p-2 text-xs text-red-800 bg-red-50 rounded border border-red-300 dark:text-red-200 dark:bg-red-900/30 dark:border-red-700">
                      <pre className="font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
                        {tool.error}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
