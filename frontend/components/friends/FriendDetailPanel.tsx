"use client";

import {
  MessageCircle,
  Phone,
  Video,
  Settings,
  Calendar,
  Bot,
  User,
  Loader2,
  AlertCircle,
  Code,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAgent, getAgentServices } from "@/lib/actions/ai-agent";
import { listServices, getServiceTools } from "@/lib/actions/services";
import type { SelectedFriend } from "@/lib/types";
import type { AIAgent, AgentService } from "@/lib/types/ai-agent";
import type { Service, Tool } from "@/lib/types/service";
import { AgentSettingsModal } from "./AgentSettingsModal";
import { LoadingSpinner } from "../ui/feedback/LoadingSpinner";

interface FriendDetailPanelProps {
  friend: SelectedFriend;
}

interface ServiceWithTools {
  service: Service;
  tools: Tool[];
  agentService: AgentService;
}

/**
 * 友だち詳細パネル
 */
export function FriendDetailPanel({ friend }: FriendDetailPanelProps) {
  const router = useRouter();
  const [agent, setAgent] = useState<AIAgent | null>(null);
  const [services, setServices] = useState<ServiceWithTools[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      if (friend.type !== "ai") {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // エージェント詳細とサービス情報を並行取得
        const [agentResult, servicesResult] = await Promise.all([
          getAgent(friend.id),
          getAgentServices(friend.id),
        ]);

        if (!agentResult.success) {
          setError(agentResult.error);
          return;
        }

        setAgent(agentResult.data);

        if (
          servicesResult.success &&
          servicesResult.data?.services &&
          servicesResult.data.services.length > 0
        ) {
          // 全サービス一覧を取得
          const allServices = await listServices();

          const servicesWithTools = await Promise.all(
            servicesResult.data.services
              .filter((agentService) => agentService.enabled)
              .map(async (agentService) => {
                const service = allServices.find(
                  (s) => s.class_name === agentService.service_class
                );
                if (!service) return null;

                const tools = await getServiceTools(agentService.service_class);

                let displayTools = tools;
                if (agentService.tool_selection_mode === "selected") {
                  displayTools = tools.filter((tool) =>
                    agentService.selected_tools.includes(tool.name)
                  );
                }

                return {
                  service,
                  tools: displayTools,
                  agentService,
                };
              })
          );

          setServices(servicesWithTools.filter(Boolean) as ServiceWithTools[]);
        }
      } catch (err) {
        console.error("Failed to fetch agent data:", err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [friend.id, friend.type]);

  const handleStartChat = () => {
    // グループの場合は会話開始できないようにするか、別の処理を行う
    if (friend.type === "group") return;

    // URLベースのナビゲーション（状態管理なし）
    router.push(`/dashboard/chats/${friend.id}`);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
  };

  const handleSettingsSave = () => {
    // データを再取得
    const fetchData = async () => {
      if (friend.type !== "ai") return;

      try {
        const [agentResult, servicesResult] = await Promise.all([
          getAgent(friend.id),
          getAgentServices(friend.id),
        ]);

        if (agentResult.success) {
          setAgent(agentResult.data);
        }

        if (
          servicesResult.success &&
          servicesResult.data?.services &&
          servicesResult.data.services.length > 0
        ) {
          const allServices = await listServices();

          const servicesWithTools = await Promise.all(
            servicesResult.data.services.map(async (agentService) => {
              const service = allServices.find(
                (s) => s.class_name === agentService.service_class
              );
              if (!service) return null;

              const tools = await getServiceTools(agentService.service_class);
              return {
                service,
                tools,
                agentService,
              };
            })
          );

          setServices(servicesWithTools.filter(Boolean) as ServiceWithTools[]);
        }
      } catch (err) {
        console.error("Failed to refresh data:", err);
      }
    };

    fetchData();
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

  // ローディング状態
  if (loading) {
    return <LoadingSpinner />;
  }

  // エラー状態
  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

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

            {/* アクションボタン */}
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={handleStartChat}
                className="flex justify-center items-center px-6 py-3 space-x-2 font-medium text-white bg-green-600 rounded-lg transition-all hover:bg-green-700"
              >
                <MessageCircle className="w-5 h-5" />
                <span>トークを開始</span>
              </button>
              {friend.type === "human" && (
                <>
                  <button className="flex justify-center items-center px-6 py-3 space-x-2 font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-all hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                    <Phone className="w-5 h-5" />
                    <span>音声通話</span>
                  </button>
                  <button className="flex justify-center items-center px-6 py-3 space-x-2 font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-all hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                    <Video className="w-5 h-5" />
                    <span>ビデオ通話</span>
                  </button>
                </>
              )}
              <button
                onClick={handleSettingsClick}
                className="flex justify-center items-center px-6 py-3 space-x-2 font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-all hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
              >
                <Settings className="w-5 h-5" />
                <span>設定</span>
              </button>
            </div>

            {/* 説明 */}
            {(agent?.description || friend.description) && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  説明
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {agent?.description || friend.description}
                </p>
              </div>
            )}

            {/* LLM設定 */}
            {agent && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    プロバイダー:
                  </span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {agent.provider}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    モデル:
                  </span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {agent.model}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    温度:
                  </span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {agent.temperature}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    最大トークン:
                  </span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {agent.max_tokens}
                  </span>
                </div>
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

          {/* システムプロンプト */}
          {agent?.system_prompt && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  システムプロンプト
                </h2>
              </div>
              <div className="p-4 bg-gray-100 rounded-lg dark:bg-gray-800">
                <div className="flex items-center mb-2 space-x-2">
                  <Code className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    カスタムプロンプト
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap dark:text-gray-400">
                  {agent.system_prompt}
                </p>
              </div>
            </div>
          )}

          {/* 連携サービス */}
          {services.length > 0 && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  連携サービス
                </h2>
              </div>
              <div className="space-y-4">
                {services.map((serviceWithTools) => (
                  <div
                    key={serviceWithTools.agentService.id}
                    className="p-4 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex justify-center items-center w-10 h-10 bg-gray-100 rounded-lg dark:bg-gray-800">
                          <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {serviceWithTools.service.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {serviceWithTools.service.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            serviceWithTools.agentService.enabled
                              ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400"
                          }`}
                        >
                          {serviceWithTools.agentService.enabled
                            ? "有効"
                            : "無効"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          ツール設定
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            serviceWithTools.agentService
                              .tool_selection_mode === "all"
                              ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400"
                          }`}
                        >
                          {serviceWithTools.agentService.tool_selection_mode ===
                          "all"
                            ? "全ツール利用"
                            : "個別選択"}
                        </span>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          利用可能なツール ({serviceWithTools.tools.length}個):
                        </p>
                        {serviceWithTools.tools.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {serviceWithTools.tools.map((tool) => (
                              <span
                                key={tool.name}
                                className="px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded dark:bg-gray-700 dark:text-gray-300"
                              >
                                {tool.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            利用可能なツールがありません
                          </p>
                        )}
                      </div>

                      {serviceWithTools.agentService.tool_selection_mode ===
                        "selected" && (
                        <div className="p-3 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            <strong>個別選択モード:</strong>{" "}
                            上記のツールの中から選択されたツールのみが利用されます
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 設定モーダル */}
      <AgentSettingsModal
        agent={agent}
        isOpen={showSettings}
        onClose={handleSettingsClose}
        onSave={handleSettingsSave}
      />
    </>
  );
}
