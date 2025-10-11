"use client";

import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  MessageCircle,
  Users,
  UserPlus,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { GroupChatWindow } from "@/components/groups/GroupChatWindow";
import { FriendDetailPanel } from "@/components/friends/FriendDetailPanel";
import { ProfileSettingsPanel } from "@/components/settings/ProfileSettingsPanel";
import { cn } from "@/lib/utils/cn";

interface MobileLayoutProps {
  children: React.ReactNode;
}

/**
 * モバイル向けレイアウト - クリーンで高性能なUI
 */
export function MobileLayout({ children }: MobileLayoutProps) {
  const {
    activeTab,
    setActiveTab,
    profile,
    selectedChat,
    setSelectedChat,
    selectedGroup,
    setSelectedGroup,
    selectedFriend,
    setSelectedFriend,
    showProfileSettings,
    setShowProfileSettings,
  } = useDashboard();

  const tabs = [
    { id: "chats" as const, icon: MessageCircle, label: "トーク" },
    { id: "friends" as const, icon: Users, label: "友だち" },
    { id: "add-friends" as const, icon: UserPlus, label: "追加" },
    { id: "settings" as const, icon: Settings, label: "設定" },
  ];

  const showChatWindow = selectedChat && activeTab === "chats";
  const showFriendDetail = selectedFriend && activeTab === "friends";
  const showProfileDetail = showProfileSettings && activeTab === "settings";

  if (showChatWindow) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200">
        {/* チャットヘッダー */}
        <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shadow-sm flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setSelectedChat(null);
                if (selectedGroup) setSelectedGroup(null);
              }}
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                {selectedChat.avatar_url ? (
                  <img
                    src={selectedChat.avatar_url}
                    alt={selectedChat.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium text-xs">
                    {selectedChat.name.charAt(0)}
                  </span>
                )}
              </div>
              {selectedChat.type === "ai" && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
              {selectedChat.type === "human" &&
                selectedChat.status === "online" && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              {selectedChat.type === "group" && selectedChat.member_count && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="text-xs text-white font-medium">
                    {selectedChat.member_count}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {selectedChat.name}
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {selectedChat.type === "ai"
                  ? "AIエージェント"
                  : selectedChat.type === "group"
                  ? `${selectedChat.member_count}人のメンバー`
                  : selectedChat.status === "online"
                  ? "オンライン"
                  : "オフライン"}
              </p>
            </div>
          </div>
        </div>

        {/* チャットコンテンツ - ヘッダーを除いた残りの高さを使用 */}
        <div className="flex-1 min-h-0">
          {selectedChat.type === "group" && selectedGroup ? (
            <GroupChatWindow selectedGroup={selectedGroup} />
          ) : (
            <ChatWindow selectedChat={selectedChat} />
          )}
        </div>
      </div>
    );
  }

  if (showFriendDetail) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200">
        <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shadow-sm flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedFriend(null)}
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                {selectedFriend.avatar_url ? (
                  <img
                    src={selectedFriend.avatar_url}
                    alt={selectedFriend.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium text-xs">
                    {selectedFriend.name.charAt(0)}
                  </span>
                )}
              </div>
              {selectedFriend.type === "ai" && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
              {selectedFriend.type === "human" &&
                selectedFriend.status === "online" && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {selectedFriend.name}
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {selectedFriend.type === "ai" ? "AIエージェント" : "ユーザー"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <FriendDetailPanel friend={selectedFriend} />
        </div>
      </div>
    );
  }

  if (showProfileDetail) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200">
        <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shadow-sm flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowProfileSettings(false)}
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-green-500 font-medium text-sm">
                  {profile.display_name.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                プロフィール設定
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                アカウント情報を管理
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ProfileSettingsPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200">
      {/* ヘッダー */}
      <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shadow-sm flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center ring-2 ring-green-500/30 dark:ring-green-400/30">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-white font-semibold text-sm">
                {profile.display_name.charAt(0)}
              </span>
            )}
          </div>
          <span className="text-gray-900 dark:text-white font-semibold">
            {profile.display_name}
          </span>
        </div>
      </div>

      {/* メインコンテンツエリア - ヘッダーとボトムナビの間の空間を使用 */}
      <div
        className="flex-1 min-h-0 mb-20"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {children}
      </div>

      {/* ボトムナビゲーション - 固定位置 */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-around w-full px-4 py-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 transform",
                  isActive
                    ? "text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-500/10 scale-105"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:scale-105"
                )}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
