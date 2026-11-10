"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Avatar } from "@/components/ui/Avatar";
import { Phone, ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/lib/hooks/useResponsive";
import { useVoiceCall } from "@/lib/contexts/VoiceCallContext";
import type { ToolUsage } from "@/lib/types";

export interface Message {
  id: string;
  content: string;
  sender_type: "user" | "ai";
  sender_id: string;
  sender_name?: string;
  sender_icon?: string;
  created_at: string;
  tool_usages?: ToolUsage[];
}

export interface UserProfile {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export interface ChatWindowClientProps {
  chatData: {
    id: string;
    name: string;
    avatar_url?: string;
    type: "ai" | "human" | "group";
    status: "online" | "offline" | "away";
    personality_preset?: string;
    description?: string;
    provider?: string;
    model?: string;
    members?: any[];
  };
  conversationId?: string;
  initialMessages?: Message[];
  initialUserProfile?: UserProfile;
  isGroupChat?: boolean;
}

/**
 * チャットウィンドウのクライアントコンポーネント
 */
export function ChatWindowClient({
  chatData,
  conversationId,
  initialMessages,
  initialUserProfile,
  isGroupChat = false,
}: ChatWindowClientProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { isActive, agentId, startCall, expand } = useVoiceCall();

  const showVoiceCallButton =
    chatData.type === "ai" && !isGroupChat;
  const isWebLLM = chatData.provider === "webllm";
  const isThisAgentInCall = isActive && agentId === chatData.id;
  const voiceCallDisabled = isWebLLM || (isActive && !isThisAgentInCall);

  const handleAvatarClick = () => {
    if (chatData.type === "ai" || chatData.type === "group") {
      router.push(`/dashboard/roster/${chatData.id}`);
    }
  };

  const handleBack = () => {
    router.push("/dashboard/chats");
  };

  const handleVoiceCall = () => {
    if (isThisAgentInCall) {
      expand();
      return;
    }
    startCall(
      {
        name: chatData.name,
        avatar_url: chatData.avatar_url,
        type: "ai",
      },
      chatData.id,
    );
  };

  return (
    <>
      <div className="flex justify-between items-center px-4 h-16 bg-white border-b border-gray-200 md:h-16 md:px-6 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleAvatarClick}
            disabled={chatData.type !== "ai" && chatData.type !== "group"}
            className={`transition-all duration-200 ${
              chatData.type === "ai" || chatData.type === "group"
                ? "hover:scale-105 cursor-pointer"
                : "cursor-default"
            }`}
            title={
              chatData.type === "ai"
                ? "エージェントの詳細を表示"
                : chatData.type === "group"
                  ? "グループの詳細を表示"
                  : ""
            }
          >
            <Avatar
              src={chatData.avatar_url}
              alt={chatData.name}
              name={chatData.name}
              type={chatData.type === "group" ? "human" : chatData.type}
              size="md"
            />
          </button>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">
              {chatData.name}
              {chatData.type === "group" && chatData.members && (
                <span className="ml-1 font-normal">
                  ({chatData.members.length + 1})
                </span>
              )}
            </h2>
            {chatData.type === "ai" && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                エージェント
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isMobile && (
            <button
              onClick={handleBack}
              className="flex justify-center items-center p-2 text-gray-600 rounded-lg transition-all duration-200 bg-gray-50/80 dark:text-gray-300 dark:bg-gray-800/50 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700"
              title="戻る"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {showVoiceCallButton && (
            <div className="relative group">
              <button
                type="button"
                disabled={voiceCallDisabled}
                onClick={handleVoiceCall}
                className="p-2 text-gray-400 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:hover:text-gray-400 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                aria-label="音声通話"
              >
                <Phone className="w-5 h-5" />
              </button>
              <div className="absolute top-full left-1/2 z-10 px-2 py-1 mt-1 text-xs text-gray-600 whitespace-nowrap bg-gray-100 rounded-md shadow-sm opacity-0 transition-opacity duration-200 transform -translate-x-1/2 pointer-events-none dark:text-gray-300 dark:bg-gray-700 group-hover:opacity-100">
                {isWebLLM
                  ? "ブラウザローカルモデルは音声通話に対応していません"
                  : isThisAgentInCall
                    ? "通話画面を開く"
                    : isActive
                      ? "別の通話中"
                      : "音声通話"}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex overflow-hidden flex-col flex-1 min-w-0">
        <ChatWindow
          selectedChat={{
            id: chatData.id,
            name: chatData.name,
            avatar_url: chatData.avatar_url,
            type: chatData.type,
            status: chatData.status,
            personality_preset: chatData.personality_preset,
            provider: chatData.provider,
            model: chatData.model,
            members: chatData.members,
          }}
          initialMessages={initialMessages}
          initialConversationId={conversationId}
          initialUserProfile={initialUserProfile}
          isGroupChat={isGroupChat}
        />
      </div>
    </>
  );
}
