"use client";

import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullScreenLoading } from "@/components/ui/LoadingSpinner";
import { getPersonalityLabel } from "@/lib/constants/personalities";
import { cn } from "@/lib/utils/cn";
import type { FriendData, FriendFilter } from "@/lib/types";
import { listAIAgents } from "@/lib/actions/ai-agent-actions";
import { useServerActionWithAuth } from "@/lib/hooks/useServerActionWithAuth";

/**
 * 友だちリストクライアントコンポーネント
 */
export function FriendsListClient() {
  const { user, setSelectedFriend } = useDashboard();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FriendFilter>("all");

  // 401エラー時に自動リフレッシュ
  const listAIAgentsWithAuth = useServerActionWithAuth(listAIAgents);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        // Server Actionを呼び出す（401エラー時に自動リフレッシュ）
        const result = await listAIAgentsWithAuth();

        if (result.success && result.data) {
          const agents = result.data.agents || [];

          // AI AgentsをFriendData形式に変換
          const friendsData: FriendData[] = agents.map((agent: any) => ({
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
          }));

          setFriends(friendsData);
        } else {
          console.error("AI Agentsの取得に失敗しました:", result.error);
        }
      } catch (error) {
        console.error("友だちリストの読み込みでエラーが発生しました:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFriends();
  }, [user.id]);

  const handleSelectFriend = (friend: FriendData) => {
    setSelectedFriend({
      id: friend.id,
      name: friend.name,
      avatar_url: friend.avatar_url,
      type: friend.type,
      status: friend.status,
      personality_preset: friend.personality_preset,
      created_at: new Date().toISOString(),
      description:
        friend.type === "ai"
          ? `${getPersonalityLabel(
              friend.personality_preset || ""
            )}タイプのAIエージェントです。`
          : "ユーザーの友だちです。",
    });
  };

  const filteredFriends = friends.filter((friend) => {
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
    { id: "all" as const, label: "all", count: friends.length },
    {
      id: "human" as const,
      label: "user",
      count: friends.filter((f) => f.type === "human").length,
    },
    {
      id: "ai" as const,
      label: "agent",
      count: friends.filter((f) => f.type === "ai").length,
    },
    {
      id: "group" as const,
      label: "group",
      count: friends.filter((f) => f.type === "group").length,
    },
  ];

  if (isLoading) {
    return <FullScreenLoading />;
  }

  return (
    <div className="flex flex-col h-full bg-white transition-colors duration-200 lg:border-r-0 dark:bg-gray-900">
      <div className="p-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700 lg:hidden">
        <SearchInput placeholder="友だちを検索" onSearch={setSearchQuery} />
      </div>

      {/* デスクトップ用検索バー */}
      <div className="hidden p-4 bg-white border-b border-gray-200 lg:block dark:bg-gray-900 dark:border-gray-700">
        <SearchInput placeholder="友だちを検索" onSearch={setSearchQuery} />
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
        {filteredFriends.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              searchQuery
                ? "検索結果がありません"
                : activeFilter === "ai"
                ? "AIエージェントがいません"
                : activeFilter === "human"
                ? "ユーザーの友だちがいません"
                : activeFilter === "group"
                ? "グループがありません"
                : "友だちがいません"
            }
            description={
              searchQuery
                ? "検索条件を変更してください"
                : "友だちを追加してトークを始めましょう"
            }
          />
        ) : (
          <div className="pb-4 space-y-2 lg:pb-0">
            {filteredFriends.map((friend) => (
              <FriendItem
                key={friend.id}
                friend={friend}
                getPersonalityLabel={getPersonalityLabel}
                onSelectFriend={handleSelectFriend}
                isAI={friend.type === "ai"}
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
  getPersonalityLabel: (preset: string) => string;
  onSelectFriend: (friend: FriendData) => void;
  isAI: boolean;
}

function FriendItem({
  friend,
  getPersonalityLabel,
  onSelectFriend,
  isAI,
}: FriendItemProps) {
  const { selectedFriend } = useDashboard();
  const isSelected = selectedFriend?.id === friend.id;

  return (
    <button
      onClick={() => onSelectFriend(friend)}
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
            {friend.avatar_url ? (
              <img
                src={friend.avatar_url}
                alt={friend.name}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="font-medium text-white">
                {friend.name.charAt(0)}
              </span>
            )}
          </div>

          {/* AI Agent indicator */}
          {isAI && (
            <div className="flex absolute -right-1 -bottom-1 justify-center items-center w-4 h-4 bg-green-500 rounded-full">
              <span className="text-xs lg:text-[10px]">🤖</span>
            </div>
          )}

          {/* Human online status */}
          {!isAI && friend.status === "online" && (
            <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate dark:text-white lg:text-sm">
            {friend.name}
          </h3>
          <p className="text-sm text-gray-600 truncate dark:text-gray-400 lg:text-xs">
            {isAI && friend.personality_preset
              ? `${getPersonalityLabel(friend.personality_preset)} • オンライン`
              : friend.status === "online"
              ? "オンライン"
              : "オフライン"}
          </p>
        </div>
      </div>
    </button>
  );
}
