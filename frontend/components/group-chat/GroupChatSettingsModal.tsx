"use client";

import {
  X,
  Users,
  MessageSquare,
  Settings,
  Trash2,
  Camera,
  Plus,
  GripVertical,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { ModalOverlay } from "@/components/ui/ModalOverlay";
import {
  updateGroupChat,
  deleteGroupChat,
  addMember,
  removeMember,
  reorderMembers,
} from "@/lib/api/group-chat";
import { listAIAgents } from "@/lib/actions/ai-agent";
import type { GroupChat } from "@/lib/api/group-chat";
import type { AIAgent } from "@/lib/types/ai-agent";
import { cn } from "@/lib/utils/cn";
import { ConfirmModal } from "@/components/ui/modals/ConfirmModal";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { uploadGroupChatIcon } from "@/lib/api/upload";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface GroupChatSettingsModalProps {
  groupChat: GroupChat;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

// ソート可能なメンバーアイテムコンポーネント
interface SortableMemberItemProps {
  member: GroupChat["members"][0];
  index: number;
  onRemove: (id: string) => void;
  isLastMember: boolean;
}

function SortableMemberItem({ member, index, onRemove, isLastMember }: SortableMemberItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex gap-3 items-center p-3 bg-gray-50 rounded-xl border border-gray-200 md:p-4 dark:bg-gray-800 dark:border-gray-700",
        isDragging && "shadow-lg"
      )}
    >
      <div className="flex gap-2 items-center">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 rounded transition-colors cursor-grab hover:text-gray-600 hover:bg-gray-200 active:cursor-grabbing dark:hover:text-gray-300 dark:hover:bg-gray-700"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {index + 1}
        </span>
      </div>

      <Avatar
        src={member.ai_agent_icon}
        alt={member.ai_agent_name}
        name={member.ai_agent_name}
        type="ai"
        size="sm"
      />

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate dark:text-white">
          {member.ai_agent_name}
        </h4>
        <p className="text-xs text-gray-500 truncate dark:text-gray-400">
          {member.ai_agent_model}
        </p>
      </div>

      <button
        onClick={() => onRemove(member.id)}
        disabled={isLastMember}
        className={cn(
          "p-2 rounded-lg transition-colors",
          isLastMember
            ? "text-gray-300 cursor-not-allowed dark:text-gray-600"
            : "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        )}
        title={isLastMember ? "グループチャットには最低1人のメンバーが必要です" : "メンバーを削除"}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

type TabType = "basic" | "members" | "prompt";

export function GroupChatSettingsModal({
  groupChat,
  isOpen,
  onClose,
  onSave,
}: GroupChatSettingsModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 画像アップロード用の状態
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [pendingIconBlob, setPendingIconBlob] = useState<Blob | null>(null);
  const [previewIconUrl, setPreviewIconUrl] = useState<string | null>(null);

  // フォーム状態
  const [name, setName] = useState(groupChat.name);
  const [description, setDescription] = useState(groupChat.description || "");
  const [iconUrl, setIconUrl] = useState(groupChat.icon_url || "");
  const [systemPrompt, setSystemPrompt] = useState(
    groupChat.system_prompt || ""
  );

  // メンバー管理
  const [members, setMembers] = useState(groupChat.members || []);
  const [availableAgents, setAvailableAgents] = useState<AIAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // ドラッグ&ドロップのセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // タブの定義
  const tabs = [
    { id: "basic" as TabType, name: "基本情報", icon: Settings },
    { id: "members" as TabType, name: "メンバー", icon: Users },
    { id: "prompt" as TabType, name: "システムプロンプト", icon: MessageSquare },
  ];

  // 初期化
  useEffect(() => {
    if (isOpen) {
      setName(groupChat.name);
      setDescription(groupChat.description || "");
      setIconUrl(groupChat.icon_url || "");
      setSystemPrompt(groupChat.system_prompt || "");
      setMembers(groupChat.members || []);
      setPendingIconBlob(null);
      setPreviewIconUrl(null);
      loadAvailableAgents();
    }
  }, [isOpen, groupChat]);

  const loadAvailableAgents = async () => {
    setLoadingAgents(true);
    try {
      const result = await listAIAgents();
      if (result.success && result.data?.agents) {
        // 既にメンバーのエージェントを除外
        const memberIds = new Set(members.map((m) => m.ai_agent_id));
        const available = result.data.agents.filter(
          (agent) => !memberIds.has(agent.id)
        );
        setAvailableAgents(available);
      }
    } catch (err) {
      console.error("Failed to load agents:", err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("画像サイズは5MB以下にしてください");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (previewIconUrl) {
      URL.revokeObjectURL(previewIconUrl);
    }
    const previewUrl = URL.createObjectURL(croppedBlob);
    setPreviewIconUrl(previewUrl);
    setPendingIconBlob(croppedBlob);
    setShowCropper(false);
    setSelectedImage(null);
  };

  const handleAddMember = (agentId: string) => {
    setError(null);
    
    // ローカル状態でメンバーを追加（DBには保存しない）
    const agent = availableAgents.find((a) => a.id === agentId);
    if (agent) {
      const newMember = {
        id: `temp-${Date.now()}`,
        group_chat_id: groupChat.id,
        ai_agent_id: agent.id,
        ai_agent_name: agent.name,
        ai_agent_icon: agent.avatar_url,
        ai_agent_model: agent.model,
        display_order: members.length,
        joined_at: new Date().toISOString(),
      };
      setMembers([...members, newMember]);
      setAvailableAgents(availableAgents.filter((a) => a.id !== agentId));
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setError(null);
    
    // ローカル状態でメンバーを削除（DBには保存しない）
    const removedMember = members.find((m) => m.id === memberId);
    setMembers(members.filter((m) => m.id !== memberId));
    
    // 利用可能なエージェントリストに追加
    if (removedMember) {
      const result = listAIAgents();
      result.then((res) => {
        if (res.success && res.data?.agents) {
          const memberIds = new Set(
            members.filter((m) => m.id !== memberId).map((m) => m.ai_agent_id)
          );
          const available = res.data.agents.filter(
            (agent) => !memberIds.has(agent.id)
          );
          setAvailableAgents(available);
        }
      });
    }
  };

  const handleReorderMembers = (newOrder: typeof members) => {
    setError(null);
    // ローカル状態で並び順を変更（DBには保存しない）
    setMembers(newOrder);
  };

  const saveMemberChanges = async () => {
    // 元のメンバーと現在のメンバーを比較して差分を保存
    const originalMemberIds = new Set(groupChat.members.map((m) => m.ai_agent_id));
    const currentMemberIds = new Set(members.map((m) => m.ai_agent_id));

    // 削除されたメンバー
    const removedMembers = groupChat.members.filter(
      (m) => !currentMemberIds.has(m.ai_agent_id)
    );

    // 追加されたメンバー
    const addedMembers = members.filter(
      (m) => !originalMemberIds.has(m.ai_agent_id)
    );

    // バリデーション: 削除後にメンバーが0人になる場合はエラー
    if (members.length === 0) {
      throw new Error("グループチャットには最低1人のメンバーが必要です");
    }

    // メンバーを削除
    for (const member of removedMembers) {
      await removeMember(groupChat.id, member.id);
    }

    // メンバーを追加
    for (const member of addedMembers) {
      await addMember(groupChat.id, member.ai_agent_id);
    }

    // メンバーの追加・削除があった場合、または並び順が変更された場合は並び順を更新
    if (addedMembers.length > 0 || removedMembers.length > 0 || hasOrderChanged()) {
      // グループチャットデータを再取得して最新のメンバーIDを取得
      const { getGroupChat } = await import("@/lib/api/group-chat");
      const updatedGroupChat = await getGroupChat(groupChat.id);
      
      // 現在のメンバーの並び順に基づいて、更新されたメンバーIDをマッピング
      const agentIdToMemberId = new Map(
        updatedGroupChat.members.map((m) => [m.ai_agent_id, m.id])
      );
      
      const orderData = members
        .map((m, index) => {
          const memberId = agentIdToMemberId.get(m.ai_agent_id);
          if (!memberId) return null;
          return {
            member_id: memberId,
            display_order: index,
          };
        })
        .filter((item): item is { member_id: string; display_order: number } => item !== null);
      
      if (orderData.length > 0) {
        await reorderMembers(groupChat.id, orderData);
      }
    }
  };

  const hasOrderChanged = () => {
    if (members.length !== groupChat.members.length) return true;
    return members.some((m, index) => {
      const original = groupChat.members[index];
      return m.ai_agent_id !== original.ai_agent_id;
    });
  };

  // ドラッグ終了時のハンドラー
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMembers((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      let finalIconUrl = iconUrl;

      // アイコンがある場合は先にアップロード
      if (pendingIconBlob) {
        setIsUploadingIcon(true);
        try {
          const iconResult = await uploadGroupChatIcon(
            groupChat.id,
            pendingIconBlob
          );
          finalIconUrl = iconResult.icon_url;
        } catch (uploadError) {
          console.error("Icon upload failed:", uploadError);
          setError("画像のアップロードに失敗しました");
          setIsUploadingIcon(false);
          setLoading(false);
          return;
        }
        setIsUploadingIcon(false);
      }

      // 基本情報を更新
      await updateGroupChat(groupChat.id, {
        name,
        description: description || undefined,
        icon_url: finalIconUrl || undefined,
        system_prompt: systemPrompt || undefined,
      });

      // メンバーの変更を保存
      await saveMemberChanges();

      if (previewIconUrl) {
        URL.revokeObjectURL(previewIconUrl);
      }
      setPendingIconBlob(null);
      setPreviewIconUrl(null);

      onClose();
      onSave();
      window.location.reload();
    } catch (err) {
      console.error("Failed to save group chat:", err);
      setError("保存に失敗しました");
    } finally {
      setLoading(false);
      setIsUploadingIcon(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteGroupChat(groupChat.id);
      setIsDeleteConfirmOpen(false);
      onClose();
      router.push("/dashboard/chats");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete group chat:", err);
      setError("削除に失敗しました");
      setIsDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ModalOverlay isOpen={isOpen} onClose={onClose} className="p-2 md:p-4">
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-4xl h-[75vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 md:p-6 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 md:text-xl dark:text-white">
              グループ設定
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 md:p-2 text-gray-400 rounded-full transition-colors hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          {/* タブナビゲーション */}
          <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 md:space-x-2 px-3 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? "border-green-500 text-green-600 dark:text-green-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* コンテンツ */}
          <div className="overflow-y-auto flex-1 p-4 md:p-6">
            {error && (
              <div className="p-3 mb-3 bg-red-50 rounded-lg border border-red-200 md:p-4 md:mb-4 dark:bg-red-900/20 dark:border-red-800">
                <div className="flex items-center space-x-1.5 md:space-x-2">
                  <AlertCircle className="flex-shrink-0 w-4 h-4 text-red-500 md:w-5 md:h-5 dark:text-red-400" />
                  <span className="text-xs text-red-600 md:text-sm dark:text-red-400">
                    {error}
                  </span>
                </div>
              </div>
            )}

            {success && (
              <div className="p-3 mb-3 bg-green-50 rounded-lg border border-green-200 md:p-4 md:mb-4 dark:bg-green-900/20 dark:border-green-800">
                <div className="flex items-center space-x-1.5 md:space-x-2">
                  <Check className="flex-shrink-0 w-4 h-4 text-green-500 md:w-5 md:h-5 dark:text-green-400" />
                  <span className="text-xs text-green-600 md:text-sm dark:text-green-400">
                    {success}
                  </span>
                </div>
              </div>
            )}

            {/* 基本情報タブ */}
            {activeTab === "basic" && (
              <div className="flex flex-col space-y-4 h-full md:space-y-6">
                <div className="flex-shrink-0">
                  <label className="block mb-1.5 md:mb-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                    グループ名
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                {/* アイコン設定 */}
                <div className="flex-shrink-0">
                  <label className="block mb-1.5 md:mb-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                    アイコン
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="flex overflow-hidden justify-center items-center w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full ring-2 ring-gray-200 shadow-lg md:w-20 md:h-20 dark:ring-gray-800">
                        {isUploadingIcon ? (
                          <div className="w-5 h-5 rounded-full border-2 border-white animate-spin md:w-6 md:h-6 border-t-transparent" />
                        ) : previewIconUrl || iconUrl ? (
                          <img
                            src={previewIconUrl || iconUrl}
                            alt="アイコンプレビュー"
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <Users className="w-6 h-6 text-white md:w-8 md:h-8" />
                        )}
                      </div>
                      <input
                        type="file"
                        id="group-settings-icon-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploadingIcon || loading}
                      />
                      <label
                        htmlFor="group-settings-icon-upload"
                        className="flex absolute -right-1 -bottom-1 justify-center items-center w-7 h-7 text-white bg-green-500 rounded-full ring-2 ring-white shadow-lg transition-all duration-200 cursor-pointer md:w-8 md:h-8 hover:bg-green-600 hover:scale-110 dark:ring-gray-900"
                      >
                        <Camera className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </label>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 md:text-sm dark:text-gray-400">
                        クリックして画像を選択
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
                        推奨: 正方形、最大5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col flex-1 min-h-0">
                  <label className="block mb-1.5 md:mb-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                    説明
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="グループの説明を入力してください"
                    className="flex-1 w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                  />
                </div>
              </div>
            )}

            {/* メンバータブ */}
            {activeTab === "members" && (
              <div className="space-y-4 md:space-y-6">
                <div>
                  <h3 className="mb-3 text-base font-medium text-gray-900 md:mb-4 md:text-lg dark:text-white">
                    現在のメンバー ({members.length}人)
                  </h3>
                  
                  {members.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={members.map((m) => m.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {members.map((member, index) => (
                            <SortableMemberItem
                              key={member.id}
                              member={member}
                              index={index}
                              onRemove={handleRemoveMember}
                              isLastMember={members.length === 1}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="py-8 text-center rounded-lg border border-gray-300 border-dashed dark:border-gray-700">
                      <Users className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        メンバーがいません
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 text-base font-medium text-gray-900 md:mb-4 md:text-lg dark:text-white">
                    メンバーを追加
                  </h3>
                  
                  {loadingAgents ? (
                    <div className="py-8 text-center">
                      <Loader2 className="mx-auto mb-2 w-8 h-8 text-green-500 animate-spin" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        エージェントを読み込み中...
                      </p>
                    </div>
                  ) : availableAgents.length > 0 ? (
                    <div className="space-y-2">
                      {availableAgents.map((agent) => (
                        <div
                          key={agent.id}
                          className="flex gap-3 items-center p-3 bg-white rounded-xl border border-gray-200 md:p-4 dark:bg-gray-900 dark:border-gray-700"
                        >
                          <Avatar
                            src={agent.avatar_url}
                            alt={agent.name}
                            name={agent.name}
                            type="ai"
                            size="sm"
                          />

                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate dark:text-white">
                              {agent.name}
                            </h4>
                            <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                              {agent.model}
                            </p>
                          </div>

                          <button
                            onClick={() => handleAddMember(agent.id)}
                            className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
                          >
                            <Plus className="mr-1 w-3 h-3" />
                            追加
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center rounded-lg border border-gray-300 border-dashed dark:border-gray-700">
                      <Users className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        追加可能なエージェントがありません
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* システムプロンプトタブ */}
            {activeTab === "prompt" && (
              <div className="flex flex-col h-full space-y-4 md:space-y-6">
                <div className="flex-shrink-0">
                  <h3 className="mb-2 text-base font-medium text-gray-900 md:text-lg dark:text-white">
                    グループ共通のシステムプロンプト
                  </h3>
                  <p className="text-xs text-gray-600 md:text-sm dark:text-gray-400">
                    このグループのすべてのエージェントに適用される共通の指示を設定できます。
                    各エージェント固有の設定と組み合わせて使用されます。
                  </p>
                </div>

                <div className="flex flex-col flex-1 min-h-0">
                  <label className="block mb-1.5 md:mb-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                    システムプロンプト
                  </label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="例: このグループでは、全員が協力して問題解決に取り組んでください。各自の専門性を活かしながら、建設的な議論を心がけてください。"
                    className="flex-1 w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="flex justify-between items-center p-4 border-t border-gray-200 md:p-6 dark:border-gray-700">
            {/* 削除ボタン */}
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={loading || isDeleting}
              className="flex items-center px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-red-600 bg-red-50 rounded-lg border border-red-200 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="mr-1.5 w-3 h-3 md:w-4 md:h-4" />
              <span>削除</span>
            </button>

            {/* 右側のボタン群 */}
            <div className="flex items-center space-x-2 md:space-x-3">
              <button
                onClick={onClose}
                className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading && (
                  <Loader2 className="mr-1.5 md:mr-2 w-3 h-3 md:w-4 md:h-4 animate-spin" />
                )}
                <span>保存</span>
              </button>
            </div>
          </div>
        </div>
      </ModalOverlay>

      {/* 削除確認モーダル */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="グループを削除"
        message={`「${groupChat.name}」を削除してもよろしいですか？この操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* 画像トリミングモーダル */}
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
    </>
  );
}
