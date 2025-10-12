"use client";

import {
  MessageCircle,
  Search,
  Phone,
  Video,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { GroupChatWindow } from "@/components/groups/GroupChatWindow";
import { AddFriendsRightPanel } from "@/components/friends/AddFriendsPanel";
import { FriendDetailPanel } from "@/components/friends/FriendDetailPanel";
import { ProfileSettingsPanel } from "@/components/settings/ProfileSettingsPanel";
import { Avatar } from "@/components/ui/Avatar";
import { AppNavigation } from "./AppNavigation";
import { cn } from "@/lib/utils/cn";

interface DesktopLayoutProps {
  children: React.ReactNode;
}

/**
 * デスクトップレイアウト - モダンな3カラムデザイン
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

  // サイドバーの幅を管理（ローカルストレージから初期値を取得）
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarWidth");
      return saved ? parseInt(saved, 10) : 384;
    }
    return 384; // デフォルト値: 96 * 4 = 384px (w-96)
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // リサイズ開始
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  // リサイズ中
  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth = e.clientX - 80; // 80px は AppNavigation の幅
        // 最小幅280px、最大幅600px
        if (newWidth >= 280 && newWidth <= 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  // リサイズ終了
  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  // マウスイベントの登録・解除
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResizing);
    } else {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResizing);
    }

    return () => {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // サイドバーの幅をローカルストレージに保存（リサイズ終了時）
  useEffect(() => {
    if (!isResizing && typeof window !== "undefined") {
      localStorage.setItem("sidebarWidth", sidebarWidth.toString());
    }
  }, [sidebarWidth, isResizing]);

  return (
    <div
      className={cn(
        "flex h-screen bg-gray-50 dark:bg-gray-900",
        isResizing && "select-none cursor-col-resize"
      )}
    >
      {/* 左側：アプリナビゲーション */}
      <AppNavigation />

      {/* 中央：サイドバー（チャットリスト、友だちリストなど） */}
      <div
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px` }}
        className="flex relative flex-col flex-shrink-0 bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-700"
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-4 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 dark:text-white">
                {activeTab === "chats"
                  ? "トーク"
                  : activeTab === "friends"
                  ? "友だち"
                  : activeTab === "add-friends"
                  ? "友だちを追加"
                  : activeTab === "settings"
                  ? "設定"
                  : "BridgeSpeak"}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {profile.display_name}
              </span>
            </div>
          </div>
          <Search className="w-5 h-5 text-gray-600 transition-colors cursor-pointer dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400" />
        </div>

        {/* コンテンツエリア */}
        <div className="overflow-hidden flex-1">{children}</div>

        {/* リサイズハンドル */}
        <div
          onMouseDown={startResizing}
          className={cn(
            "absolute top-0 right-0 w-1 h-full cursor-col-resize transition-all duration-200 z-50",
            isResizing
              ? "bg-green-500 w-1"
              : "bg-gray-300 dark:bg-gray-600 opacity-0 hover:opacity-100 hover:w-1.5"
          )}
        >
          {/* ドラッグ可能エリアを拡大（UX向上） */}
          <div className="absolute inset-y-0 -right-2 -left-2 w-5" />
        </div>
      </div>

      {/* 右メインエリア */}
      <div className="flex overflow-hidden flex-col flex-1 min-w-0">
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

            <div className="flex overflow-hidden flex-col flex-1 min-w-0">
              {selectedChat.type === "group" && selectedGroup ? (
                <GroupChatWindow selectedGroup={selectedGroup} />
              ) : (
                <ChatWindow selectedChat={selectedChat} />
              )}
            </div>
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
                  // activeTabに基づいてアイコンを決定
                  const Icon =
                    activeTab === "chats"
                      ? MessageCircle
                      : activeTab === "friends"
                      ? Users
                      : activeTab === "settings"
                      ? MoreHorizontal
                      : MessageCircle;
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
                      onClick={() => setActiveTab("add-friends")}
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
