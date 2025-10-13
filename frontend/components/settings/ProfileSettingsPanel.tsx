import { User, Mail, Calendar, Edit } from "lucide-react";
import { useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { EditProfileModal } from "./EditProfileModal";

/**
 * プロフィール設定パネル
 */
export function ProfileSettingsPanel() {
  const { profile, user } = useDashboard();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      {/* 編集モーダル */}
      <EditProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentDisplayName={profile.display_name}
        currentAvatarUrl={profile.avatar_url}
      />

      {/* ヘッダー */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 transition-colors duration-200 dark:bg-gray-900 dark:border-gray-700">
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
      </div>

      {/* メインコンテンツ */}
      <div className="overflow-y-auto flex-1 p-8 bg-white transition-colors duration-200 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl">
          {/* プロフィール画像とメイン情報 */}
          <div className="pb-8 mb-8 border-b border-gray-200 dark:border-gray-700 animate-fadeIn">
            <div className="flex items-start space-x-8">
              <div className="relative">
                <div className="flex overflow-hidden relative justify-center items-center w-32 h-32 bg-gray-300 rounded-full shadow-lg dark:bg-gray-600">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-5xl font-bold text-white">
                      {profile.display_name.charAt(0)}
                    </span>
                  )}
                </div>
                <div
                  className={`absolute bottom-0 left-0 w-8 h-8 rounded-full border-4 border-white dark:border-gray-900 shadow-lg ${
                    profile.status === "online"
                      ? "bg-green-500 animate-pulse"
                      : "bg-gray-400"
                  }`}
                ></div>
              </div>
              <div className="flex-1 pt-2">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h1 className="mb-1 text-4xl font-bold text-gray-900 dark:text-white">
                      {profile.display_name}
                    </h1>
                    <p className="text-xl font-medium text-gray-600 dark:text-gray-400">
                      {profile.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-2.5 text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-all hover:scale-105"
                    title="プロフィールを編集"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center mt-4 space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      profile.status === "online"
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-400"
                    }`}
                  ></div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {profile.status === "online" ? "オンライン" : "オフライン"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* アカウント情報 */}
          <div className="animate-fadeIn">
            <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
              アカウント情報
            </h2>
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-gray-600 dark:text-gray-400">
                    メールアドレス
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {user.email}
                </span>
              </div>
              <div className="flex justify-between items-center pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-gray-600 dark:text-gray-400">
                    ユーザーID
                  </span>
                </div>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                  {user.id.substring(0, 8)}...
                </span>
              </div>
              <div className="flex justify-between items-center pb-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-gray-600 dark:text-gray-400">
                    登録日
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatDate(profile.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
