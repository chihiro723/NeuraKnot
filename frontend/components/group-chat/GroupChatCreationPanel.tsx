"use client";

import { useState, useEffect, useTransition } from "react";
import { ArrowRight, Users, Camera } from "lucide-react";
import { listAIAgents } from "@/lib/actions/ai-agent";
import { createGroupChat } from "@/lib/actions/group-chat";
import type { AIAgent } from "@/lib/types/ai-agent";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { uploadGroupChatIcon } from "@/lib/api/upload";

interface GroupChatCreationPanelProps {
  onBack: () => void;
  isDesktop?: boolean;
}

/**
 * グループチャット作成パネル - AIAgentCreationPanelと同じデザイン
 */
export function GroupChatCreationPanel({
  onBack,
  isDesktop = false,
}: GroupChatCreationPanelProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon_url: "",
  });
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 画像アップロード用の状態
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [pendingIconBlob, setPendingIconBlob] = useState<Blob | null>(null);

  // エージェント一覧を取得
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const result = await listAIAgents();
        if (result.success && result.data) {
          setAgents(result.data.agents || []);
        }
      } catch (err) {
        console.error("Failed to load agents:", err);
      } finally {
        setIsLoadingAgents(false);
      }
    };

    loadAgents();
  }, []);

  const handleToggleAgent = (agentId: string) => {
    const newSelected = new Set(selectedAgentIds);
    if (newSelected.has(agentId)) {
      newSelected.delete(agentId);
    } else {
      newSelected.add(agentId);
    }
    setSelectedAgentIds(newSelected);
  };

  // 画像アップロードハンドラー
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError("画像サイズは5MB以下にしてください");
      return;
    }

    // ファイルタイプチェック
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }

    // プレビュー用にFileReaderで読み込み
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    // プレビュー用のURLを生成（保存時にアップロード）
    if (formData.icon_url && formData.icon_url.startsWith("blob:")) {
      URL.revokeObjectURL(formData.icon_url);
    }
    const previewUrl = URL.createObjectURL(croppedBlob);
    setFormData({ ...formData, icon_url: previewUrl });
    setPendingIconBlob(croppedBlob);
    setShowCropper(false);
    setSelectedImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("グループ名を入力してください");
      return;
    }

    if (selectedAgentIds.size === 0) {
      setError("少なくとも1つのエージェントを選択してください");
      return;
    }

    startTransition(async () => {
      try {
        // グループチャットを作成（アイコンなし）
        const result = await createGroupChat({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          icon_url: undefined,
          member_ids: Array.from(selectedAgentIds),
        });

        if (!result.success) {
          setError(result.error || "グループチャットの作成に失敗しました");
          return;
        }

        const groupChatId = result.data?.id;
        if (!groupChatId) {
          setError("グループチャットIDが取得できませんでした");
          return;
        }

        // アイコンがある場合はグループチャット作成後にアップロード
        if (pendingIconBlob) {
          setIsUploadingIcon(true);
          try {
            await uploadGroupChatIcon(groupChatId, pendingIconBlob);
          } catch (err) {
            console.error("Failed to upload icon:", err);
            // アイコンのアップロードに失敗してもグループチャット作成は成功
          } finally {
            setIsUploadingIcon(false);
          }
        }

        // グループチャット画面に遷移
        router.push(`/dashboard/chats`);
      } catch (err: any) {
        console.error("Error creating group chat:", err);
        setError(err.message || "グループチャットの作成に失敗しました");
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-4 h-16 bg-white border-b border-gray-200 sm:h-16 sm:px-6 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <Users className="w-5 h-5 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
              グループチャット作成
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              複数のエージェントと協働
            </p>
          </div>
        </div>
        {/* 戻るボタン（モバイルのみ、右側に配置） */}
        {!isDesktop && (
          <button
            onClick={onBack}
            className="flex justify-center items-center p-2 text-gray-600 rounded-lg transition-all duration-200 bg-gray-50/80 dark:text-gray-300 dark:bg-gray-800/50 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700"
            title="戻る"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
        )}
      </div>

      {/* フォーム */}
      <div className="overflow-y-auto flex-1">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="p-4 mx-auto space-y-8 max-w-2xl sm:p-8 sm:space-y-10"
        >
          {/* エラー表示 */}
          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {error}
            </div>
          )}

          {/* セクション1: 基本情報 */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                基本情報
              </h2>
            </div>

            {/* 名前入力 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                グループ名 <span className="text-green-600">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例: 開発チーム"
                className={cn(
                  "px-4 py-3 w-full bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                  "focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500",
                  "placeholder-gray-400 text-gray-900 dark:text-white dark:placeholder-gray-500"
                )}
                required
                maxLength={255}
              />
            </div>

            {/* 説明入力 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                説明 <span className="text-xs text-gray-400">任意</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="このグループの目的や用途を説明してください"
                rows={3}
                className={cn(
                  "px-4 py-3 w-full bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                  "focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500",
                  "placeholder-gray-400 text-gray-900 resize-none dark:text-white dark:placeholder-gray-500"
                )}
              />
            </div>

            {/* アイコン設定 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                アイコン <span className="text-xs text-gray-400">任意</span>
              </label>
              <div className="flex items-center space-x-3 md:space-x-4">
                {/* アバタープレビュー */}
                <div className="relative">
                  <div className="flex overflow-hidden justify-center items-center w-16 h-16 bg-gray-300 rounded-full ring-2 ring-gray-200 shadow-lg md:w-20 md:h-20 dark:bg-gray-700 dark:ring-gray-800">
                    {isUploadingIcon ? (
                      <div className="w-5 h-5 rounded-full border-2 border-white animate-spin md:w-6 md:h-6 border-t-transparent" />
                    ) : formData.icon_url ? (
                      <img
                        src={formData.icon_url}
                        alt="アイコンプレビュー"
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-white md:w-8 md:h-8" />
                    )}
                  </div>
                  <input
                    type="file"
                    id="group-icon-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploadingIcon || isPending}
                  />
                  <label
                    htmlFor="group-icon-upload"
                    className="flex absolute -right-1 -bottom-1 justify-center items-center w-7 h-7 text-white bg-green-500 rounded-full ring-2 ring-white shadow-lg transition-all duration-200 cursor-pointer md:w-8 md:h-8 hover:bg-green-600 hover:scale-110 dark:ring-gray-900"
                  >
                    <Camera className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </label>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    クリックして画像を選択してください
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    推奨: 正方形の画像、最大5MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* セクション2: メンバー選択 */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                メンバー選択
              </h2>
              {selectedAgentIds.size > 0 && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  {selectedAgentIds.size}個のエージェントを選択中
                </p>
              )}
            </div>

            {isLoadingAgents ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 rounded-full border-b-2 border-green-500 animate-spin"></div>
              </div>
            ) : agents.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-3 w-12 h-12 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  エージェントがありません
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  先にエージェントを作成してください
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900 dark:text-white">
                  エージェント <span className="text-green-600">*</span>
                </label>
                <div className="space-y-2">
                  {agents.map((agent) => {
                    const isSelected = selectedAgentIds.has(agent.id);
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => handleToggleAgent(agent.id)}
                        className={cn(
                          "flex items-center p-4 space-x-3 w-full rounded-lg border transition-all",
                          isSelected
                            ? "bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500"
                            : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                        )}
                      >
                        {/* チェックボックス風アイコン */}
                        <div
                          className={cn(
                            "flex flex-shrink-0 justify-center items-center w-5 h-5 rounded border-2 transition-all",
                            isSelected
                              ? "bg-green-500 border-green-500"
                              : "border-gray-300 dark:border-gray-600"
                          )}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>

                        {/* アバター */}
                        {agent.avatar_url ? (
                          <img
                            src={agent.avatar_url}
                            alt={agent.name}
                            className="object-cover flex-shrink-0 w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="flex flex-shrink-0 justify-center items-center w-10 h-10 bg-gray-200 rounded-full dark:bg-gray-700">
                            <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}

                        {/* 名前と説明 */}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                            {agent.name}
                          </p>
                          {agent.description && (
                            <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                              {agent.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 作成ボタン */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleSubmit}
              disabled={
                isPending ||
                !formData.name.trim() ||
                selectedAgentIds.size === 0
              }
              className={cn(
                "flex justify-center items-center gap-2 px-6 py-3 w-full font-medium rounded-lg transition-all",
                isPending ||
                  !formData.name.trim() ||
                  selectedAgentIds.size === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                  : "bg-green-500 text-white hover:bg-green-600 shadow-lg hover:shadow-green-500/30"
              )}
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                  <span>作成中...</span>
                </>
              ) : (
                <span>作成</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 画像クロッパーモーダル */}
      {showCropper && selectedImage && (
        <ImageCropper
          src={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setSelectedImage(null);
          }}
        />
      )}
    </div>
  );
}
