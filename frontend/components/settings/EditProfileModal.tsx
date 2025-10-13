"use client";

import { useState, useEffect } from "react";
import { X, Save, Camera } from "lucide-react";
import { updateProfile } from "@/lib/actions/user";
import { useRouter } from "next/navigation";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDisplayName: string;
  currentAvatarUrl?: string;
}

/**
 * プロフィール編集モーダル
 */
export function EditProfileModal({
  isOpen,
  onClose,
  currentDisplayName,
  currentAvatarUrl,
}: EditProfileModalProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルが開いたときに現在の値をリセット
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentDisplayName);
      setAvatarUrl(currentAvatarUrl || "");
      setError(null);
    }
  }, [isOpen, currentDisplayName, currentAvatarUrl]);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError("表示名を入力してください");
      return;
    }

    if (displayName === currentDisplayName) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await updateProfile(displayName);

      if (result.success) {
        router.refresh();
        onClose();
      } else {
        setError(result.error || "更新に失敗しました");
      }
    } catch (err) {
      setError("更新中にエラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* モーダルコンテナ */}
      <div
        className="flex fixed inset-0 z-50 justify-center items-center p-4 backdrop-blur-md bg-black/60 animate-fadeIn"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg bg-gray-50 rounded-3xl border border-gray-200 shadow-2xl dark:bg-gray-950 animate-slideUp dark:border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="relative px-8 pt-8 pb-6">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-gray-400 rounded-full transition-colors dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                プロフィールを編集
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                表示名とアイコンを変更できます
              </p>
            </div>
          </div>

          {/* コンテンツ */}
          <div className="px-8 pb-8 space-y-8">
            {/* エラーメッセージ */}
            {error && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* アバター */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="flex overflow-hidden relative justify-center items-center w-28 h-28 bg-gray-300 rounded-full ring-4 ring-gray-200 shadow-xl dark:bg-gray-700 dark:ring-gray-800">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-white">
                      {displayName.charAt(0)}
                    </span>
                  )}
                </div>
                <button className="flex absolute -right-2 -bottom-2 justify-center items-center w-12 h-12 text-white bg-green-500 rounded-full ring-4 ring-gray-50 shadow-xl transition-all duration-200 hover:bg-green-600 hover:scale-110 dark:ring-gray-950">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 表示名入力 */}
            <div>
              <label className="block mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                表示名
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="表示名を入力"
                maxLength={50}
                disabled={isSaving}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  1文字以上50文字以内
                </p>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {displayName.length} / 50
                </p>
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="flex justify-end px-8 pb-8">
            <button
              onClick={handleSave}
              disabled={isSaving || !displayName.trim()}
              className="flex justify-center items-center px-8 py-2.5 space-x-2 text-sm font-semibold text-white bg-green-500 rounded-xl shadow-lg transition-all hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-green-500/30"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
