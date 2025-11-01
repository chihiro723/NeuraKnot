"use client";

import { User, Mail, Calendar, Edit, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/hooks/useResponsive";
import { EditProfileModal } from "./EditProfileModal";
import type { Profile } from "@/lib/types";
import type { AuthUser } from "@/lib/types/auth";

interface ProfileSettingsPanelProps {
  profile: Profile;
  user: AuthUser;
}

/**
 * プロフィール設定パネル
 */
export function ProfileSettingsPanel({
  profile,
  user,
}: ProfileSettingsPanelProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [currentProfile, setCurrentProfile] = useState(profile);

  // propsが更新されたら状態も更新
  useEffect(() => {
    setCurrentProfile(profile);
  }, [profile, profile.avatar_url, profile.updated_at]);

  // クライアント側でのみ日付をフォーマット（Hydration mismatch回避）
  useEffect(() => {
    const date = new Date(currentProfile.created_at);
    const formatted = date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setFormattedDate(formatted);
  }, [currentProfile.created_at]);

  const handleBack = () => {
    router.push("/dashboard/settings");
  };

  return (
    <>
      {/* 編集モーダル */}
      <EditProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentDisplayName={currentProfile.display_name}
        currentAvatarUrl={currentProfile.avatar_url}
      />

      {/* ヘッダー */}
      <div className="flex justify-between items-center h-16 px-4 bg-white border-b border-gray-200 transition-colors duration-200 md:h-16 md:px-6 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <User className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              プロフィール設定
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              アカウント情報を管理
            </p>
          </div>
        </div>
        {/* 戻るボタン（モバイルのみ、右側に配置） */}
        {isMobile && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center p-2 text-gray-600 bg-gray-50/80 transition-all duration-200 dark:text-gray-300 dark:bg-gray-800/50 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700 rounded-lg"
            title="戻る"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* メインコンテンツ */}
      <div className="overflow-y-auto flex-1 p-4 bg-gray-50 transition-colors duration-200 md:p-8 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl">
          {/* プロフィール画像とメイン情報 */}
          <div className="pb-6 md:pb-8 mb-6 md:mb-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-8">
              <div className="relative">
                <div className="flex overflow-hidden relative justify-center items-center w-20 h-20 md:w-32 md:h-32 bg-gray-300 rounded-full shadow-lg dark:bg-gray-600">
                  {currentProfile.avatar_url ? (
                    <img
                      src={currentProfile.avatar_url}
                      alt={currentProfile.display_name}
                      className="object-cover w-full h-full"
                      key={currentProfile.avatar_url}
                    />
                  ) : (
                    <span className="text-2xl md:text-5xl font-bold text-white">
                      {currentProfile.display_name.charAt(0)}
                    </span>
                  )}
                </div>
                <div
                  className={`absolute bottom-0 left-0 w-5 h-5 md:w-8 md:h-8 rounded-full border-2 md:border-4 border-white dark:border-gray-900 shadow-lg ${
                    currentProfile.status === "online"
                      ? "bg-green-500 animate-pulse"
                      : "bg-gray-400"
                  }`}
                ></div>
              </div>
              <div className="flex-1 pt-0 md:pt-2 text-center md:text-left w-full">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start mb-2 space-y-2 md:space-y-0">
                  <div className="w-full md:w-auto">
                    <h1 className="mb-1 text-xl md:text-4xl font-bold text-gray-900 dark:text-white break-words">
                      {currentProfile.display_name}
                    </h1>
                    <p className="text-sm md:text-xl font-medium text-gray-600 dark:text-gray-400 break-all">
                      {currentProfile.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-2 md:p-2.5 text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-all hover:scale-105"
                    title="プロフィールを編集"
                  >
                    <Edit className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
                <div className="flex justify-center md:justify-start items-center mt-3 md:mt-4 space-x-2">
                  <div
                    className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${
                      currentProfile.status === "online"
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-400"
                    }`}
                  ></div>
                  <span className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">
                    {currentProfile.status === "online" ? "オンライン" : "オフライン"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* アカウント情報 */}
          <div>
            <h2 className="mb-4 md:mb-6 text-base md:text-lg font-semibold text-gray-900 dark:text-white">
              アカウント情報
            </h2>
            <div className="space-y-4 md:space-y-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center pb-4 md:pb-6 border-b border-gray-200 dark:border-gray-700 space-y-2 md:space-y-0">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <Mail className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-400">
                    メールアドレス
                  </span>
                </div>
                <span className="text-sm md:text-base font-semibold text-gray-900 dark:text-white break-all pl-6 md:pl-0">
                  {user.email}
                </span>
              </div>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center pb-4 md:pb-6 border-b border-gray-200 dark:border-gray-700 space-y-2 md:space-y-0">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-400">
                    ユーザーID
                  </span>
                </div>
                <span className="text-sm md:text-base font-mono font-semibold text-gray-900 dark:text-white break-all pl-6 md:pl-0">
                  {user.id.substring(0, 8)}...
                </span>
              </div>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center pb-4 md:pb-6 space-y-2 md:space-y-0">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-400">
                    登録日
                  </span>
                </div>
                <span className="text-sm md:text-base font-semibold text-gray-900 dark:text-white pl-6 md:pl-0">
                  {formattedDate || "読み込み中..."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
