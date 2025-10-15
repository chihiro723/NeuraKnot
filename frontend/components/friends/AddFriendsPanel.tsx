"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Bot,
  User,
  ArrowRight,
  Plus,
  UserPlus,
  Search,
  QrCode,
  Users,
  Handshake,
  Server,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  CheckSquare,
  Square,
} from "lucide-react";
import { getPersonalityLabel } from "@/lib/constants/personalities";
import { cn } from "@/lib/utils/cn";
import type { FriendData } from "@/lib/types";
import type { AuthUser } from "@/lib/types/auth";
import { createAgent } from "@/lib/actions/ai-agent";
import { useServerActionWithAuth } from "@/lib/hooks/useServerActionWithAuth";
import { getUserServicesWithDetails } from "@/lib/actions/services";
import type { UserServiceWithDetails } from "@/lib/types/service";
import { ServiceSelectorModal } from "@/components/services/ServiceSelectorModal";
import { generateAgentIntroduction } from "@/lib/actions/agent-introduction";
import { useRouter } from "next/navigation";

type AddType = "user" | "ai" | "group" | null;

interface AddFriendsPanelProps {
  user: AuthUser;
}

/**
 * 新規追加パネル - 完璧に統一されたデザインシステム
 */
export function AddFriendsPanel({ user }: AddFriendsPanelProps) {
  const [selectedType, setSelectedType] = useState<AddType>(null);

  // デスクトップかどうかを判定
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);

    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  // ローカル状態を使用
  const currentSelectedType = selectedType;
  const setCurrentSelectedType = setSelectedType;

  const addTypes = [
    {
      type: "user" as const,
      icon: User,
      title: "ユーザー",
      description: "他のユーザーとつながって会話しよう",
      comingSoon: true,
    },
    {
      type: "ai" as const,
      icon: Bot,
      title: "エージェント",
      description: "様々な個性を持つAIと会話しよう",
      comingSoon: false,
    },
    {
      type: "group" as const,
      icon: Handshake,
      title: "グループ",
      description: "複数の友だちやAIとグループチャット",
      comingSoon: true,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* モバイル・タブレット用の従来レイアウト */}
      <div className="lg:hidden">
        {currentSelectedType ? (
          currentSelectedType === "ai" ? (
            <AIAgentCreationPanel onBack={() => setCurrentSelectedType(null)} />
          ) : currentSelectedType === "group" ? (
            <GroupCreationPanel
              onBack={() => setCurrentSelectedType(null)}
              user={user}
            />
          ) : (
            <UserFriendAddPanel onBack={() => setCurrentSelectedType(null)} />
          )
        ) : (
          <div className="flex flex-col h-full">
            {/* ヘッダー */}
            <div className="p-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                追加
              </h1>
            </div>

            {/* 選択カード */}
            <div className="flex overflow-y-auto flex-1 justify-center items-start p-4 pb-8">
              <div className="space-y-4 w-full">
                {addTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.type}
                      onClick={() =>
                        !type.comingSoon && setCurrentSelectedType(type.type)
                      }
                      disabled={type.comingSoon}
                      className={cn(
                        "relative w-full bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left block min-h-[104px]",
                        type.comingSoon
                          ? "opacity-60 cursor-not-allowed border-gray-300 dark:border-gray-700"
                          : "border-gray-300 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="flex items-center font-medium text-gray-900 dark:text-white">
                          <Icon className="mr-2 w-5 h-5" />
                          {type.title}
                          {type.comingSoon && (
                            <span className="ml-2 px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded dark:text-gray-400 dark:bg-gray-700">
                              近日追加予定
                            </span>
                          )}
                        </h3>
                        <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {type.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* デスクトップ用レイアウト */}
      <div className="hidden flex-col h-full lg:flex">
        {/* 選択カード */}
        <div className="flex overflow-y-auto flex-1 items-start p-4 lg:p-6">
          <div className="space-y-6 w-full">
            {addTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = currentSelectedType === type.type;
              return (
                <button
                  key={type.type}
                  onClick={() =>
                    !type.comingSoon && setCurrentSelectedType(type.type)
                  }
                  disabled={type.comingSoon}
                  className={cn(
                    "relative w-full bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left block min-h-[104px]",
                    type.comingSoon
                      ? "opacity-60 cursor-not-allowed border-gray-300 dark:border-gray-700"
                      : isSelected
                      ? "border-green-400 bg-green-50 dark:bg-green-500/10"
                      : "border-gray-300 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="flex items-center font-medium text-gray-900 dark:text-white lg:text-sm">
                      <Icon className="mr-2 w-5 h-5" />
                      {type.title}
                      {type.comingSoon && (
                        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded dark:text-gray-400 dark:bg-gray-700">
                          近日追加予定
                        </span>
                      )}
                    </h3>
                    <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 lg:text-xs">
                    {type.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * デスクトップ用の右側パネル - 完璧に統一されたデザインシステム
 */
export function AddFriendsRightPanel({
  selectedType,
  user,
}: {
  selectedType: AddType;
  user: AuthUser;
}) {
  if (selectedType === "ai") {
    return <AIAgentCreationPanel onBack={() => {}} isDesktop />;
  }

  if (selectedType === "group") {
    return <GroupCreationPanel onBack={() => {}} isDesktop user={user} />;
  }

  if (selectedType === "user") {
    return <UserFriendAddPanel onBack={() => {}} isDesktop />;
  }

  return (
    <>
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <UserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              新規追加
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              左側から追加したい種類を選択してください
            </p>
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="p-8 text-center">
          <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-2xl shadow-lg dark:bg-green-500/20 shadow-green-500/20">
            <UserPlus className="w-8 h-8 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            友だちを追加
          </h3>
          <p className="mb-6 max-w-md text-sm text-gray-500 dark:text-gray-400">
            左側から種類を選択して、新しい友だちを追加しましょう
          </p>
          <div className="flex gap-6 justify-center">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-center items-center w-8 h-8 bg-green-100 rounded-lg dark:bg-green-500/20">
                <User className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span>ユーザー</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-center items-center w-8 h-8 bg-green-100 rounded-lg dark:bg-green-500/20">
                <Bot className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span>AI</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-center items-center w-8 h-8 bg-green-100 rounded-lg dark:bg-green-500/20">
                <Handshake className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span>グループ</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export interface AIAgentCreationPanelProps {
  onBack: () => void;
  isDesktop?: boolean;
}

export function AIAgentCreationPanel({
  onBack,
  isDesktop = false,
}: AIAgentCreationPanelProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    // 基本情報
    name: "",
    description: "",
    avatar_url: "",

    // ペルソナ設定
    persona_type: "",
    system_prompt: "",

    // LLM設定
    provider: "openai",
    model: "gpt-4o",
    temperature: 0.7,
    max_tokens: 2000,

    // 機能設定
    tools_enabled: true,
    streaming_enabled: false,
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // サービス選択
  const [userServices, setUserServices] = useState<UserServiceWithDetails[]>(
    []
  );
  const [selectedServices, setSelectedServices] = useState<
    Array<{
      service_class: string;
      service_name: string;
      tool_selection_mode: "all" | "selected";
      selected_tools: string[];
      enabled: boolean;
    }>
  >([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(
    new Set()
  );

  // ユーザーのサービス一覧を取得
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const services = await getUserServicesWithDetails();
        setUserServices(services);
      } catch (err) {
        console.error("Failed to load services:", err);
      }
    };
    fetchServices();
  }, []);

  // 401エラー時に自動リフレッシュ
  const createAgentWithAuth = useServerActionWithAuth(createAgent);

  const personalities = [
    {
      id: "assistant",
      name: "アシスタント",
      description: "親切で丁寧なアシスタント",
    },
    {
      id: "creative",
      name: "クリエイティブ",
      description: "創造的で発想豊かな対話",
    },
    {
      id: "analytical",
      name: "アナリティカル",
      description: "論理的で分析的な対話",
    },
  ];

  const providers = [
    {
      id: "openai",
      name: "OpenAI",
      models: [
        { id: "gpt-4o", name: "GPT-4o", description: "最新の高性能モデル" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "高速で経済的" },
      ],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      models: [
        {
          id: "claude-3.5-sonnet",
          name: "Claude 3.5 Sonnet",
          description: "高度な推論能力",
        },
      ],
    },
    {
      id: "google",
      name: "Google",
      models: [
        {
          id: "gemini-pro",
          name: "Gemini Pro",
          description: "マルチモーダル対応",
        },
      ],
    },
  ];

  const currentProvider = providers.find((p) => p.id === formData.provider);

  // サービス追加処理
  const handleAddServices = (
    services: Array<{
      service_class: string;
      service_name: string;
      tool_selection_mode: "all" | "selected";
      selected_tools: string[];
      enabled: boolean;
    }>
  ) => {
    setSelectedServices([...selectedServices, ...services]);
  };

  // サービス削除処理
  const handleRemoveService = (serviceClass: string) => {
    setSelectedServices(
      selectedServices.filter((s) => s.service_class !== serviceClass)
    );
    setExpandedServices((prev) => {
      const next = new Set(prev);
      next.delete(serviceClass);
      return next;
    });
  };

  // ツール選択の切り替え
  const toggleServiceExpand = (serviceClass: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceClass)) {
        next.delete(serviceClass);
      } else {
        next.add(serviceClass);
      }
      return next;
    });
  };

  // ツール選択モードの変更
  const updateToolSelection = (
    serviceClass: string,
    mode: "all" | "selected",
    tools: string[]
  ) => {
    setSelectedServices(
      selectedServices.map((s) =>
        s.service_class === serviceClass
          ? { ...s, tool_selection_mode: mode, selected_tools: tools }
          : s
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        // Server Actionを呼び出す（401エラー時に自動リフレッシュ）
        const result = await createAgentWithAuth({
          name: formData.name,
          persona_type: formData.persona_type,
          model: formData.model,
          description: formData.description || undefined,
          avatar_url: formData.avatar_url || undefined,
          system_prompt: formData.system_prompt || undefined,
          provider: formData.provider,
          temperature: formData.temperature,
          max_tokens: formData.max_tokens,
          tools_enabled: true, // 常に有効
          streaming_enabled: formData.streaming_enabled,
          services: selectedServices.length > 0 ? selectedServices : undefined,
        });

        if (!result) {
          throw new Error("Server Actionから応答がありません");
        }

        if (!result.success) {
          throw new Error(result.error || "Failed to create agent");
        }

        const agentId = result.data.id;

        // バックグラウンドで自己紹介を生成（遅延実行）
        setTimeout(() => {
          generateAgentIntroduction(
            agentId,
            {
              name: formData.name,
              persona_type: formData.persona_type,
              description: formData.description,
            },
            selectedServices
          ).catch((err) => {
            console.error("Failed to generate introduction:", err);
          });
        }, 2000); // 2秒後に実行

        // すぐにrosterページに遷移
        router.push(`/dashboard/roster/${agentId}`);

        // フォームをリセット
        setFormData({
          name: "",
          description: "",
          avatar_url: "",
          persona_type: "",
          system_prompt: "",
          provider: "openai",
          model: "gpt-4o",
          temperature: 0.7,
          max_tokens: 2000,
          tools_enabled: true,
          streaming_enabled: false,
        });

        // デスクトップの場合もモバイルの場合も、rosterページに遷移するため
        // isDesktopフラグによる分岐を削除
      } catch (error) {
        console.error("Error creating agent:", error);
        setError(
          error instanceof Error
            ? error.message
            : "AI Agentの作成に失敗しました"
        );
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="flex items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          {!isDesktop && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-gray-400 rounded-lg transition-all dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <Bot className="w-5 h-5 text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
              エージェント作成
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              あなた専用のエージェントを作成
            </p>
          </div>
        </div>
      </div>

      {/* フォーム */}
      <div className="overflow-y-auto flex-1">
        <form
          onSubmit={handleSubmit}
          className="p-8 mx-auto space-y-10 max-w-2xl"
        >
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
                エージェント名 <span className="text-green-600">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例: マイアシスタント"
                className={cn(
                  "px-4 py-3 w-full bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                  "focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500",
                  "placeholder-gray-400 text-gray-900 dark:text-white dark:placeholder-gray-500"
                )}
                required
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
                placeholder="このエージェントの特徴や役割を説明してください"
                rows={3}
                className={cn(
                  "px-4 py-3 w-full bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                  "focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500",
                  "placeholder-gray-400 text-gray-900 resize-none dark:text-white dark:placeholder-gray-500"
                )}
              />
            </div>
          </div>

          {/* セクション2: パーソナリティ設定 */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                パーソナリティ
              </h2>
            </div>

            {/* パーソナリティ選択 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                対話スタイル <span className="text-green-600">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {personalities.map((personality) => {
                  const isSelected = formData.persona_type === personality.id;
                  return (
                    <button
                      key={personality.id}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          persona_type: personality.id,
                        })
                      }
                      className={cn(
                        "relative p-4 text-center rounded-lg border transition-all",
                        isSelected
                          ? "bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500"
                          : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                      )}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {personality.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {personality.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* システムプロンプト */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                カスタムシステムプロンプト{" "}
                <span className="text-xs text-gray-400">上級者向け</span>
              </label>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                空欄の場合、選択したパーソナリティに基づいて自動生成されます
              </p>
              <textarea
                value={formData.system_prompt}
                onChange={(e) =>
                  setFormData({ ...formData, system_prompt: e.target.value })
                }
                placeholder="カスタムの指示を入力（例: あなたは親切で丁寧なアシスタントです...）"
                rows={4}
                className={cn(
                  "px-4 py-3 w-full bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                  "focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500",
                  "text-sm placeholder-gray-400 text-gray-900 resize-none dark:text-white dark:placeholder-gray-500"
                )}
              />
            </div>
          </div>

          {/* セクション3: AI モデル設定 */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI モデル設定
              </h2>
            </div>

            {/* プロバイダーとモデル選択 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                AI プロバイダー
              </label>
              <div className="grid grid-cols-3 gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        provider: provider.id,
                        model: provider.models[0].id,
                      })
                    }
                    className={cn(
                      "p-3 rounded-lg border transition-all font-medium text-sm",
                      formData.provider === provider.id
                        ? "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-500"
                        : "bg-white border-gray-300 text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600"
                    )}
                  >
                    {provider.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                モデル
              </label>
              <div className="space-y-2">
                {currentProvider?.models.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, model: model.id })
                    }
                    className={cn(
                      "w-full p-4 rounded-lg border transition-all text-left",
                      formData.model === model.id
                        ? "bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500"
                        : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {model.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {model.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Temperature設定 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  創造性レベル (Temperature)
                </label>
                <span className="font-mono text-sm font-semibold text-green-600 dark:text-green-400">
                  {formData.temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    temperature: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-green-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>正確 (0.0)</span>
                <span>バランス (1.0)</span>
                <span>創造的 (2.0)</span>
              </div>
            </div>

            {/* Max Tokens設定 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  最大トークン数
                </label>
                <span className="font-mono text-sm font-semibold text-green-600 dark:text-green-400">
                  {formData.max_tokens}
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="8000"
                step="100"
                value={formData.max_tokens}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_tokens: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-green-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                より長い応答には高い値を設定します
              </p>
            </div>
          </div>

          {/* セクション4: 機能設定 */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                機能設定
              </h2>
            </div>

            <div className="space-y-4">
              {/* ストリーミング有効化 */}
              <div className="flex justify-between items-center py-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    ストリーミングチャット
                  </h4>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    応答をリアルタイムで表示します（対応モデルのみ）
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      streaming_enabled: !formData.streaming_enabled,
                    })
                  }
                  className={cn(
                    "relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-green-500 focus:ring-offset-2",
                    formData.streaming_enabled
                      ? "bg-green-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200",
                      formData.streaming_enabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* サービス選択 */}
              <div className="py-3">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      外部サービス連携
                    </h4>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      このエージェントが使用できるサービスとツールを設定
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsServiceModalOpen(true)}
                    className="px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    サービスを追加
                  </button>
                </div>

                {/* 選択済みサービス一覧 */}
                {selectedServices.length > 0 ? (
                  <div className="space-y-2">
                    {selectedServices.map((service) => {
                      const userService = userServices.find(
                        (s) => s.service.class_name === service.service_class
                      );
                      const isExpanded = expandedServices.has(
                        service.service_class
                      );

                      return (
                        <div
                          key={service.service_class}
                          className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800/50"
                        >
                          {/* サービスヘッダー */}
                          <div className="flex gap-3 items-center p-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                userService?.service.type === "built_in"
                                  ? "bg-gradient-to-br from-blue-500 to-blue-600"
                                  : "bg-gradient-to-br from-green-500 to-green-600"
                              )}
                            >
                              <Server className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-gray-900 truncate dark:text-white">
                                {service.service_name}
                              </h5>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {service.tool_selection_mode === "all"
                                  ? "全ツール使用可能"
                                  : `${service.selected_tools.length}個のツールを選択中`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                toggleServiceExpand(service.service_class)
                              }
                              className="p-2 text-gray-400 rounded-lg transition-colors hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveService(service.service_class)
                              }
                              className="p-2 text-red-400 rounded-lg transition-colors hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* ツール一覧（展開時） */}
                          {isExpanded && userService && (
                            <div className="p-3 space-y-2 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex gap-2 mb-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateToolSelection(
                                      service.service_class,
                                      "all",
                                      []
                                    )
                                  }
                                  className={cn(
                                    "px-3 py-1 text-xs rounded-lg transition-colors",
                                    service.tool_selection_mode === "all"
                                      ? "bg-green-500 text-white"
                                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                  )}
                                >
                                  全ツール
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateToolSelection(
                                      service.service_class,
                                      "selected",
                                      []
                                    )
                                  }
                                  className={cn(
                                    "px-3 py-1 text-xs rounded-lg transition-colors",
                                    service.tool_selection_mode === "selected"
                                      ? "bg-green-500 text-white"
                                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                  )}
                                >
                                  個別選択
                                </button>
                              </div>

                              {service.tool_selection_mode === "selected" && (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {userService.tools.map((tool) => {
                                    const isSelected =
                                      service.selected_tools.includes(
                                        tool.name
                                      );
                                    return (
                                      <button
                                        key={tool.name}
                                        type="button"
                                        onClick={() => {
                                          const newTools = isSelected
                                            ? service.selected_tools.filter(
                                                (t) => t !== tool.name
                                              )
                                            : [
                                                ...service.selected_tools,
                                                tool.name,
                                              ];
                                          updateToolSelection(
                                            service.service_class,
                                            "selected",
                                            newTools
                                          );
                                        }}
                                        className={cn(
                                          "flex gap-2 items-center p-2 text-left rounded-lg transition-colors",
                                          isSelected
                                            ? "text-green-900 bg-green-100 dark:bg-green-900/30 dark:text-green-300"
                                            : "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400"
                                        )}
                                      >
                                        {isSelected ? (
                                          <CheckSquare className="flex-shrink-0 w-4 h-4" />
                                        ) : (
                                          <Square className="flex-shrink-0 w-4 h-4" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium truncate">
                                            {tool.name}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center rounded-lg border border-gray-300 border-dashed dark:border-gray-700">
                    <Server className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      サービスが選択されていません
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* 作成ボタン */}
          <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
            {!isDesktop && (
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-all dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                キャンセル
              </button>
            )}
            <button
              type="submit"
              disabled={
                !formData.name ||
                !formData.persona_type ||
                !formData.model ||
                isPending
              }
              className={cn(
                "flex-1 px-6 py-3 font-medium rounded-lg transition-all",
                "flex justify-center items-center space-x-2",
                "text-white bg-green-600 hover:bg-green-700",
                "disabled:bg-gray-400 dark:disabled:bg-gray-600",
                "disabled:cursor-not-allowed"
              )}
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                  <span>作成中...</span>
                </>
              ) : (
                <span>エージェントを作成</span>
              )}
            </button>
          </div>
        </form>

        {/* サービス選択モーダル */}
        <ServiceSelectorModal
          isOpen={isServiceModalOpen}
          onClose={() => setIsServiceModalOpen(false)}
          userServices={userServices}
          onAddServices={handleAddServices}
        />
      </div>
    </div>
  );
}

export interface UserFriendAddPanelProps {
  onBack: () => void;
  isDesktop?: boolean;
}

export function UserFriendAddPanel({
  onBack,
  isDesktop = false,
}: UserFriendAddPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const addMethods = [
    {
      icon: QrCode,
      title: "QRコードスキャン",
      description: "QRコードをスキャンして新規追加",
      iconColor: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-800",
    },
    {
      icon: Users,
      title: "連絡先から招待",
      description: "連絡先の友だちをアプリに招待",
      iconColor: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-800",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="flex items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          {!isDesktop && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-gray-400 rounded-lg transition-all dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div className="flex justify-center items-center w-10 h-10 bg-gray-100 rounded-lg dark:bg-gray-800">
            <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
              ユーザー追加
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              新しいユーザーを追加
            </p>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="overflow-y-auto flex-1">
        <div className="p-8 mx-auto space-y-10 max-w-2xl">
          {/* 検索セクション */}
          <div className="space-y-4">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                ユーザー名で検索
              </h2>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ユーザー名を入力..."
                className={cn(
                  "flex-1 px-4 py-3 bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                  "focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500",
                  "placeholder-gray-400 text-gray-900 dark:text-white dark:placeholder-gray-500"
                )}
              />
              <button
                className={cn(
                  "px-6 py-3 font-medium rounded-lg transition-all",
                  "text-white bg-green-600 hover:bg-green-700"
                )}
              >
                検索
              </button>
            </div>
            {searchQuery && (
              <div className="p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                  「{searchQuery}」の検索結果はありません
                </p>
              </div>
            )}
          </div>

          {/* 追加方法 */}
          <div className="space-y-4">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                その他の追加方法
              </h2>
            </div>
            <div className="space-y-3">
              {addMethods.map((method, index) => {
                const Icon = method.icon;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      // 実装予定
                    }}
                    className={cn(
                      "flex items-center p-4 space-x-3 w-full bg-white rounded-lg border border-gray-300",
                      "text-left transition-all dark:bg-gray-900 dark:border-gray-700",
                      "hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        method.bgColor
                      )}
                    >
                      <Icon className={cn("w-5 h-5", method.iconColor)} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {method.title}
                      </h4>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {method.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 招待セクション */}
          <div className="space-y-4">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                ユーザーを招待
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                招待リンクを送ってユーザーをアプリに招待しましょう
              </p>
            </div>
            <button
              className={cn(
                "px-6 py-3 w-full font-medium rounded-lg transition-all",
                "text-white bg-green-600 hover:bg-green-700"
              )}
            >
              招待リンクを作成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface GroupCreationPanelProps {
  onBack: () => void;
  isDesktop?: boolean;
  user: AuthUser;
}

export function GroupCreationPanel({
  onBack,
  isDesktop = false,
  user,
}: GroupCreationPanelProps) {
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // 友だちリストを読み込み
  useEffect(() => {
    const loadFriends = async () => {
      try {
        // 実際の友だちリストを取得するAPIを実装
        setFriends([]);
      } catch (error) {
        console.error("友だちリストの読み込みでエラーが発生しました:", error);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    loadFriends();
  }, [user.id]);

  const handleMemberToggle = (friendId: string) => {
    const newSelectedMembers = new Set(selectedMembers);
    if (newSelectedMembers.has(friendId)) {
      newSelectedMembers.delete(friendId);
    } else {
      newSelectedMembers.add(friendId);
    }
    setSelectedMembers(newSelectedMembers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // グループ作成処理の実装
    if (!isDesktop) {
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="flex items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          {!isDesktop && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-gray-400 rounded-lg transition-all dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div className="flex justify-center items-center w-10 h-10 bg-gray-100 rounded-lg dark:bg-gray-800">
            <Handshake className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
              グループ作成
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              新しいグループを作成
            </p>
          </div>
        </div>
      </div>

      {/* フォーム */}
      <div className="overflow-y-auto flex-1">
        <form
          onSubmit={handleSubmit}
          className="p-8 mx-auto space-y-10 max-w-2xl"
        >
          {/* グループ名入力 */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                基本情報
              </h2>
            </div>

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
                placeholder="例: プロジェクトチーム"
                className={cn(
                  "px-4 py-3 w-full bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                  "focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500",
                  "placeholder-gray-400 text-gray-900 dark:text-white dark:placeholder-gray-500"
                )}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                説明 <span className="text-xs text-gray-400">任意</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="このグループの目的や説明を入力してください..."
                rows={4}
                className={cn(
                  "px-4 py-3 w-full bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-700",
                  "focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500",
                  "placeholder-gray-400 text-gray-900 resize-none dark:text-white dark:placeholder-gray-500"
                )}
              />
            </div>
          </div>

          {/* メンバー選択 */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  メンバーを選択
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  あなた + {selectedMembers.size}人 = {selectedMembers.size + 1}
                  人
                </span>
              </div>
            </div>

            {isLoadingFriends ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-6 h-6 rounded-full border-b-2 border-green-500 animate-spin"></div>
              </div>
            ) : friends.length === 0 ? (
              <div className="py-8 text-center">
                <div className="flex justify-center items-center mx-auto mb-3 w-12 h-12 bg-gray-100 rounded-full dark:bg-gray-800">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  友だちがいません。先に友だちを追加してください。
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-2 max-h-64">
                {friends.map((friend) => {
                  const isSelected = selectedMembers.has(friend.id);
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => handleMemberToggle(friend.id)}
                      className={cn(
                        "flex items-center p-3 space-x-3 w-full bg-white rounded-lg border dark:bg-gray-900",
                        "text-left transition-all",
                        isSelected
                          ? "bg-green-50 border-green-500 dark:bg-green-500/10 dark:border-green-500"
                          : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                      )}
                    >
                      {/* チェックボックス */}
                      <div
                        className={cn(
                          "flex justify-center items-center w-5 h-5 rounded border-2 transition-all duration-300",
                          isSelected
                            ? "bg-green-500 border-green-500"
                            : "border-gray-400 dark:border-gray-600"
                        )}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>

                      {/* アバター */}
                      <div className="relative">
                        <div className="flex overflow-hidden justify-center items-center w-10 h-10 bg-gray-300 rounded-full dark:bg-gray-600">
                          {friend.avatar_url ? (
                            <img
                              src={friend.avatar_url}
                              alt={friend.name}
                              className="object-cover w-full h-full"
                            />
                          ) : friend.type === "ai" ? (
                            <Bot className="w-5 h-5 text-white" />
                          ) : (
                            <span className="text-sm font-medium text-white">
                              {friend.name.charAt(0)}
                            </span>
                          )}
                        </div>

                        {/* ステータスバッジ */}
                        {friend.type === "ai" && (
                          <div className="flex absolute -right-1 -bottom-1 justify-center items-center w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800">
                            <span className="text-xs">🤖</span>
                          </div>
                        )}
                        {friend.type === "human" &&
                          friend.status === "online" && (
                            <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                          )}
                      </div>

                      {/* 友だち情報 */}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {friend.name}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {friend.type === "ai" && friend.personality_preset
                            ? `${getPersonalityLabel(
                                friend.personality_preset
                              )} • オンライン`
                            : friend.status === "online"
                            ? "オンライン"
                            : "オフライン"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 作成ボタン */}
          <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
            {!isDesktop && (
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-all dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                キャンセル
              </button>
            )}
            <button
              type="submit"
              disabled={!formData.name || selectedMembers.size === 0}
              className={cn(
                "flex-1 px-6 py-3 font-medium rounded-lg transition-all",
                "flex justify-center items-center space-x-2",
                "text-white bg-green-600 hover:bg-green-700",
                "disabled:bg-gray-400 dark:disabled:bg-gray-600",
                "disabled:cursor-not-allowed"
              )}
            >
              <span>
                グループを作成{" "}
                {selectedMembers.size > 0 && `(${selectedMembers.size + 1}人)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
