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

  // メッセージとツールを時系列順に組み合わせる
  const renderContentWithTools = () => {
    // ツールをinsertPositionでソート（null/undefinedは0として扱う）
    const sortedTools = [...tools].sort(
      (a, b) => (a.insertPosition ?? 0) - (b.insertPosition ?? 0)
    );

    // ツールがない場合は通常のレンダリング
    if (
      sortedTools.length === 0 ||
      !sortedTools.some((t) => t.insertPosition != null) // undefined と null の両方をチェック
    ) {
      return (
        <>
          {content && (
            <div className="max-w-none text-sm leading-relaxed break-words lg:text-base prose prose-sm dark:prose-invert overflow-wrap-anywhere">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </>
      );
    }

    // メッセージを分割してツールUIを挿入
    const segments: React.ReactElement[] = [];
    let lastPosition = 0;

    sortedTools.forEach((tool, index) => {
      const insertPos = tool.insertPosition ?? 0;

      // 前回の位置から現在のツール位置までのテキスト
      if (insertPos > lastPosition && content) {
        const textSegment = content.slice(lastPosition, insertPos);
        if (textSegment) {
          segments.push(
            <div
              key={`text-${index}`}
              className="max-w-none text-sm leading-relaxed break-words lg:text-base prose prose-sm dark:prose-invert overflow-wrap-anywhere"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {textSegment}
              </ReactMarkdown>
            </div>
          );
        }
      }

      // ツールUI
      segments.push(
        <ToolUsageIndicator key={`tool-${index}`} tools={[tool]} />
      );

      lastPosition = insertPos;
    });

    // 最後のツール以降のテキスト
    if (lastPosition < content.length && content) {
      const remainingText = content.slice(lastPosition);
      if (remainingText) {
        segments.push(
          <div
            key="text-final"
            className="max-w-none text-sm leading-relaxed break-words lg:text-base prose prose-sm dark:prose-invert overflow-wrap-anywhere"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {remainingText}
            </ReactMarkdown>
          </div>
        );
      }
    }

    return <>{segments}</>;
  };

  return (
    <div className="flex justify-start px-2">
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
        <div className="flex overflow-hidden flex-col space-y-1 min-w-0">
          {/* 名前 */}
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {name}
          </span>

          <div className="flex flex-col space-y-2 min-w-0">
            <div className="flex space-x-2 min-w-0">
              {/* メッセージバブル */}
              <div className="px-4 py-3 text-gray-900 bg-white rounded-2xl rounded-tl-sm border border-gray-200 shadow-sm dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700">
                {/* メッセージとツールを時系列順に表示 */}
                {renderContentWithTools()}
              </div>

              {/* コピーボタンとタイムスタンプ（生成中と生成後で完全に同じUI） */}
              <div
                className="flex flex-col flex-shrink-0 items-center self-end pb-1"
                style={{ gap: "4px" }}
              >
                <button
                  onClick={handleCopy}
                  disabled={showCursor}
                  className="p-1 text-gray-400 rounded transition-colors hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={showCursor ? "生成中..." : "コピー"}
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
