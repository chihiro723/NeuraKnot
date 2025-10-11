"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Bot,
  User,
  ArrowRight,
  Brain,
  Sparkles,
  LineChart,
  Plus,
  UserPlus,
  Search,
  QrCode,
  Users,
  Handshake,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { getAllSampleFriends } from "@/lib/data/sampleData";
import { getPersonalityLabel } from "@/lib/constants/personalities";
import { cn } from "@/lib/utils/cn";
import type { FriendData } from "@/lib/types";
import { createAgent } from "@/lib/actions/ai-agent-actions";
import { useServerActionWithAuth } from "@/lib/hooks/useServerActionWithAuth";

type AddType = "user" | "ai" | "group" | null;

/**
 * 友だち追加パネル - 完璧に統一されたデザインシステム
 */
export function AddFriendsPanel() {
  const [selectedType, setSelectedType] = useState<AddType>(null);
  const { setActiveTab, selectedAddFriendType, setSelectedAddFriendType } =
    useDashboard();

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

  // デスクトップでは全体の状態を使用、モバイルではローカル状態を使用
  const currentSelectedType = isDesktop ? selectedAddFriendType : selectedType;
  const setCurrentSelectedType = isDesktop
    ? setSelectedAddFriendType
    : setSelectedType;

  const addTypes = [
    {
      type: "user" as const,
      icon: User,
      title: "ユーザー",
      description: "実際の人とつながって会話しよう",
      color: "from-blue-400 to-purple-500",
      bgColor: "from-blue-500/10 to-purple-500/10",
      borderColor: "border-blue-400/30",
    },
    {
      type: "ai" as const,
      icon: Bot,
      title: "AIエージェント",
      description: "様々な個性を持つAIと会話しよう",
      color: "from-emerald-400 to-cyan-500",
      bgColor: "from-emerald-500/10 to-cyan-500/10",
      borderColor: "border-emerald-400/30",
    },
    {
      type: "group" as const,
      icon: Handshake,
      title: "グループ",
      description: "複数の友だちやAIとグループチャット",
      color: "from-purple-400 to-pink-500",
      bgColor: "from-purple-500/10 to-pink-500/10",
      borderColor: "border-purple-400/30",
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
            <GroupCreationPanel onBack={() => setCurrentSelectedType(null)} />
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
            <div className="flex overflow-y-auto flex-1 justify-center items-start p-6 pb-8">
              <div className="space-y-4 w-full">
                {addTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.type}
                      onClick={() => setCurrentSelectedType(type.type)}
                      className={cn(
                        "p-6 w-full bg-white rounded-2xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700",
                        "transition-all duration-200 group animate-fadeIn",
                        "hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md"
                      )}
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg",
                            "group-hover:shadow-xl transition-shadow",
                            `bg-gradient-to-br ${type.color}`
                          )}
                        >
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
                            {type.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                            {type.description}
                          </p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400 transition-colors group-hover:text-green-500" />
                      </div>
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
        <div className="flex flex-1 justify-center items-start p-6">
          <div className="space-y-4 w-full">
            {addTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = currentSelectedType === type.type;
              return (
                <button
                  key={type.type}
                  onClick={() => setCurrentSelectedType(type.type)}
                  className={cn(
                    "p-4 text-left bg-white rounded-xl border transition-all duration-200 dark:bg-gray-800 animate-fadeIn",
                    isSelected
                      ? `bg-green-50 border-green-400 shadow-md dark:bg-green-500/10`
                      : `border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md`
                  )}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg",
                        "transition-shadow",
                        `bg-gradient-to-br ${type.color}`
                      )}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
                        {type.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                        {type.description}
                      </p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-400 transition-colors hover:text-green-500" />
                  </div>
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
}: {
  selectedType: AddType;
}) {
  console.log("🔍 AddFriendsRightPanel selectedType:", selectedType);

  if (selectedType === "ai") {
    return <AIAgentCreationPanel onBack={() => {}} isDesktop />;
  }

  if (selectedType === "group") {
    return <GroupCreationPanel onBack={() => {}} isDesktop />;
  }

  if (selectedType === "user") {
    return <UserFriendAddPanel onBack={() => {}} isDesktop />;
  }

  return (
    <>
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-500 rounded-full">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">
              友だち追加
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              左側から追加したい種類を選択してください
            </p>
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="flex justify-center items-center mx-auto mb-4 w-24 h-24 bg-gray-100 rounded-full dark:bg-gray-900">
            <UserPlus className="w-12 h-12 text-green-500" />
          </div>
          <h3 className="mb-2 text-xl font-medium text-gray-900 dark:text-white">
            友だちを追加
          </h3>
          <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
            左側からユーザーまたはAIエージェントを選択して、
            <br />
            新しい友だちを追加しましょう。
          </p>
          <div className="flex justify-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <User className="w-4 h-4" />
              <span>ユーザー</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Bot className="w-4 h-4" />
              <span>AIエージェント</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Handshake className="w-4 h-4" />
              <span>グループ</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface AIAgentCreationPanelProps {
  onBack: () => void;
  isDesktop?: boolean;
}

function AIAgentCreationPanel({
  onBack,
  isDesktop = false,
}: AIAgentCreationPanelProps) {
  const [formData, setFormData] = useState({
    name: "",
    personality: "",
    model: "gpt-4o",
    description: "",
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 401エラー時に自動リフレッシュ
  const createAgentWithAuth = useServerActionWithAuth(createAgent);

  const personalities = [
    {
      id: "assistant",
      name: "アシスタント",
      icon: Brain,
      color: "from-blue-400 to-blue-600",
      description: "親切で丁寧なアシスタント",
    },
    {
      id: "creative",
      name: "クリエイティブ",
      icon: Sparkles,
      color: "from-purple-400 to-pink-600",
      description: "創造的で発想豊かな対話",
    },
    {
      id: "analytical",
      name: "アナリティカル",
      icon: LineChart,
      color: "from-green-400 to-teal-600",
      description: "論理的で分析的な対話",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        console.log("[SUBMIT] Creating agent with data:", {
          name: formData.name,
          persona_type: formData.personality,
          model: formData.model,
        });

        // Server Actionを呼び出す（401エラー時に自動リフレッシュ）
        const result = await createAgentWithAuth({
          name: formData.name,
          persona_type: formData.personality,
          model: formData.model,
          description: formData.description || undefined,
        });

        console.log("[SUBMIT] Result from createAgent:", result);

        if (!result) {
          throw new Error("Server Actionから応答がありません");
        }

        if (!result.success) {
          throw new Error(result.error || "Failed to create agent");
        }

        console.log("AI Agent created:", result.data);

        // 成功メッセージ表示
        alert("AI Agentを作成しました！");

        // フォームをリセット
        setFormData({
          name: "",
          personality: "",
          model: "gpt-4o",
          description: "",
        });

        if (!isDesktop) {
          onBack();
        }
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
      <div className="p-6 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {!isDesktop && (
            <button
              onClick={onBack}
              className="p-2 text-gray-400 rounded-lg transition-all duration-300 dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div className="flex items-center space-x-3">
            <div className="flex justify-center items-center w-10 h-10 bg-green-500 rounded-xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                AIエージェント作成
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                あなた専用のAIエージェントを作成しましょう
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* フォーム */}
      <div className="overflow-y-auto flex-1 p-6">
        <form onSubmit={handleSubmit} className="mx-auto space-y-6 max-w-2xl">
          {/* 名前入力 */}
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <label className="block mb-3 text-sm font-medium text-gray-900 dark:text-white">
              エージェント名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例: マイアシスタント"
              className={cn(
                "px-4 py-3 w-full bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600",
                "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                "placeholder-gray-500 text-gray-900 transition-all duration-300 dark:text-white dark:placeholder-gray-400"
              )}
              required
            />
          </div>

          {/* パーソナリティ選択 */}
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <label className="block mb-4 text-sm font-medium text-gray-900 dark:text-white">
              パーソナリティ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {personalities.map((personality) => {
                const Icon = personality.icon;
                const isSelected = formData.personality === personality.id;
                return (
                  <button
                    key={personality.id}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, personality: personality.id })
                    }
                    className={cn(
                      "p-5 text-left bg-gray-50 rounded-xl border-2 transition-all duration-300 dark:bg-gray-700",
                      isSelected
                        ? "bg-green-50 border-green-500 shadow-md dark:bg-green-500/10"
                        : "border-gray-200 dark:border-gray-600 hover:border-green-400 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm",
                          `bg-gradient-to-br ${personality.color}`
                        )}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {personality.name}
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                          {personality.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 説明入力 */}
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <label className="block mb-3 text-sm font-medium text-gray-900 dark:text-white">
              説明（オプション）
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="このAIエージェントの特徴や役割を説明してください..."
              rows={4}
              className={cn(
                "px-4 py-3 w-full bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600",
                "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                "placeholder-gray-500 text-gray-900 transition-all duration-300 resize-none dark:text-white dark:placeholder-gray-400"
              )}
            />
          </div>

          {/* モデル選択 */}
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <label className="block mb-3 text-sm font-medium text-gray-900 dark:text-white">
              モデル <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.model}
              onChange={(e) =>
                setFormData({ ...formData, model: e.target.value })
              }
              className={cn(
                "px-4 py-3 w-full bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600",
                "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                "text-gray-900 transition-all duration-300 dark:text-white"
              )}
              required
            >
              <optgroup label="OpenAI">
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
              </optgroup>
              <optgroup label="Anthropic">
                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              </optgroup>
              <optgroup label="Google">
                <option value="gemini-pro">Gemini Pro</option>
              </optgroup>
            </select>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* 作成ボタン */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {!isDesktop && (
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-6 py-3 font-medium text-gray-700 bg-gray-200 rounded-lg transition-all duration-300 dark:bg-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                キャンセル
              </button>
            )}
            <button
              type="submit"
              disabled={
                !formData.name ||
                !formData.personality ||
                !formData.model ||
                isPending
              }
              className={cn(
                "flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-300",
                "flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl",
                "transform hover:scale-[1.02] disabled:transform-none",
                "bg-green-500 hover:bg-green-600",
                "disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white",
                "disabled:cursor-not-allowed"
              )}
            >
              <Plus className="w-5 h-5" />
              <span>
                {isPending ? "AI Agentを作成中..." : "AIエージェントを作成"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface UserFriendAddPanelProps {
  onBack: () => void;
  isDesktop?: boolean;
}

function UserFriendAddPanel({
  onBack,
  isDesktop = false,
}: UserFriendAddPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const addMethods = [
    {
      icon: Search,
      title: "ユーザー名で検索",
      description: "ユーザー名やIDで友だちを検索して追加",
      color: "from-blue-400 to-blue-600",
      bgColor: "from-blue-500/10 to-blue-600/10",
      borderColor: "border-blue-400/30",
    },
    {
      icon: QrCode,
      title: "QRコードスキャン",
      description: "QRコードをスキャンして友だち追加",
      color: "from-emerald-400 to-emerald-600",
      bgColor: "from-emerald-500/10 to-emerald-600/10",
      borderColor: "border-emerald-400/30",
    },
    {
      icon: Users,
      title: "連絡先から招待",
      description: "連絡先の友だちをアプリに招待",
      color: "from-purple-400 to-purple-600",
      bgColor: "from-purple-500/10 to-purple-600/10",
      borderColor: "border-purple-400/30",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="p-6 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {!isDesktop && (
            <button
              onClick={onBack}
              className="p-2 text-gray-400 rounded-lg transition-all duration-300 dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div className="flex items-center space-x-3">
            <div className="flex justify-center items-center w-10 h-10 bg-green-500 rounded-xl">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                ユーザー追加
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                新しいユーザーを追加しましょう
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="overflow-y-auto flex-1 p-6">
        <div className="mx-auto space-y-6 max-w-2xl">
          {/* 検索バー */}
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center mb-4 space-x-3">
              <Search className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                ユーザー名で検索
              </h3>
            </div>
            <div className="flex space-x-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ユーザー名を入力..."
                className={cn(
                  "flex-1 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600",
                  "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                  "placeholder-gray-500 text-gray-900 transition-all duration-300 dark:text-white dark:placeholder-gray-400"
                )}
              />
              <button
                className={cn(
                  "px-6 py-3 rounded-lg font-medium transition-all duration-300",
                  "bg-green-500 hover:bg-green-600",
                  "text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                )}
              >
                検索
              </button>
            </div>
            {searchQuery && (
              <div className="p-4 mt-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                  「{searchQuery}」の検索結果はありません
                </p>
              </div>
            )}
          </div>

          {/* 追加方法 */}
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              その他の追加方法
            </h3>
            <div className="space-y-4">
              {addMethods.map((method, index) => {
                const Icon = method.icon;
                return (
                  <button
                    key={index}
                    onClick={() => console.log(`${method.title}を実行`)}
                    className={cn(
                      "w-full flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border",
                      "transition-all duration-300 text-left transform hover:scale-[1.01]",
                      "border-gray-200 dark:border-gray-600 hover:border-green-400 hover:shadow-md"
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                        `bg-gradient-to-br ${method.color}`
                      )}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {method.title}
                      </h4>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                        {method.description}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 招待セクション */}
          <div
            className={cn(
              "p-6 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700"
            )}
          >
            <div className="flex items-center mb-3 space-x-3">
              <Sparkles className="w-5 h-5 text-green-500" />
              <h3 className="font-medium text-gray-900 dark:text-white">
                ユーザーを招待
              </h3>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              招待リンクを送ってユーザーをアプリに招待しましょう。
              <br />
              招待されたユーザーは簡単にアプリに参加できます。
            </p>
            <button
              className={cn(
                "w-full px-4 py-3 rounded-lg font-medium transition-all duration-300",
                "bg-green-500 hover:bg-green-600",
                "text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
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

interface GroupCreationPanelProps {
  onBack: () => void;
  isDesktop?: boolean;
}

function GroupCreationPanel({
  onBack,
  isDesktop = false,
}: GroupCreationPanelProps) {
  const { user } = useDashboard();
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
        if (user.id === "guest-user-id") {
          setFriends(getAllSampleFriends());
        } else {
          setFriends([]);
        }
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
    console.log("グループ作成:", {
      ...formData,
      selectedMembers: Array.from(selectedMembers),
      memberCount: selectedMembers.size + 1, // +1 for the creator
    });
    // TODO: グループ作成処理
    if (!isDesktop) {
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="p-6 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {!isDesktop && (
            <button
              onClick={onBack}
              className="p-2 text-gray-400 rounded-lg transition-all duration-300 dark:text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div className="flex items-center space-x-3">
            <div className="flex justify-center items-center w-10 h-10 bg-green-500 rounded-xl">
              <Handshake className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                グループ作成
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                新しいグループを作成しましょう
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* フォーム */}
      <div className="overflow-y-auto flex-1 p-6">
        <form onSubmit={handleSubmit} className="mx-auto space-y-6 max-w-2xl">
          {/* グループ名入力 */}
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <label className="block mb-3 text-sm font-medium text-gray-900 dark:text-white">
              グループ名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例: プロジェクトチーム"
              className={cn(
                "px-4 py-3 w-full bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600",
                "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                "placeholder-gray-500 text-gray-900 transition-all duration-300 dark:text-white dark:placeholder-gray-400"
              )}
              required
            />
          </div>

          {/* 説明入力 */}
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <label className="block mb-3 text-sm font-medium text-gray-900 dark:text-white">
              説明（オプション）
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="このグループの目的や説明を入力してください..."
              rows={4}
              className={cn(
                "px-4 py-3 w-full bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600",
                "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                "placeholder-gray-500 text-gray-900 transition-all duration-300 resize-none dark:text-white dark:placeholder-gray-400"
              )}
            />
          </div>

          {/* メンバー選択 */}
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                メンバーを選択
              </label>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                あなた + {selectedMembers.size}人 = {selectedMembers.size + 1}
                人のグループ
              </span>
            </div>

            {isLoadingFriends ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-6 h-6 rounded-full border-b-2 border-purple-400 animate-spin"></div>
              </div>
            ) : friends.length === 0 ? (
              <div className="py-8 text-center">
                <div className="flex justify-center items-center mx-auto mb-3 w-12 h-12 bg-gray-100 rounded-full dark:bg-gray-700">
                  <Users className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  友だちがいません。
                  <br />
                  先に友だちを追加してからグループを作成してください。
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
                        "flex items-center p-3 space-x-3 w-full bg-gray-50 rounded-lg border-2 dark:bg-gray-700",
                        "text-left transition-all duration-300",
                        isSelected
                          ? "bg-green-50 border-green-500 shadow-md dark:bg-green-500/10"
                          : "border-gray-200 dark:border-gray-600 hover:border-green-400 hover:shadow-sm"
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
          <div className="flex flex-col gap-3 sm:flex-row">
            {!isDesktop && (
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-6 py-3 font-medium text-gray-700 bg-gray-200 rounded-lg transition-all duration-300 dark:bg-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                キャンセル
              </button>
            )}
            <button
              type="submit"
              disabled={!formData.name || selectedMembers.size === 0}
              className={cn(
                "flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-300",
                "flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl",
                "transform hover:scale-[1.02] disabled:transform-none",
                "bg-green-500 hover:bg-green-600",
                "disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white",
                "disabled:cursor-not-allowed"
              )}
            >
              <Plus className="w-5 h-5" />
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
