"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Handshake } from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { SearchInput } from "@/components/ui/SearchInput";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullScreenLoading } from "@/components/ui/LoadingSpinner";
import { formatTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import type { ConversationData, ChatFilter } from "@/lib/types";
import { listConversations } from "@/lib/actions/conversation-actions";
import { listAIAgents } from "@/lib/actions/ai-agent-actions";
import { useServerActionsWithAuth } from "@/lib/hooks/useServerActionWithAuth";

/**
 * チャットリストクライアントコンポーネント（グループ統合版）
 */
export function ChatListClient() {
  const { user, setSelectedChat, selectedChat, setSelectedGroup } =
    useDashboard();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatFilter>("all");

  // Server Actionsをラップ
  const {
    listConversations: listConversationsWithAuth,
    listAIAgents: listAIAgentsWithAuth,
  } = useServerActionsWithAuth({
    listConversations,
    listAIAgents,
  });

  useEffect(() => {
    const loadConversations = async () => {
      try {
        // 会話一覧を取得
        const conversationsResult = await listConversationsWithAuth();

        // AI Agent一覧を取得
        const agentsResult = await listAIAgentsWithAuth();

        if (
          conversationsResult.success &&
          conversationsResult.data &&
          agentsResult.success &&
          agentsResult.data
        ) {
          // AI Agentの情報をマッピング
          const agentsMap = new Map();
          agentsResult.data.agents?.forEach((agent: any) => {
            agentsMap.set(agent.id, agent);
          });

          // 会話データを変換
          const conversationData: ConversationData[] =
            conversationsResult.data.conversations?.map((conv: any) => {
              const agent = agentsMap.get(conv.ai_agent_id);
              return {
                id: conv.id,
                type: "direct",
                lastMessage: conv.last_message
                  ? {
                      content: conv.last_message.content,
                      created_at: conv.last_message.created_at,
                      sender_name:
                        conv.last_message.sender_type === "user"
                          ? "あなた"
                          : agent?.name,
                    }
                  : null,
                otherParticipant: {
                  id: conv.ai_agent_id, // AI Agent IDを追加
                  name: agent?.name || "Unknown AI",
                  avatar_url: agent?.avatar_url,
                  type: "ai",
                  status: "online",
                  personality_preset: agent?.persona_type,
                },
              };
            }) || [];

          setConversations(conversationData);
        }
      } catch (error) {
        console.error("会話の読み込みでエラーが発生しました:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [user.id]);

  const handleChatSelect = (conversation: ConversationData) => {
    if (conversation.type === "group" && conversation.groupInfo) {
      // グループチャットの場合
      setSelectedGroup({
        id: conversation.id,
        name: conversation.groupInfo.name,
        description: conversation.groupInfo.description,
        avatar_url: conversation.groupInfo.avatar_url,
        member_count: conversation.groupInfo.member_count,
        members: [], // TODO: Load real group members from database
      });

      setSelectedChat({
        id: conversation.id,
        name: conversation.groupInfo.name,
        avatar_url: conversation.groupInfo.avatar_url,
        type: "group",
        status: "online",
        member_count: conversation.groupInfo.member_count,
        description: conversation.groupInfo.description,
      });
    } else if (conversation.otherParticipant) {
      // 1対1チャットの場合
      setSelectedChat({
        id:
          conversation.otherParticipant.type === "ai"
            ? conversation.otherParticipant.id || conversation.id // AI Agent IDを使用
            : conversation.otherParticipant.name,
        name: conversation.otherParticipant.name,
        avatar_url: conversation.otherParticipant.avatar_url,
        type: conversation.otherParticipant.type,
        status: conversation.otherParticipant.status,
        personality_preset: conversation.otherParticipant.personality_preset,
      });
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    // 検索フィルター
    const matchesSearch =
      conv.type === "group"
        ? conv.groupInfo?.name.toLowerCase().includes(searchQuery.toLowerCase())
        : conv.otherParticipant?.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

    // タイプフィルター
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "groups" && conv.type === "group") ||
      (activeFilter === "users" &&
        conv.type === "direct" &&
        conv.otherParticipant?.type === "human") ||
      (activeFilter === "ai" &&
        conv.type === "direct" &&
        conv.otherParticipant?.type === "ai");

    return matchesSearch && matchesFilter;
  });

  const filters = [
    {
      id: "all" as const,
      label: "all",
      count: conversations.length,
    },
    {
      id: "users" as const,
      label: "user",
      count: conversations.filter(
        (c) => c.type === "direct" && c.otherParticipant?.type === "human"
      ).length,
    },
    {
      id: "ai" as const,
      label: "agent",
      count: conversations.filter(
        (c) => c.type === "direct" && c.otherParticipant?.type === "ai"
      ).length,
    },
    {
      id: "groups" as const,
      label: "group",
      count: conversations.filter((c) => c.type === "group").length,
    },
  ];

  if (isLoading) {
    return <FullScreenLoading />;
  }

  return (
    <div className="flex flex-col h-full bg-white transition-colors duration-200 lg:border-r-0 dark:bg-gray-900">
      <div className="p-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700 lg:hidden">
        <SearchInput placeholder="トークを検索" onSearch={setSearchQuery} />
      </div>

      {/* デスクトップ用検索バー */}
      <div className="hidden p-4 bg-white border-b border-gray-200 lg:block dark:bg-gray-900 dark:border-gray-700">
        <SearchInput placeholder="トークを検索" onSearch={setSearchQuery} />
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
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                onSelect={() => handleChatSelect(conversation)}
                isSelected={selectedChat?.id === conversation.id}
              />
            ))}
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
    ? conversation.groupInfo?.name
    : conversation.otherParticipant?.name;
  const avatarUrl = isGroup
    ? conversation.groupInfo?.avatar_url
    : conversation.otherParticipant?.avatar_url;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "p-4 w-full text-left transition-all duration-200 lg:border-b lg:border-gray-100 dark:lg:border-gray-800 last:border-b-0",
        isSelected
          ? "bg-green-50 border-r-2 border-green-500 dark:bg-green-900/20 dark:border-green-400"
          : "hover:bg-gray-50 dark:hover:bg-gray-800"
      )}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="flex overflow-hidden justify-center items-center w-12 h-12 bg-gray-300 rounded-full lg:w-10 lg:h-10 dark:bg-gray-600">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="object-cover w-full h-full"
              />
            ) : isGroup ? (
              <Handshake className="w-6 h-6 text-purple-500 lg:w-5 lg:h-5 dark:text-purple-400" />
            ) : (
              <span className="font-medium text-white">
                {displayName?.charAt(0)}
              </span>
            )}
          </div>

          {isGroup ? (
            // グループのメンバー数バッジ
            <div className="flex absolute -right-1 -bottom-1 justify-center items-center w-5 h-5 bg-green-500 rounded-full border-2 border-white lg:w-4 lg:h-4 dark:border-gray-900">
              <span className="text-xs lg:text-[10px] text-white font-medium">
                {conversation.groupInfo?.member_count}
              </span>
            </div>
          ) : (
            <>
              {conversation.otherParticipant?.type === "ai" && (
                <div className="flex absolute -right-1 -bottom-1 justify-center items-center w-4 h-4 bg-green-500 rounded-full">
                  <span className="text-xs lg:text-[10px]">🤖</span>
                </div>
              )}

              {conversation.otherParticipant?.type === "human" &&
                conversation.otherParticipant?.status === "online" && (
                  <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                )}
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-medium text-gray-900 truncate dark:text-white lg:text-sm">
              {displayName}
            </h3>
            {conversation.lastMessage && (
              <span className="text-xs text-gray-500 dark:text-gray-400 lg:text-[11px]">
                {formatTime(conversation.lastMessage.created_at)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 truncate dark:text-gray-400 lg:text-xs">
            {conversation.lastMessage ? (
              isGroup && conversation.lastMessage.sender_name ? (
                <>
                  <span className="text-gray-500 dark:text-gray-500">
                    {conversation.lastMessage.sender_name}:
                  </span>{" "}
                  {conversation.lastMessage.content}
                </>
              ) : (
                conversation.lastMessage.content
              )
            ) : (
              "メッセージがありません"
            )}
          </p>

          {/* グループの場合はメンバー数を表示 */}
          {isGroup && (
            <span className="text-xs text-gray-500 dark:text-gray-400 lg:text-[11px]">
              {conversation.groupInfo?.member_count}人のメンバー
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
