"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  agentId?: string; // エージェントID（ナビゲーション用）
}

export function StreamingMessage({
  content,
  tools,
  avatarUrl,
  name,
  showCursor = true,
  hideContent = false,
  agentId,
}: StreamingMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatTime = () => {
    const now = new Date();
    // サーバーとクライアントで一貫した時刻表示のため、UTCベースで計算
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAvatarClick = () => {
    if (agentId) {
      router.push(`/dashboard/roster/${agentId}`);
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
    // ツールがない場合は通常のレンダリング
    if (tools.length === 0) {
      return (
        <>
          {content && (
            <div className="max-w-full text-sm leading-relaxed break-words lg:text-base overflow-wrap-anywhere word-break-break-word markdown-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </>
      );
    }

    // ツールをinsertPositionでソート（null/undefinedは0として扱う）
    const sortedTools = [...tools].sort(
      (a, b) => (a.insertPosition ?? 0) - (b.insertPosition ?? 0)
    );

    // insertPositionが設定されているツールがあるかチェック
    const hasPositionedTools = sortedTools.some(
      (t) => t.insertPosition != null
    );

    // insertPositionが設定されていない場合は、ツールをメッセージの後に表示
    if (!hasPositionedTools) {
      return (
        <>
          {content && (
            <div className="max-w-full text-sm leading-relaxed break-words lg:text-base overflow-wrap-anywhere word-break-break-word markdown-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
          <ToolUsageIndicator tools={sortedTools} />
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
              className="max-w-full text-sm leading-relaxed break-words lg:text-base overflow-wrap-anywhere word-break-break-word markdown-chat"
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
            className="max-w-full text-sm leading-relaxed break-words lg:text-base overflow-wrap-anywhere word-break-break-word markdown-chat"
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
    <div className="flex items-start space-x-2 md:space-x-3 w-full">
      {/* アイコン（クリック可能） */}
        <button
          onClick={handleAvatarClick}
          disabled={!agentId}
          className={`flex overflow-hidden flex-shrink-0 justify-center items-center w-8 h-8 md:w-10 md:h-10 bg-green-500 rounded-full transition-all duration-200 ${
            agentId
              ? "shadow-md cursor-pointer hover:bg-green-600 hover:scale-105 hover:shadow-lg"
              : "cursor-default"
          }`}
          title={agentId ? "エージェントの詳細を表示" : ""}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-xs font-medium text-white md:text-sm">
              {name.charAt(0)}
            </span>
          )}
        </button>

        {/* 右側のコンテンツ */}
        <div className="flex overflow-hidden flex-col space-y-1 min-w-0 max-w-full">
          {/* 名前 */}
          <span className="text-xs font-medium text-gray-600 md:text-sm dark:text-gray-400">
            {name}
          </span>

          <div className="flex flex-col space-y-2 min-w-0 max-w-full">
            <div className="flex space-x-2 min-w-0 max-w-full">
              {/* メッセージバブル */}
              <div
                className="overflow-hidden px-3 py-2 min-w-0 max-w-full text-gray-900 break-words bg-white rounded-2xl rounded-tl-sm border border-gray-200 shadow-sm md:px-4 md:py-3 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700"
                style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
              >
                {/* メッセージとツールを時系列順に表示 */}
                {renderContentWithTools()}
              </div>

              {/* コピーボタンとタイムスタンプ（生成中は透明、生成後は通常表示） */}
              <div
                className={`flex flex-col flex-shrink-0 items-center self-end pb-1 ${
                  showCursor ? "opacity-0" : "opacity-100"
                }`}
                style={{ gap: "4px" }}
              >
                <button
                  onClick={handleCopy}
                  disabled={showCursor}
                  className="p-1 text-gray-400 rounded transition-colors hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={showCursor ? "生成中..." : "コピー"}
                >
                  {copied ? (
                    <Check className="w-3 h-3 md:w-4 md:h-4" />
                  ) : (
                    <Copy className="w-3 h-3 md:w-4 md:h-4" />
                  )}
                </button>
                <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
                  {isClient ? formatTime() : "--:--"}
                </span>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
