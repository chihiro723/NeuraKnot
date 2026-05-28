"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { MessageCircle, Pin, PinOff } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { pinChat, unpinChat, type ChatPin } from "@/lib/actions/chat-pin";
import type { ConversationData, ChatFilter, Agent } from "@/lib/types";

interface ChatListClientProps {
  initialConversations: {
    conversations: Array<{
      id: string;
      ai_agent_id: string;
      created_at: string;
      updated_at: string;
      last_message?: {
        content: string;
        created_at: string;
        sender_type: "user" | "ai";
      };
    }>;
  } | null;
  initialAgents: {
    agents: Agent[];
  } | null;
  initialGroupChats?: {
    group_chats: Array<{
      id: string;
      user_id: string;
      name: string;
      description?: string;
      icon_url?: string;
      created_at: string;
      updated_at: string;
      message_count?: number;
      last_message_at?: string;
      last_message?: {
        content: string;
        sender_type: "user" | "ai";
        sender_name?: string;
      };
      members?: Array<{
        id: string;
        ai_agent_id: string;
        display_order: number;
      }>;
    }>;
  } | null;
  initialPins?: {
    pins: ChatPin[];
  } | null;
}

/**
 * チャットリストクライアントコンポーネント（グループ統合版）
 * サーバーから渡されたデータを使用
 */
