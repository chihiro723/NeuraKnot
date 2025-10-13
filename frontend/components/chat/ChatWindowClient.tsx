"use client";

import { useEffect } from "react";
// useDashboard は不要（URLベースのナビゲーション）
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Avatar } from "@/components/ui/Avatar";
import { Phone, Video, MoreHorizontal } from "lucide-react";

export interface Message {
  id: string;
  content: string;
  sender_type: "user" | "ai";
  sender_id: string;
  created_at: string;
  tool_usages?: any[];
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
    type: "ai" | "human";
    status: "online" | "offline" | "away";
    personality_preset?: string;
    description?: string;
  };
  conversationId?: string;
  initialMessages?: Message[];
  initialUserProfile?: UserProfile;
}

/**
 * チャットウィンドウのクライアントコンポーネント
 * サーバーから渡されたchatDataを使用してDashboard Contextを更新
 */
export function ChatWindowClient({
  chatData,
  conversationId,
  initialMessages,
  initialUserProfile,
}: ChatWindowClientProps) {
  // 選択状態は URL で管理されるため、Context は不要

  return (
    <>
      {/* チャットヘッダー */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Avatar
            src={chatData.avatar_url}
            alt={chatData.name}
            name={chatData.name}
            type={chatData.type}
            status={chatData.status}
            showStatus={true}
            size="md"
          />
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">
              {chatData.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {chatData.type === "ai"
                ? "エージェント • オンライン"
                : chatData.status === "online"
                ? "オンライン"
                : "オフライン"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* チャットウィンドウ */}
      <div className="flex overflow-hidden flex-col flex-1 min-w-0">
        <ChatWindow
          selectedChat={{
            id: chatData.id,
            name: chatData.name,
            avatar_url: chatData.avatar_url,
            type: chatData.type,
            status: chatData.status,
            personality_preset: chatData.personality_preset,
          }}
          initialMessages={initialMessages}
          initialConversationId={conversationId}
          initialUserProfile={initialUserProfile}
        />
      </div>
    </>
  );
}
