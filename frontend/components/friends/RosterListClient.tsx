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
  initialAgents: any;
}

/**
 * Roster（名簿）リストクライアントコンポーネント
 * サーバーから渡されたデータを使用
 */
export function RosterListClient({ initialAgents }: RosterListClientProps) {
  const router = useRouter();
  const params = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FriendFilter>("all");

  // URLパラメータから現在選択されている友だちIDを取得
  const selectedFriendId = params?.id as string | undefined;

  // サーバーから渡されたデータを変換
  const friends = useMemo(() => {
    if (!initialAgents?.agents) {
      return [];
    }

    return initialAgents.agents.map(
      (agent: any): FriendData => ({
        id: agent.id,
        type: "ai" as const,
        name: agent.name,
        avatar_url: agent.avatar_url,
        status: "online" as const,
        personality_preset: agent.persona_type,
        description: agent.description,
        last_message:
          agent.message_count > 0
            ? `メッセージ数: ${agent.message_count}`
            : "まだメッセージがありません",
        last_message_at: agent.last_chat_at || agent.created_at,
        unread_count: 0,
      })
    );
  }, [initialAgents]);

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
          activeFilter === "human" || activeFilter === "group" ? (
            <EmptyState
              icon={Users}
              title="近日追加予定"
              description={
                activeFilter === "human"
                  ? "ユーザー機能は現在開発中です"
                  : "グループ機能は現在開発中です"
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title={searchQuery ? "検索結果がありません" : "友だちがいません"}
              description={
                searchQuery
                  ? "検索条件を変更してください"
                  : "友だちを追加してください"
              }
            />
          )
        ) : (
          <div className="pb-4 divide-y divide-gray-100 dark:divide-gray-800 lg:pb-0">
            {filteredFriends.map((friend: FriendData) => (
              <FriendItem
                key={friend.id}
                friend={friend}
                onSelect={() => handleSelectFriend(friend)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FriendItemProps {
  friend: FriendData;
  onSelect: () => void;
}

function FriendItem({ friend, onSelect }: FriendItemProps) {
  return (
    <button
      onClick={onSelect}
      className="p-3 w-full text-left transition-all lg:border-b lg:border-gray-100 dark:lg:border-gray-800 hover:bg-gray-50 last:border-b-0 dark:hover:bg-gray-800/50"
    >
      <div className="flex items-center space-x-3">
        {/* アバター */}
        <div className="relative flex-shrink-0">
          <Avatar
            src={friend.avatar_url}
            alt={friend.name}
            name={friend.name}
            type={friend.type === "group" ? "human" : friend.type}
            status={friend.status}
            showStatus={friend.type !== "group"}
            size="md"
          />
        </div>

        {/* 友だち情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0.5">
            <h3 className="text-sm font-semibold text-gray-900 truncate dark:text-white">
              {friend.name}
            </h3>
            {friend.type === "ai" && friend.personality_preset && (
              <span className="ml-2 text-xs text-green-600 whitespace-nowrap dark:text-green-400">
                {getPersonalityLabel(friend.personality_preset)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 truncate dark:text-gray-400">
            {friend.description || friend.last_message || "説明がありません"}
          </p>
        </div>
      </div>
    </button>
  );
}