export function ChatListClient({
  initialConversations,
  initialAgents,
  initialGroupChats,
  initialPins,
}: ChatListClientProps) {
  const router = useRouter();
  const params = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatFilter>("all");
  const [isPending, startTransition] = useTransition();

  // URLパラメータから現在選択されているチャットIDを取得
  const selectedChatId = params?.id as string | undefined;

  // AI Agentのマッピング（パフォーマンス最適化）
  const agentsMap = useMemo(() => {
    if (!initialAgents?.agents) return new Map<string, Agent>();

    const map = new Map<string, Agent>();
    initialAgents.agents.forEach((agent) => {
      map.set(agent.id, agent);
    });
    return map;
  }, [initialAgents?.agents]);

  // ピン情報を chat_type ごとに targetId -> pinnedAt のマップに変換
  // direct の targetId は ai_agent_id、group の targetId は group_chat_id
  const directPinMap = useMemo(() => {
    const map = new Map<string, string>();
    initialPins?.pins
      ?.filter((p) => p.chatType === "direct")
      .forEach((p) => map.set(p.targetId, p.pinnedAt));
    return map;
  }, [initialPins?.pins]);

  const groupPinMap = useMemo(() => {
    const map = new Map<string, string>();
    initialPins?.pins
      ?.filter((p) => p.chatType === "group")
      .forEach((p) => map.set(p.targetId, p.pinnedAt));
    return map;
  }, [initialPins?.pins]);

  // サーバーから渡されたデータを変換し、最後のメッセージ時刻でソート
  const conversations = useMemo(() => {
    const conversationsList: ConversationData[] = [];

    // 1対1の会話を追加
    if (initialConversations?.conversations) {
      initialConversations.conversations.forEach((conv) => {
        const agent = agentsMap.get(conv.ai_agent_id);
        const pinnedAt = directPinMap.get(conv.ai_agent_id);
        conversationsList.push({
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
          isPinned: pinnedAt !== undefined,
          pinnedAt: pinnedAt ?? null,
        });
      });
    }

    // グループチャットを追加
    if (initialGroupChats?.group_chats) {
      initialGroupChats.group_chats.forEach((group) => {
        // メンバーのエージェント情報を取得
        const memberAgents =
          group.members
            ?.map((m) => agentsMap.get(m.ai_agent_id))
            .filter((a): a is Agent => !!a) || [];

        // 最後のメッセージを処理
        let lastMessage = null;
        if (group.last_message) {
          let senderName = group.last_message.sender_name;

          // sender_nameが空の場合は「削除されたエージェント」と表示
          if (group.last_message.sender_type === "ai" && !senderName) {
            senderName = "削除されたエージェント";
          } else if (group.last_message.sender_type === "user") {
            senderName = "あなた";
          }

          lastMessage = {
            content: group.last_message.content,
            created_at: group.last_message_at || group.updated_at,
            sender_type: group.last_message.sender_type,
            sender_name: senderName,
          };
        }

        const pinnedAt = groupPinMap.get(group.id);
        conversationsList.push({
          id: group.id,
          type: "group" as const,
          created_at: group.created_at,
          updated_at: group.updated_at,
          lastMessage,
          groupInfo: {
            name: group.name,
            description: group.description,
            icon_url: group.icon_url,
            memberCount: memberAgents.length,
            members: memberAgents.map((agent) => ({
              id: agent.id,
              name: agent.name,
              avatar_url: agent.avatar_url,
              type: "ai" as const,
            })),
          },
          isPinned: pinnedAt !== undefined,
          pinnedAt: pinnedAt ?? null,
        });
      });
    }

    // 2 段ソート：
    //   1. ピン留めされたものを先頭に。ピン同士は pinnedAt DESC（新しくピンしたものほど上）
    //   2. それ以外は最後のメッセージ時刻の降順
    return conversationsList.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (a.isPinned && b.isPinned) {
        const aPin = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bPin = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return bPin - aPin;
      }

      const aTime = a.lastMessage?.created_at || a.updated_at || a.created_at;
      const bTime = b.lastMessage?.created_at || b.updated_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [
    initialConversations?.conversations,
    initialGroupChats?.group_chats,
    agentsMap,
    directPinMap,
    groupPinMap,
  ]);

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

  // ピンのトグル
  // direct の targetId は ai_agent_id（URL キーと一致）、group の targetId は group_chat_id
  const handleTogglePin = (conversation: ConversationData) => {
    const chatType = conversation.type;
    const targetId =
      chatType === "direct"
        ? conversation.otherParticipant?.id
        : conversation.id;
    if (!targetId) return;

    // 連打対策として useTransition で待機中は無視する
    if (isPending) return;

    startTransition(async () => {
      const result = conversation.isPinned
        ? await unpinChat(chatType, targetId)
        : await pinChat(chatType, targetId);

      if (!result.success) {
        console.error("Failed to toggle pin:", result.error);
        return;
      }

      // サーバー側の pinned_at に揃えるため、サーバーコンポーネントを再取得
      router.refresh();
    });
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
    },
  );

  const filters = [
    { id: "all" as const, label: "All", count: conversations.length },
    {
      id: "users" as const,
      label: "User",
      count: conversations.filter(
        (c: ConversationData) =>
          c.type === "direct" && c.otherParticipant?.type === "human",
      ).length,
    },
    {
      id: "ai" as const,
      label: "Agent",
      count: conversations.filter(
        (c: ConversationData) =>
          c.type === "direct" && c.otherParticipant?.type === "ai",
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
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
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
          activeFilter === "users" ? (
            <EmptyState
              icon={MessageCircle}
              title="近日追加予定"
              description="ユーザーとのチャット機能は現在開発中です"
            />
          ) : activeFilter === "groups" ? (
            <EmptyState
              icon={MessageCircle}
              title="グループがありません"
              description="グループを作成して複数のエジェントと協働しましょう"
              action={
                <button
                  onClick={() => router.push("/dashboard/add/group-chats")}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg transition-colors hover:bg-green-600"
                >
                  グループを作成
                </button>
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
                  : "AIエージェントを追加してトークを始めましょう"
              }
              action={
                !searchQuery ? (
                  <button
                    onClick={() => router.push("/dashboard/add/ai")}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg transition-colors hover:bg-green-600"
                  >
                    エージェントを作成
                  </button>
                ) : undefined
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
                  onTogglePin={() => handleTogglePin(conversation)}
                  isSelected={isSelected}
                  isPinBusy={isPending}
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
  onTogglePin: () => void;
  isSelected: boolean;
  isPinBusy: boolean;
}

function ConversationItem({
  conversation,
  onSelect,
  onTogglePin,
  isSelected,
  isPinBusy,
}: ConversationItemProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isGroup = conversation.type === "group";
  const displayName = isGroup
    ? conversation.groupInfo?.name || "グループ"
    : conversation.otherParticipant?.name || "Unknown";
  const avatarUrl = isGroup
    ? conversation.groupInfo?.icon_url
    : conversation.otherParticipant?.avatar_url;
  const type = isGroup ? "group" : conversation.otherParticipant?.type || "ai";
  const status = isGroup ? "online" : conversation.otherParticipant?.status;
  const isPinned = Boolean(conversation.isPinned);

  // HTML の仕様上 button 内に別の button をネストできないため、
  // 外側を div role="button" にし、内側のピン切り替えを button にして stopPropagation する
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`${displayName}との会話を開く${
        conversation.lastMessage
          ? `。最後のメッセージ: ${conversation.lastMessage.content.substring(
              0,
              50,
            )}`
          : ""
      }`}
      aria-current={isSelected ? "true" : "false"}
      className={cn(
        "relative p-3 w-full text-left transition-all cursor-pointer group lg:border-b lg:border-gray-100 dark:lg:border-gray-800 last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
        isSelected
          ? "bg-green-50 border-l-2 border-green-500 dark:bg-green-900/20 dark:border-green-400"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
      )}
    >
      {/* 時刻表示（右上角） */}
      {conversation.lastMessage && (
        <span
          className="absolute top-3 right-3 text-xs text-gray-500 dark:text-gray-400"
          suppressHydrationWarning
        >
          {isClient ? formatTime(conversation.lastMessage.created_at) : ""}
        </span>
      )}

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
        <div className="flex-1 pr-16 min-w-0">
          <h3 className="flex gap-1 items-center mb-1 text-sm font-semibold text-gray-900 truncate dark:text-white">
            {isPinned && (
              <Pin
                className="flex-shrink-0 w-3 h-3 text-green-500 fill-green-500 dark:text-green-400 dark:fill-green-400"
                aria-label="ピン留め中"
              />
            )}
            <span className="truncate">{displayName}</span>
            {isGroup && conversation.groupInfo?.memberCount !== undefined && (
              <span className="ml-1 font-normal text-gray-900 dark:text-white">
                ({conversation.groupInfo.memberCount + 1})
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-600 truncate dark:text-gray-400">
            {conversation.lastMessage ? (
              conversation.lastMessage.content
            ) : (
              <span className="italic">まだメッセージがありません</span>
            )}
          </p>
        </div>
      </div>

      {/* ピン切替ボタン（右下角）*/}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        disabled={isPinBusy}
        aria-pressed={isPinned}
        aria-label={isPinned ? "ピンを外す" : "ピン留めする"}
        className={cn(
          "absolute bottom-2 right-2 p-1 rounded transition-opacity",
          "text-gray-400 hover:text-green-600 dark:hover:text-green-400",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
          isPinned
            ? "opacity-100 text-green-500 dark:text-green-400"
            : "opacity-0 group-hover:opacity-100 focus:opacity-100",
          isPinBusy && "cursor-not-allowed opacity-50",
        )}
      >
        {isPinned ? (
          <PinOff className="w-4 h-4" />
        ) : (
          <Pin className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
