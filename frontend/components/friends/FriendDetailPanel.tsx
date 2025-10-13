"use client";

import {
  MessageCircle,
  Phone,
  Video,
  Settings,
  Calendar,
  Bot,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
// useDashboard は不要（URLベースのナビゲーション）
import type { SelectedFriend } from "@/lib/types";

interface FriendDetailPanelProps {
  friend: SelectedFriend;
}

/**
 * 友だち詳細パネル
 */
export function FriendDetailPanel({ friend }: FriendDetailPanelProps) {
  const router = useRouter();

  const handleStartChat = () => {
    // グループの場合は会話開始できないようにするか、別の処理を行う
    if (friend.type === "group") return;

    // URLベースのナビゲーション（状態管理なし）
    router.push(`/dashboard/chats/${friend.id}`);
  };

  const getPersonalityInfo = (preset: string) => {
    const personalities = {
      support: {
        name: "サポート",
        icon: Bot,
        description:
          "技術的な質問や問題解決をサポートします。困ったことがあれば何でもお聞かせください。",
      },
      friendly: {
        name: "フレンドリー",
        icon: Bot,
        description:
          "親しみやすく楽しい会話を提供します。日常の出来事や趣味について話しましょう。",
      },
      business: {
        name: "ビジネス",
        icon: Bot,
        description:
          "仕事や業務効率化をサポートします。プロジェクト管理や戦略立案をお手伝いします。",
      },
      casual: {
        name: "カジュアル",
        icon: Bot,
        description:
          "のんびりとリラックスした会話を楽しみます。気軽に何でもお話しください。",
      },
      humor: {
        name: "ユーモア",
        icon: Bot,
        description:
          "笑いと楽しさを提供します。面白い話題で一緒に笑いましょう。",
      },
    };
    return (
      personalities[preset as keyof typeof personalities] ||
      personalities.friendly
    );
  };

  const personalityInfo = friend.personality_preset
    ? getPersonalityInfo(friend.personality_preset)
    : null;
  const PersonalityIcon = personalityInfo?.icon;

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
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            {friend.type === "ai" ? (
              <Bot className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <User className="w-5 h-5 text-green-600 dark:text-green-400" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {friend.name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {friend.type === "ai" ? "エージェント" : "ユーザー"} •{" "}
              {friend.status === "online" ? "オンライン" : "オフライン"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleStartChat}
            className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="トークを開始"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          {friend.type === "human" && (
            <>
              <button className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                <Video className="w-5 h-5" />
              </button>
            </>
          )}
          <button className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="p-8 mx-auto space-y-10 max-w-2xl">
          {/* プロフィール情報 */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                基本情報
              </h2>
            </div>

            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="flex overflow-hidden justify-center items-center w-20 h-20 bg-gray-100 rounded-full dark:bg-gray-800">
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt={friend.name}
                      className="object-cover w-full h-full"
                    />
                  ) : friend.type === "ai" ? (
                    <Bot className="w-10 h-10 text-gray-400" />
                  ) : (
                    <span className="text-2xl font-medium text-gray-400">
                      {friend.name.charAt(0)}
                    </span>
                  )}
                </div>
                {friend.status === "online" && (
                  <div className="absolute -right-1 -bottom-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {friend.name}
                </h1>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {friend.type === "ai" ? (
                      <Bot className="w-4 h-4 text-gray-500" />
                    ) : (
                      <User className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {friend.type === "ai" ? "エージェント" : "ユーザー"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        friend.status === "online"
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    ></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {friend.status === "online" ? "オンライン" : "オフライン"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 説明 */}
            {friend.description && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  説明
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {friend.description}
                </p>
              </div>
            )}

            {/* 友だちになった日 */}
            {friend.created_at && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>友だちになった日: {formatDate(friend.created_at)}</span>
              </div>
            )}
          </div>

          {/* エージェントの場合のパーソナリティ情報 */}
          {friend.type === "ai" && personalityInfo && PersonalityIcon && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  パーソナリティ
                </h2>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex justify-center items-center w-12 h-12 bg-green-100 rounded-lg shadow-lg dark:bg-green-500/20 shadow-green-500/20">
                  <PersonalityIcon className="w-6 h-6 text-green-600 drop-shadow-[0_0_6px_rgba(34,197,94,0.4)] dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                    {personalityInfo.name}
                  </h4>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {personalityInfo.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                アクション
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={handleStartChat}
                className="flex justify-center items-center px-6 py-3 space-x-2 font-medium text-white bg-green-600 rounded-lg transition-all hover:bg-green-700"
              >
                <MessageCircle className="w-5 h-5" />
                <span>トークを開始</span>
              </button>
              {friend.type === "human" && (
                <>
                  <button className="flex justify-center items-center px-6 py-3 space-x-2 font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-all hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                    <Phone className="w-5 h-5" />
                    <span>音声通話</span>
                  </button>
                  <button className="flex justify-center items-center px-6 py-3 space-x-2 font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-all hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                    <Video className="w-5 h-5" />
                    <span>ビデオ通話</span>
                  </button>
                </>
              )}
              <button className="flex justify-center items-center px-6 py-3 space-x-2 font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-all hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                <Settings className="w-5 h-5" />
                <span>設定</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
