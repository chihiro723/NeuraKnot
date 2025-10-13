"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { MessageCircle, Handshake } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import type { ConversationData, ChatFilter } from "@/lib/types";

interface ChatListClientProps {
  initialConversations: any;
  initialAgents: any;
}

/**
 * チャットリストクライアントコンポーネント（グループ統合版）
 * サーバーから渡されたデータを使用
 */
export function ChatListClient({
  initialConversations,
  initialAgents,
}: ChatListClientProps) {
  const router = useRouter();
  const params = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatFilter>("all");

  // URLパラメータから現在選択されているチャットIDを取得
  const selectedChatId = params?.id as string | undefined;

  // サーバーから渡されたデータを変換
  const conversations = useMemo(() => {
    if (!initialConversations?.conversations || !initialAgents?.agents) {
      return [];
    }

    // AI Agentの情報をマッピング
    const agentsMap = new Map();
    initialAgents.agents.forEach((agent: any) => {
      agentsMap.set(agent.id, agent);
    });

    return initialConversations.conversations.map((conv: any) => {
      const agent = agentsMap.get(conv.ai_agent_id);
      return {
        id: conv.id,
        type: "direct" as const,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        lastMessage: conv.last_message
          ? {
              content: conv.last_message.content,
              created_at: conv.last_message.created_at,
              sender_type: conv.last_message.sender_type,
              sender_name:
                conv.last_message.sender_type === "user"
                  ? "あなた"
                  : agent?.name,
            }
          : null,
        otherParticipant: {
          id: conv.ai_agent_id,
          name: agent?.name || "Unknown AI",
          avatar_url: agent?.avatar_url,
          type: "ai" as const,
          status: "online" as const,
          personality_preset: agent?.persona_type,
        },
      };
    });
  }, [initialConversations, initialAgents]);

  const handleChatSelect = (conversation: ConversationData) => {
    // URLベースのナビゲーション（状態管理なし）
    if (conversation.type === "group" && conversation.groupInfo) {
      // グループチャットの場合
      router.push(`/dashboard/chats/${conversation.id}`);
    } else if (conversation.otherParticipant) {
      // 1対1チャットの場合
      const chatId =
        conversation.otherParticipant.type === "ai"
          ? conversation.otherParticipant.id || conversation.id // AI Agent IDを使用
          : conversation.otherParticipant.name;

      router.push(`/dashboard/chats/${chatId}`);
    }
  };

  const filteredConversations = conversations.filter(
    (conv: ConversationData) => {
      // 検索フィルター
      const matchesSearch =
        conv.type === "group"
          ? conv.groupInfo?.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : conv.otherParticipant?.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase());

      // タイプフィルター
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "users" &&
          conv.type === "direct" &&
          conv.otherParticipant?.type === "human") ||
        (activeFilter === "ai" &&
          conv.type === "direct" &&
          conv.otherParticipant?.type === "ai") ||
        (activeFilter === "groups" && conv.type === "group");

      return matchesSearch && matchesFilter;
    }
  );

  const filters = [
    { id: "all" as const, label: "All", count: conversations.length },
    {
      id: "users" as const,
      label: "User",
      count: conversations.filter(
        (c: ConversationData) =>
          c.type === "direct" && c.otherParticipant?.type === "human"
      ).length,
    },
    {
      id: "ai" as const,
      label: "Agent",
      count: conversations.filter(
        (c: ConversationData) =>
          c.type === "direct" && c.otherParticipant?.type === "ai"
      ).length,
    },
    {
      id: "groups" as const,
      label: "Group",
      count: conversations.filter((c: ConversationData) => c.type === "group")
        .length,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white transition-colors duration-200 lg:border-r-0 dark:bg-gray-900">
      <div className="p-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700 lg:hidden">
        <SearchInput placeholder="検索" onSearch={setSearchQuery} />
      </div>

      {/* デスクトップ用検索バー */}
      <div className="hidden p-4 bg-white border-b border-gray-200 lg:block dark:bg-gray-900 dark:border-gray-700">
        <SearchInput placeholder="検索" onSearch={setSearchQuery} />
      </div>

      {/* フィルタータブ */}
      <div className="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "flex flex-1 justify-center items-center px-3 py-3 transition-all duration-200",
                  isActive
                    ? "text-green-500 bg-green-50 border-b-2 border-green-500 dark:text-green-400 dark:bg-green-900/20 dark:border-green-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <span className="text-sm font-medium">
                  {filter.label} ({filter.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {filteredConversations.length === 0 ? (
          activeFilter === "users" || activeFilter === "groups" ? (
            <EmptyState
              icon={MessageCircle}
              title="近日追加予定"
              description={
                activeFilter === "users"
                  ? "ユーザーとのチャット機能は現在開発中です"
                  : "グループチャット機能は現在開発中です"
              }
            />
          ) : (
            <EmptyState
              icon={MessageCircle}
              title={
                searchQuery ? "検索結果がありません" : "トークがありません"
              }
              description={
                searchQuery
                  ? "検索条件を変更してください"
                  : "友だちを追加してトークを始めましょう"
              }
            />
          )
        ) : (
          <div className="pb-4 divide-y divide-gray-100 dark:divide-gray-800 lg:pb-0">
            {filteredConversations.map((conversation: ConversationData) => {
              // 選択状態の判定（URLベース）
              const isSelected =
                conversation.type === "group"
                  ? selectedChatId === conversation.id
                  : selectedChatId === conversation.otherParticipant?.id ||
                    selectedChatId === conversation.id;

              return (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  onSelect={() => handleChatSelect(conversation)}
                  isSelected={isSelected}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: ConversationData;
  onSelect: () => void;
  isSelected: boolean;
}

function ConversationItem({
  conversation,
  onSelect,
  isSelected,
}: ConversationItemProps) {
  const isGroup = conversation.type === "group";
  const displayName = isGroup
    ? conversation.groupInfo?.name || "グループ"
    : conversation.otherParticipant?.name || "Unknown";
  const avatarUrl = isGroup
    ? conversation.groupInfo?.avatar_url
    : conversation.otherParticipant?.avatar_url;
  const type = isGroup ? "group" : conversation.otherParticipant?.type || "ai";
  const status = isGroup ? "online" : conversation.otherParticipant?.status;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "p-3 w-full text-left transition-all lg:border-b lg:border-gray-100 dark:lg:border-gray-800 last:border-b-0",
        isSelected
          ? "bg-green-50 border-l-2 border-green-500 dark:bg-green-900/20 dark:border-green-400"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
      )}
    >
      <div className="flex items-center space-x-3">
        {/* アバター */}
        <div className="relative flex-shrink-0">
          <Avatar
            src={avatarUrl}
            alt={displayName}
            name={displayName}
            type={type === "group" ? "human" : type}
            status={status}
            showStatus={!isGroup}
            size="md"
          />
          {isGroup && conversation.groupInfo?.member_count && (
            <div className="flex absolute -right-1 -bottom-1 justify-center items-center w-5 h-5 text-xs font-medium text-white bg-green-500 rounded-full border-2 border-white dark:border-gray-900">
              {conversation.groupInfo.member_count}
            </div>
          )}
        </div>

        {/* メッセージプレビュー */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0.5">
            <h3 className="text-sm font-semibold text-gray-900 truncate dark:text-white">
              {displayName}
            </h3>
            {conversation.lastMessage && (
              <span className="ml-2 text-xs text-gray-500 whitespace-nowrap dark:text-gray-400">
                {formatTime(conversation.lastMessage.created_at)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 truncate dark:text-gray-400">
            {conversation.lastMessage ? (
              <>
                {conversation.lastMessage.sender_name && (
                  <span className="font-medium">
                    {conversation.lastMessage.sender_name}:{" "}
                  </span>
                )}
                {conversation.lastMessage.content}
              </>
            ) : (
              <span className="italic">まだメッセージがありません</span>
            )}
          </p>
        </div>
      </div>
    </button>
  );
}
