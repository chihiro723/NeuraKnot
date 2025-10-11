"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { ToolUsageIndicator } from "./ToolUsageIndicator";
import type { ToolUsageData } from "@/lib/types";

interface StreamingMessageProps {
  content: string;
  tools: ToolUsageData[];
  avatarUrl?: string;
  name: string;
  showCursor?: boolean;
  hideContent?: boolean;
}

export function StreamingMessage({
  content,
  tools,
  avatarUrl,
  name,
  showCursor = true,
  hideContent = false,
}: StreamingMessageProps) {
  const [copied, setCopied] = useState(false);

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // hideContentがtrueの場合は、ツールインジケーターのみ表示
  if (hideContent) {
    return (
      <div className="w-full">
        {tools.length > 0 && <ToolUsageIndicator tools={tools} />}
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="flex items-start space-x-3 max-w-[85%] lg:max-w-[75%]">
        {/* アイコン */}
        <div className="flex overflow-hidden flex-shrink-0 justify-center items-center w-10 h-10 bg-green-500 rounded-full">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-sm font-medium text-white">
              {name.charAt(0)}
            </span>
          )}
        </div>

        {/* 右側のコンテンツ */}
        <div className="flex flex-col flex-1 space-y-1 min-w-0 overflow-hidden">
          {/* 名前 */}
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {name}
          </span>

          <div className="flex flex-col space-y-2 min-w-0">
            {/* ツール実行中バナー */}
            {tools.some((t) => t.status === "running") && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full absolute inset-0"></div>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {tools
                        .filter((t) => t.status === "running")
                        .map((t) => t.tool_name)
                        .join(", ")}{" "}
                      を使用中
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                      処理しています...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-2 min-w-0">
              {/* メッセージバブル */}
              <div className="px-4 py-3 text-gray-900 bg-white rounded-2xl rounded-tl-sm border border-gray-200 shadow-sm dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 min-w-0 flex-1">
                {/* ツールインジケーター */}
                {tools.length > 0 && <ToolUsageIndicator tools={tools} />}

                {/* メッセージ内容 */}
                {content && (
                  <div className="max-w-none text-sm leading-relaxed break-words lg:text-base prose prose-sm dark:prose-invert overflow-wrap-anywhere">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* コピーボタンとタイムスタンプ（ストリーミング中は透明） */}
              <div
                className={`flex flex-col flex-shrink-0 items-center self-end pb-1 transition-opacity ${
                  showCursor ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
                style={{ gap: "4px" }}
              >
                <button
                  onClick={handleCopy}
                  className="p-1 text-gray-400 rounded transition-colors hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="コピー"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
