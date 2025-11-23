"use client";

import { useEffect, useRef } from "react";
import { GroupMessage as GroupMessageType } from "@/lib/api/group-chat";
import { GroupMessage } from "./GroupMessage";
import { StreamingMessage } from "../chat/StreamingMessage";

interface GroupMessageListProps {
  messages: GroupMessageType[];
  streamingAgentId: string | null;
  streamingAgentName: string;
  streamingAgentIcon: string;
  streamingContent: string;
  streamingTools?: any[];
}

export function GroupMessageList({
  messages,
  streamingAgentId,
  streamingAgentName,
  streamingAgentIcon,
  streamingContent,
  streamingTools = [],
}: GroupMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("[GroupMessageList] Messages updated. Count:", messages.length);
    console.log("[GroupMessageList] Messages:", messages);
  }, [messages]);

  useEffect(() => {
    console.log("[GroupMessageList] streamingTools updated:", streamingTools);
  }, [streamingTools]);


  useEffect(() => {
    // 新しいメッセージが来たら自動スクロール
    console.log("[GroupMessageList] Scrolling to bottom");
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  if (messages.length === 0 && !streamingAgentId) {
    return (
      <div className="flex justify-center items-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="mb-2 text-lg">メッセージがありません</p>
          <p className="text-sm">
            @でエージェントをメンションしてメッセージを送信しましょう
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1 p-4 space-y-6">
      {messages.map((message) => (
        <GroupMessage key={message.id} message={message} isStreaming={false} />
      ))}

      {/* ストリーミング中のメッセージを表示 */}
      {streamingAgentId && streamingAgentName && (
        <div className="flex items-start space-x-3">
          {streamingAgentIcon ? (
            <img
              src={streamingAgentIcon}
              alt={streamingAgentName}
              className="flex-shrink-0 w-8 h-8 rounded-full"
            />
          ) : (
            <div className="flex flex-shrink-0 justify-center items-center w-8 h-8 rounded-full bg-primary/10">
              <span className="text-sm">{streamingAgentName.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center mb-1 space-x-2">
              <span className="text-sm font-semibold">
                {streamingAgentName}
              </span>
              <span className="text-xs text-muted-foreground">返信中...</span>
            </div>
            {streamingContent || streamingTools.length > 0 ? (
              <StreamingMessage
                content={streamingContent}
                tools={streamingTools}
                avatarUrl={streamingAgentIcon}
                name={streamingAgentName}
                showCursor={true}
                agentId={streamingAgentId}
              />
            ) : (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full animate-pulse bg-primary"></div>
                <span>準備中...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
