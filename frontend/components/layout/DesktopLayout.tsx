"use client";

import {
  MessageCircle,
  Search,
  Phone,
  Video,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { GroupChatWindow } from "@/components/groups/GroupChatWindow";
import { AddFriendsRightPanel } from "@/components/friends/AddFriendsPanel";
import { FriendDetailPanel } from "@/components/friends/FriendDetailPanel";
import { ProfileSettingsPanel } from "@/components/settings/ProfileSettingsPanel";
import { Avatar } from "@/components/ui/Avatar";
import { NAVIGATION_TABS } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";

interface DesktopLayoutProps {
  children: React.ReactNode;
}

/**
 * デスクトップレイアウト - 完璧に統一されたデザインシステム
 */
export function DesktopLayout({ children }: DesktopLayoutProps) {
  const {
    activeTab,
    setActiveTab,
    profile,
    selectedChat,
    selectedGroup,
    selectedAddFriendType,
    selectedFriend,
    showProfileSettings,
  } = useDashboard();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 左サイドバー */}
      <div className="flex flex-col w-96 bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-4 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Avatar
              src={profile.avatar_url}
              alt={profile.display_name}
              name={profile.display_name}
              size="sm"
              className="ring-2 ring-green-500 dark:ring-green-400"
            />
            <span className="font-semibold text-gray-900 dark:text-white">
              {profile.display_name}
            </span>
          </div>
          <Search className="w-5 h-5 text-gray-600 transition-colors cursor-pointer dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400" />
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            {NAVIGATION_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex flex-col flex-1 items-center px-2 py-3 transition-colors",
                    isActive
                      ? "text-green-500 bg-green-50 border-b-2 border-green-500 dark:bg-green-500/10"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  <Icon className="mb-1 w-5 h-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="overflow-hidden flex-1">{children}</div>
      </div>

      {/* 右メインエリア */}
      <div className="flex flex-col flex-1">
        {activeTab === "add-friends" ? (
          <AddFriendsRightPanel selectedType={selectedAddFriendType} />
        ) : activeTab === "friends" && selectedFriend ? (
          <FriendDetailPanel friend={selectedFriend} />
        ) : activeTab === "settings" && showProfileSettings ? (
          <ProfileSettingsPanel />
        ) : selectedChat ? (
          <>
            {/* チャットヘッダー */}
            <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <Avatar
                  src={selectedChat.avatar_url}
                  alt={selectedChat.name}
                  name={selectedChat.name}
                  type={
                    selectedChat.type === "group" ? "human" : selectedChat.type
                  }
                  status={selectedChat.status}
                  showStatus={selectedChat.type !== "group"}
                  size="md"
                />
                <div>
                  <h2 className="font-medium text-gray-900 dark:text-white">
                    {selectedChat.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedChat.type === "ai"
                      ? "AIエージェント • オンライン"
                      : selectedChat.type === "group"
                      ? `${selectedChat.member_count}人のメンバー${
                          selectedChat.description
                            ? ` • ${selectedChat.description}`
                            : ""
                        }`
                      : selectedChat.status === "online"
                      ? "オンライン"
                      : "オフライン"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {selectedChat.type === "group" ? (
                  <button className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Users className="w-5 h-5" />
                  </button>
                ) : (
                  <>
                    <button className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Video className="w-5 h-5" />
                    </button>
                  </>
                )}
                <button className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {selectedChat.type === "group" && selectedGroup ? (
              <GroupChatWindow selectedGroup={selectedGroup} />
            ) : (
              <ChatWindow selectedChat={selectedChat} />
            )}
          </>
        ) : (
          <>
            {/* デフォルト表示 */}
            <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <Avatar
                  src=""
                  alt="Default"
                  name="?"
                  size="md"
                  className="bg-gray-300 dark:bg-gray-600"
                />
                <div>
                  <h2 className="font-medium text-gray-900 dark:text-white">
                    {activeTab === "friends"
                      ? "友だちを選択してください"
                      : activeTab === "settings"
                      ? "設定項目を選択してください"
                      : "チャットを選択してください"}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activeTab === "friends"
                      ? "左側から友だちを選んで詳細を表示"
                      : activeTab === "settings"
                      ? "左側から設定項目を選択"
                      : "左側から会話を選んでトークを開始"}
                  </p>
                </div>
              </div>
            </div>

            {/* メインコンテンツエリア */}
            <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                {(() => {
                  const currentTab = NAVIGATION_TABS.find(
                    (tab) => tab.id === activeTab
                  );
                  const Icon = currentTab?.icon || MessageCircle;
                  return (
                    <div className="flex justify-center items-center mx-auto mb-4 w-24 h-24 bg-gray-100 rounded-full dark:bg-gray-900">
                      <Icon className="w-12 h-12 text-green-500" />
                    </div>
                  );
                })()}
                <h3 className="mb-2 text-xl font-medium text-gray-900 dark:text-white">
                  {activeTab === "friends"
                    ? "友だち管理"
                    : activeTab === "settings"
                    ? "設定"
                    : "ハイブリッドメッセージング"}
                </h3>
                <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
                  {activeTab === "friends" ? (
                    <>
                      友だちやAIエージェントの詳細情報を確認できます。
                      <br />
                      左側から友だちを選択してください。
                    </>
                  ) : activeTab === "settings" ? (
                    <>
                      アプリの設定やプロフィール管理を行えます。
                      <br />
                      左側から設定項目を選択してください。
                    </>
                  ) : (
                    <>
                      人間とAIエージェント、グループとの新しいコミュニケーション体験。
                      <br />
                      左側から友だちやAIエージェント、グループを選んでトークを始めましょう。
                    </>
                  )}
                </p>
                {activeTab === "chats" && (
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setActiveTab("friends")}
                      className={cn(
                        "px-6 py-3 font-semibold rounded-xl transition-colors",
                        "bg-green-500 hover:bg-green-600",
                        "text-white shadow-lg"
                      )}
                    >
                      友だちを見る
                    </button>
                    <button
                      onClick={() => setActiveTab("add")}
                      className="px-6 py-3 font-semibold text-gray-900 bg-white rounded-xl border border-gray-300 transition-colors dark:bg-gray-900 dark:text-white dark:border-gray-700 hover:border-green-400 dark:hover:border-green-400"
                    >
                      友だちを追加
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
