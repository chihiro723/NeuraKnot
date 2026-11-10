"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Users } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { getPersonalityLabel } from "@/lib/constants/personalities";
import { cn } from "@/lib/utils/cn";
import type { FriendData, FriendFilter } from "@/lib/types";

interface RosterListClientProps {
  initialAgents: {
    agents: Array<{
      id: string;
      name: string;
      avatar_url?: string;
      persona_type?: string;
      description?: string;
      message_count?: number;
      last_chat_at?: string;
      created_at: string;
    }>;
  } | null;
  initialGroupChats?: {
    group_chats: Array<{
      id: string;
      name: string;
      description?: string;
      icon_url?: string;
      message_count?: number;
      last_message_at?: string;
      last_message?: {
        content: string;
        sender_name: string;
        sender_type: string;
      };
      created_at: string;
      updated_at: string;
      members?: Array<{
        id: string;
        ai_agent_id: string;
        display_order: number;
      }>;
    }>;
  } | null;
}

/**
 * Roster（名簿）リストクライアントコンポーネント
 * サーバーから渡されたデータを使用
 */
export function RosterListClient({
  initialAgents,
  initialGroupChats,
}: RosterListClientProps) {
  const router = useRouter();
  const params = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FriendFilter>("all");

  // URLパラメータから現在選択されている友だちIDを取得
  const selectedFriendId = params?.id as string | undefined;

  // サーバーから渡されたデータを変換
  const friends = useMemo(() => {
    const friendsList: FriendData[] = [];

    // AIエージェントを追加
    if (initialAgents?.agents) {
      initialAgents.agents.forEach((agent) => {
        friendsList.push({
          id: agent.id,
          type: "ai" as const,
          name: agent.name,
          avatar_url: agent.avatar_url,
          status: "online" as const,
          personality_preset: agent.persona_type,
          description: agent.description,
          last_message:
            agent.message_count && agent.message_count > 0
              ? `メッセージ数: ${agent.message_count}`
              : "まだメッセージがありません",
          last_message_at: agent.last_chat_at || agent.created_at,
          unread_count: 0,
        });
      });
    }

    // グループチャットを追加
    if (initialGroupChats?.group_chats) {
      initialGroupChats.group_chats.forEach((group) => {
        const memberCount = group.members?.length || 0;

        // 最後のメッセージを整形
        let lastMessage = "まだメッセージがありません";
        if (group.last_message) {
          let senderPrefix = "";
          if (group.last_message.sender_type === "ai") {
            // AIエージェントの場合、名前がない場合は「削除されたエージェント」と表示
            const senderName =
              group.last_message.sender_name || "削除されたエージェント";
            senderPrefix = `${senderName}: `;
          }
          // ユーザーの場合は名前を表示しない
          lastMessage = `${senderPrefix}${group.last_message.content}`;
        }

        friendsList.push({
          id: group.id,
          type: "group" as const,
          name: group.name,
          avatar_url: group.icon_url,
          status: "online" as const,
          personality_preset: undefined,
          description: group.description || "",
          last_message: lastMessage,
          last_message_at:
            group.last_message_at || group.updated_at || group.created_at,
          unread_count: 0,
          // グループ固有の情報を保持
          member_count: memberCount,
        });
      });
    }

    return friendsList;
  }, [initialAgents, initialGroupChats]);

  const handleSelectFriend = (friend: FriendData) => {
    // URLベースのナビゲーション（状態管理なし）
    router.push(`/dashboard/roster/${friend.id}`);
  };

  const filteredFriends = friends.filter((friend: FriendData) => {
    const matchesSearch = friend.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "group" && friend.type === "group") ||
      friend.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const filters = [
    { id: "all" as const, label: "All", count: friends.length },
    {
      id: "human" as const,
      label: "User",
      count: friends.filter((f: FriendData) => f.type === "human").length,
    },
    {
      id: "ai" as const,
      label: "Agent",
      count: friends.filter((f: FriendData) => f.type === "ai").length,
    },
    {
      id: "group" as const,
      label: "Group",
      count: friends.filter((f: FriendData) => f.type === "group").length,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white transition-colors duration-200 lg:border-r-0 dark:bg-gray-900">
      {/* モバイル用検索バー */}
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

      {/* 友だちリスト */}
      <div className="overflow-y-auto flex-1">
        {filteredFriends.length === 0 ? (
          activeFilter === "human" ? (
            <EmptyState
              icon={Users}
              title="近日追加予定"
              description="ユーザー機能は現在開発中です"
            />
          ) : activeFilter === "group" ? (
            <EmptyState
              icon={Users}
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
              icon={Users}
              title={
                searchQuery ? "検索結果がありません" : "エージェントがいません"
              }
              description={
                searchQuery
                  ? "検索条件を変更してください"
                  : "AIエージェントを作成してください"
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
            {filteredFriends.map((friend: FriendData) => {
              // 選択状態の判定（URLベース）
              const isSelected = selectedFriendId === friend.id;

              return (
                <FriendItem
                  key={friend.id}
                  friend={friend}
                  onSelect={() => handleSelectFriend(friend)}
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

interface FriendItemProps {
  friend: FriendData;
  onSelect: () => void;
  isSelected: boolean;
}

function FriendItem({ friend, onSelect, isSelected }: FriendItemProps) {
  // 時間のフォーマット
  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "たった今";
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  return (
    <button
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`${friend.name}の詳細を表示${
        friend.description ? `。${friend.description}` : ""
      }`}
      aria-current={isSelected ? "true" : "false"}
      className={cn(
        "relative p-3 w-full text-left transition-all lg:border-b lg:border-gray-100 dark:lg:border-gray-800 last:border-b-0 focus:outline-none",
        isSelected
          ? "bg-green-50 border-l-2 border-green-500 dark:bg-green-900/20 dark:border-green-400"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
      )}
    >
      {/* メッセージ数（右上） */}
      {friend.type === "ai" &&
        friend.last_message &&
        friend.last_message.includes("メッセージ数:") && (
          <span className="absolute top-2 right-2 text-xs font-medium text-green-600 dark:text-green-400">
            {friend.last_message.replace("メッセージ数: ", "")}件
          </span>
        )}
      {friend.type === "group" &&
        friend.last_message &&
        friend.last_message.includes("メッセージ数:") && (
          <span className="absolute top-2 right-2 text-xs font-medium text-green-600 dark:text-green-400">
            {friend.last_message.replace("メッセージ数: ", "")}件
          </span>
        )}

      <div className="flex items-center space-x-3">
        {/* アバター */}
        <div className="relative flex-shrink-0">
          <Avatar
            src={friend.avatar_url}
            alt={friend.name}
            name={friend.name}
            type={friend.type === "group" ? "human" : friend.type}
            size="list"
          />
        </div>

        {/* 友だち情報 */}
        <div className="flex-1 pr-16 min-w-0">
          <div className="flex items-baseline gap-3 mb-0.5">
            <h3 className="text-sm font-semibold text-gray-900 truncate dark:text-white">
              {friend.name}
              {friend.type === "group" && friend.member_count !== undefined && (
                <span className="ml-1 font-normal text-gray-900 dark:text-white">
                  ({friend.member_count + 1})
                </span>
              )}
            </h3>
            {friend.type === "ai" && friend.personality_preset && (
              <span className="flex-shrink-0 text-xs text-green-600 dark:text-green-400">
                {getPersonalityLabel(friend.personality_preset)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 truncate dark:text-gray-400">
            {friend.description || "説明がありません"}
          </p>
        </div>
      </div>
    </button>
  );
}
