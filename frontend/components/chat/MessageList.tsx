import React from "react";
import { formatDateSeparator, isSameDay } from "@/lib/utils/date";
import { StreamingMessage } from "@/components/chat/StreamingMessage";
import { MessageItem } from "@/components/chat/MessageItem";
import type { Message } from "@/components/chat/ChatWindowClient";
import type { ToolUsageData, SelectedChat } from "@/lib/types";

interface UserProfile {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface MessageListProps {
  messages: Message[];
  currentUser: UserProfile | null;
  selectedChat: SelectedChat;
  isGroupChat: boolean;
  isClient: boolean;
  isStreaming: boolean;
  streamingContent: string;
  streamingTools: ToolUsageData[];
  streamingAgentName: string;
  streamingAgentIcon: string;
  avatarTimestamp: number | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const MessageList = React.memo(function MessageList({
  messages,
  currentUser,
  selectedChat,
  isGroupChat,
  isClient,
  isStreaming,
  streamingContent,
  streamingTools,
  streamingAgentName,
  streamingAgentIcon,
  avatarTimestamp,
  messagesEndRef,
}: MessageListProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      {messages.map((message, index) => {
        const showDateSeparator =
          index === 0 ||
          !isSameDay(
            new Date(messages[index - 1].created_at),
            new Date(message.created_at)
          );

        return (
          <MessageItem
            key={message.id}
            message={message}
            currentUser={currentUser}
            selectedChat={selectedChat}
            isGroupChat={isGroupChat}
            isClient={isClient}
            showDateSeparator={showDateSeparator}
          />
        );
      })}

      {/* ストリーミングメッセージ */}
      {isStreaming && (streamingContent || streamingTools.length > 0) && (
        <>
          {isClient &&
            messages.length > 0 &&
            !isSameDay(
              new Date(messages[messages.length - 1].created_at),
              new Date()
            ) && (
              <div
                className="flex justify-center items-center my-6 animate-fadeIn"
                role="separator"
                aria-label={`日付: ${formatDateSeparator(
                  new Date().toISOString()
                )}`}
              >
                <div className="px-3 py-1 text-xs text-gray-500 rounded-full shadow-sm backdrop-blur-sm transition-all bg-gray-100/80 dark:text-gray-400 dark:bg-gray-800/80 hover:scale-105">
                  {formatDateSeparator(new Date().toISOString())}
                </div>
              </div>
            )}
          <div className="flex justify-start">
            <div className="flex items-end space-x-2 md:space-x-3 max-w-[90%] md:max-w-[75%] overflow-hidden">
              <StreamingMessage
                content={streamingContent}
                tools={streamingTools}
                avatarUrl={
                  isGroupChat
                    ? streamingAgentIcon || undefined
                    : selectedChat.avatar_url && avatarTimestamp
                    ? `${
                        selectedChat.avatar_url.split("?")[0]
                      }?t=${avatarTimestamp}`
                    : selectedChat.avatar_url
                }
                name={
                  isGroupChat
                    ? streamingAgentName || selectedChat.name
                    : selectedChat.name
                }
                showCursor={true}
                agentId={selectedChat.id}
              />
            </div>
          </div>
        </>
      )}

      {/* ローディングインジケーター（ツール実行中やコンテンツ生成中は非表示） */}
      {isStreaming &&
        !streamingContent &&
        streamingTools.length === 0 &&
        (!isGroupChat || streamingAgentName) && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2 md:space-x-3 max-w-[90%] md:max-w-[75%] overflow-hidden">
              <div className="flex overflow-hidden flex-shrink-0 justify-center items-center w-8 h-8 bg-green-500 rounded-full md:w-10 md:h-10">
                {(
                  isGroupChat ? streamingAgentIcon : selectedChat.avatar_url
                ) ? (
                  <img
                    src={
                      isGroupChat && streamingAgentIcon
                        ? streamingAgentIcon
                        : selectedChat.avatar_url && avatarTimestamp
                        ? `${
                            selectedChat.avatar_url.split("?")[0]
                          }?t=${avatarTimestamp}`
                        : selectedChat.avatar_url || ""
                    }
                    alt={isGroupChat ? streamingAgentName : selectedChat.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-xs font-medium text-white md:text-sm">
                    {(isGroupChat
                      ? streamingAgentName
                      : selectedChat.name
                    ).charAt(0)}
                  </span>
                )}
              </div>

              <div className="flex overflow-hidden flex-col space-y-1 min-w-0 max-w-full">
                <span className="text-xs font-medium text-gray-600 md:text-sm dark:text-gray-400">
                  {isGroupChat && streamingAgentName
                    ? streamingAgentName
                    : selectedChat.name}
                </span>
                <div className="px-4 py-3 w-20 text-gray-900 bg-white rounded-2xl rounded-tl-sm border border-gray-200 shadow-sm dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700">
                  <div className="flex justify-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce dark:bg-gray-500"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce dark:bg-gray-500"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce dark:bg-gray-500"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      <div ref={messagesEndRef} className="pb-4" />
    </div>
  );
});
