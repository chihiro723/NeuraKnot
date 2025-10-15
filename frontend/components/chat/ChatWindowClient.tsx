"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
// useDashboard は不要（URLベースのナビゲーション）
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Avatar } from "@/components/ui/Avatar";
import { Phone } from "lucide-react";

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
  const router = useRouter();

  const handleAvatarClick = () => {
    if (chatData.type === "ai") {
      router.push(`/dashboard/roster/${chatData.id}`);
    }
  };

  return (
    <>
      {/* チャットヘッダー */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleAvatarClick}
            disabled={chatData.type !== "ai"}
            className={`transition-all duration-200 ${
              chatData.type === "ai"
                ? "hover:scale-105 cursor-pointer"
                : "cursor-default"
            }`}
            title={chatData.type === "ai" ? "エージェントの詳細を表示" : ""}
          >
            <Avatar
              src={chatData.avatar_url}
              alt={chatData.name}
              name={chatData.name}
              type={chatData.type}
              status={chatData.status}
              showStatus={true}
              size="md"
            />
          </button>
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
          <div className="relative group">
            <button className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Phone className="w-5 h-5" />
            </button>
            {/* ツールチップ */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 text-xs text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              近日追加予定
            </div>
          </div>
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
