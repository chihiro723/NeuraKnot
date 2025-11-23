"use client";

import { MessageCircle, Users, ArrowLeft, Clock, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/lib/hooks/useResponsive";
import { GroupChatSettingsModal } from "./GroupChatSettingsModal";

import type { GroupChat } from "@/lib/api/group-chat";

interface GroupChatDetailPanelProps {
  groupChat: GroupChat;
}

/**
 * グループチャット詳細パネル - エージェント詳細と同じデザイン
 */
export function GroupChatDetailPanel({ groupChat }: GroupChatDetailPanelProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsKey, setSettingsKey] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleBack = () => {
    router.push("/dashboard/roster");
  };

  const handleStartChat = () => {
    router.push(`/dashboard/chats/${groupChat.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      {/* ヘッダー（モバイルで常時上部固定） */}
      <div className="flex sticky top-0 z-20 justify-between items-center px-4 h-14 bg-white/95 border-b border-gray-200 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:h-16 sm:px-6 dark:bg-gray-900/95 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {groupChat.name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              グループチャット • {(groupChat.members?.length || 0) + 1}
              人のメンバー
            </p>
          </div>
        </div>
        {/* 戻るボタン（モバイルのみ、右側に配置） */}
        {isMobile && (
          <button
            onClick={handleBack}
            className="flex justify-center items-center p-2 text-gray-600 rounded-lg transition-all duration-200 bg-gray-50/80 dark:text-gray-300 dark:bg-gray-800/50 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700"
            title="戻る"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* メインコンテンツ */}
      <div className="overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="p-4 mx-auto space-y-6 max-w-3xl sm:p-6">
          {/* プロフィールカード */}
          <div className="overflow-hidden relative bg-white rounded-2xl border shadow-lg border-gray-200/50 dark:bg-gray-800 dark:border-gray-700/50">
            <div className="p-6 space-y-6 sm:p-8">
              {/* アバターとメイン情報 */}
              <div className="flex flex-col items-center space-y-4 sm:flex-row sm:items-start sm:space-x-6 sm:space-y-0">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full opacity-30 blur-xl transition-opacity group-hover:opacity-50" />
                  <div className="flex overflow-hidden relative justify-center items-center w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full border-4 border-white shadow-lg dark:from-gray-800 dark:to-gray-700 dark:border-gray-900">
                    {groupChat.icon_url ? (
                      <img
                        src={groupChat.icon_url}
                        alt={groupChat.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <Users className="w-12 h-12 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {groupChat.name}
                  </h1>
                  <div className="inline-flex items-center px-3 py-1 space-x-2 text-sm font-medium text-green-700 bg-green-100 rounded-full dark:text-green-300 dark:bg-green-900/30">
                    <Users className="w-4 h-4" />
                    <span>{groupChat.members.length + 1}人のメンバー</span>
                  </div>
                </div>
              </div>

              {/* 説明 */}
              {groupChat.description && (
                <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300">
                  {groupChat.description}
                </p>
              )}

              {/* アクションボタン */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleStartChat}
                  className="flex justify-center items-center flex-1 px-6 py-3 space-x-2 font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl transition-all shadow-lg min-w-fit hover:from-green-700 hover:to-emerald-700 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-0.5"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>トークを開始</span>
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex justify-center items-center px-6 py-3 space-x-2 font-medium text-gray-700 bg-white rounded-xl border border-gray-200 transition-all hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <Settings className="w-5 h-5" />
                  <span>設定</span>
                </button>
              </div>
            </div>
          </div>

          {/* グループ情報カード */}
          <div className="p-6 space-y-4 bg-white rounded-2xl border shadow-lg border-gray-200/50 dark:bg-gray-800 dark:border-gray-700/50">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                グループ情報
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl dark:bg-gray-900/50">
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  作成日
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {isClient ? formatDate(groupChat.created_at) : ""}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl dark:bg-gray-900/50">
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  メンバー数
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {(groupChat.members?.length || 0) + 1}人
                </p>
              </div>
            </div>
          </div>

          {/* メンバーリストカード */}
          <div className="p-6 space-y-4 bg-white rounded-2xl border shadow-lg border-gray-200/50 dark:bg-gray-800 dark:border-gray-700/50">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                メンバー
              </h3>
            </div>

            <div className="space-y-3">
              {groupChat.members?.map((member) => (
                <button
                  key={member.id}
                  onClick={() =>
                    router.push(`/dashboard/roster/${member.ai_agent_id}`)
                  }
                  className="flex items-center p-3 space-x-3 w-full text-left bg-gray-50 rounded-xl transition-colors hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-900 cursor-pointer"
                >
                  <div className="flex overflow-hidden justify-center items-center w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full dark:from-gray-800 dark:to-gray-700">
                    {member.ai_agent_icon ? (
                      <img
                        src={member.ai_agent_icon}
                        alt={member.ai_agent_name || "Agent"}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {member.ai_agent_name?.charAt(0) || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate dark:text-white">
                      {member.ai_agent_name || "Unknown Agent"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {member.ai_agent_model || "Unknown Model"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 設定モーダル */}
      {showSettings && (
        <GroupChatSettingsModal
          key={settingsKey}
          groupChat={groupChat}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onSave={() => {
            setSettingsKey((prev) => prev + 1);
            setShowSettings(false);
          }}
        />
      )}
    </>
  );
}
