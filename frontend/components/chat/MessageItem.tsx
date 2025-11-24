import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils/cn";
import { formatDateSeparator } from "@/lib/utils/date";
import { StreamingMessage } from "@/components/chat/StreamingMessage";
import type { Message } from "@/components/chat/ChatWindowClient";
import type { SelectedChat } from "@/lib/types";
import type { Components } from "react-markdown";

interface UserProfile {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface MessageItemProps {
  message: Message;
  currentUser: UserProfile | null;
  selectedChat: SelectedChat;
  isGroupChat: boolean;
  isClient: boolean;
  showDateSeparator: boolean;
}

/**
 * テキスト内の@メンションを処理して青色にする
 */
const processTextWithMentions = (text: string) => {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, index) => {
    if (part.match(/^@\w+$/)) {
      return (
        <span
          key={index}
          className="font-medium text-blue-500 dark:text-blue-400"
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

/**
 * ReactMarkdownのカスタムコンポーネント
 */
const markdownComponents: Components = {
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
  p: ({ node, children, ...props }) => {
    const processedChildren = React.Children.map(children, (child) => {
      if (typeof child === "string") {
        return processTextWithMentions(child);
      }
      return child;
    });
    return <p {...props}>{processedChildren}</p>;
  },
  text: ({ node, children, ...props }) => {
    if (typeof children === "string") {
      return <>{processTextWithMentions(children)}</>;
    }
    return <>{children}</>;
  },
};

export const MessageItem = React.memo(function MessageItem({
  message,
  currentUser,
  selectedChat,
  isGroupChat,
  isClient,
  showDateSeparator,
}: MessageItemProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ja-JP", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div>
      {/* 日付セパレーター */}
      {showDateSeparator && isClient && (
        <div
          className="flex justify-center items-center my-6 animate-fadeIn"
          role="separator"
          aria-label={`日付: ${formatDateSeparator(message.created_at)}`}
        >
          <div className="px-3 py-1 text-xs text-gray-500 rounded-full shadow-sm backdrop-blur-sm transition-all bg-gray-100/80 dark:text-gray-400 dark:bg-gray-800/80 hover:scale-105">
            {formatDateSeparator(message.created_at)}
          </div>
        </div>
      )}

      {/* メッセージ */}
      <div
        id={`message-${message.id}`}
        className={`flex ${
          message.sender_type === "user" ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className={`flex items-end space-x-2 md:space-x-3 ${
            message.sender_type === "user"
              ? "flex-row-reverse space-x-reverse max-w-[90%] md:max-w-[75%]"
              : "max-w-[90%] md:max-w-[75%] overflow-hidden"
          }`}
        >
          {message.sender_type === "user" ? (
            /* 自分のメッセージ（右側） */
            <div className="flex flex-row-reverse flex-1 items-start space-x-3 space-x-reverse min-w-0">
              {/* 自分のアイコン */}
              <div className="flex overflow-hidden flex-shrink-0 justify-center items-center w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-md md:w-10 md:h-10 shadow-green-500/40">
                {currentUser?.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.display_name || currentUser.username}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-xs font-medium text-white md:text-sm">
                    {(
                      currentUser?.display_name ||
                      currentUser?.username ||
                      "U"
                    ).charAt(0)}
                  </span>
                )}
              </div>

              {/* 右側のコンテンツ */}
              <div className="flex overflow-hidden flex-col flex-1 items-end space-y-1 min-w-0 max-w-full">
                {/* 名前 */}
                <span className="text-xs font-medium text-gray-600 md:text-sm dark:text-gray-400">
                  {currentUser?.display_name ||
                    currentUser?.username ||
                    "あなた"}
                </span>

                <div className="flex space-x-1 min-w-0 max-w-full">
                  {/* タイムスタンプ */}
                  <span className="flex-shrink-0 self-end pb-1 text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
                    {isClient ? formatTime(message.created_at) : "--:--"}
                  </span>

                  {/* メッセージバブル */}
                  <div
                    className={cn(
                      "overflow-hidden px-3 py-2 min-w-0 max-w-full break-words rounded-2xl rounded-tr-sm shadow-sm md:px-4 md:py-3",
                      "text-white bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30"
                    )}
                  >
                    <div className="max-w-full text-sm leading-relaxed break-words lg:text-base overflow-wrap-anywhere word-break-break-word markdown-chat">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* AIメッセージ（左側） */
            <StreamingMessage
              content={message.content}
              tools={
                message.tool_usages
                  ? message.tool_usages.map((toolUsage) => {
                      let input = toolUsage.input_data;
                      try {
                        if (typeof input === "string") {
                          input = JSON.parse(input);
                        }
                      } catch (e) {
                        // JSONパースエラーの場合はそのまま表示
                      }

                      return {
                        tool_id: toolUsage.id,
                        tool_name: toolUsage.tool_name,
                        status: toolUsage.status,
                        input: input,
                        output: toolUsage.output_data,
                        error: toolUsage.error_message,
                        execution_time_ms: toolUsage.execution_time_ms,
                        insertPosition: toolUsage.insert_position,
                        expanded: false,
                      };
                    })
                  : []
              }
              avatarUrl={
                isGroupChat
                  ? message.sender_icon || undefined
                  : message.sender_icon || selectedChat.avatar_url
              }
              name={message.sender_name || selectedChat.name}
              showCursor={false}
              agentId={message.sender_id || selectedChat.id}
            />
          )}
        </div>
      </div>
    </div>
  );
});
