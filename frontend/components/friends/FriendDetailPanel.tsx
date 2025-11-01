"use client";

import {
  MessageCircle,
  Settings,
  Bot,
  User,
  AlertCircle,
  Code,
  Zap,
  ArrowLeft,
  Brain,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/lib/hooks/useResponsive";
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
 * 友だち詳細パネル - モダンUI
 */
export function FriendDetailPanel({ friend }: FriendDetailPanelProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
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

  const handleBack = () => {
    router.push("/dashboard/roster");
  };

  const handleStartChat = () => {
    if (friend.type === "group") return;
    router.push(`/dashboard/chats/${friend.id}`);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
  };

  const handleSettingsSave = () => {
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

  const getPersonaLabel = (personaType: string): string => {
    const personaMap: Record<string, string> = {
      assistant: "アシスタント",
      creative: "クリエイティブ",
      analytical: "アナリティカル",
      concise: "簡潔",
    };
    return personaMap[personaType.toLowerCase()] || personaType;
  };

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ヘッダー（モバイルで常時上部固定） */}
      <div className="flex sticky top-0 z-20 justify-between items-center px-4 h-14 bg-white/95 border-b border-gray-200 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:h-16 sm:px-6 dark:bg-gray-900/95 dark:border-gray-700">
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
                    {(agent?.avatar_url || friend.avatar_url) ? (
                      <img
                        src={agent?.avatar_url || friend.avatar_url}
                        alt={friend.name}
                        className="object-cover w-full h-full"
                        key={agent?.avatar_url || friend.avatar_url}
                      />
                    ) : friend.type === "ai" ? (
                      <Bot className="w-12 h-12 text-green-600 dark:text-green-400" />
                    ) : (
                      <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {friend.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  {friend.status === "online" && (
                    <div className="flex absolute -right-1 -bottom-1 justify-center items-center w-7 h-7 bg-green-500 rounded-full border-4 border-white shadow-lg dark:border-gray-900">
                      <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {friend.name}
                  </h1>
                  {agent?.persona_type && (
                    <div className="inline-flex items-center px-3 py-1 space-x-2 text-sm font-medium text-green-700 bg-green-100 rounded-full dark:text-green-300 dark:bg-green-900/30">
                      <Bot className="w-4 h-4" />
                      <span>{getPersonaLabel(agent.persona_type)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 説明 */}
              {agent?.description && (
                <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300">
                  {agent.description}
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
                  onClick={handleSettingsClick}
                  className="flex justify-center items-center px-6 py-3 space-x-2 font-medium text-gray-700 bg-white rounded-xl border border-gray-200 transition-all hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <Settings className="w-5 h-5" />
                  <span>設定</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI設定カード */}
          {agent && (
            <div className="p-6 space-y-4 bg-white rounded-2xl border shadow-lg border-gray-200/50 dark:bg-gray-800 dark:border-gray-700/50">
              <div className="flex items-center space-x-3">
                <div className="flex justify-center items-center w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl dark:from-purple-900/30 dark:to-blue-900/30">
                  <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  AI設定
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                    プロバイダー
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {agent.provider}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                    モデル
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {agent.model}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                    創造性
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {agent.temperature}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                    最大トークン
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {agent.max_tokens?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* システムプロンプトカード */}
          {agent?.system_prompt && (
            <div className="p-6 space-y-4 bg-white rounded-2xl border shadow-lg border-gray-200/50 dark:bg-gray-800 dark:border-gray-700/50">
              <div className="flex items-center space-x-3">
                <div className="flex justify-center items-center w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl dark:from-indigo-900/30 dark:to-purple-900/30">
                  <Code className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  カスタム指示
                </h3>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl dark:bg-gray-900/50">
                <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap dark:text-gray-300">
                  {agent.system_prompt}
                </p>
              </div>
            </div>
          )}

          {/* 連携サービスカード */}
          {services.length > 0 && (
            <div className="p-6 space-y-4 bg-white rounded-2xl border shadow-lg border-gray-200/50 dark:bg-gray-800 dark:border-gray-700/50">
              <div className="flex items-center space-x-3">
                <div className="flex justify-center items-center w-10 h-10 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl dark:from-yellow-900/30 dark:to-orange-900/30">
                  <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  連携サービス
                </h3>
              </div>

              <div className="space-y-3">
                {services.map((serviceWithTools) => (
                  <div
                    key={serviceWithTools.agentService.id}
                    className="p-4 bg-gray-50 rounded-xl dark:bg-gray-900/50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="mb-1 font-medium text-gray-900 dark:text-white">
                          {serviceWithTools.service.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {serviceWithTools.service.description}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:text-green-300 dark:bg-green-900/30">
                        {serviceWithTools.tools.length}個のツール
                      </span>
                    </div>

                    {serviceWithTools.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {serviceWithTools.tools.map((tool) => (
                          <span
                            key={tool.name}
                            className="px-2 py-1 text-xs text-gray-600 bg-white rounded-md dark:bg-gray-800 dark:text-gray-300"
                          >
                            {tool.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 友だちになった日 */}
          {friend.created_at && isClient && (
            <div className="flex justify-center items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>友だちになった日: {formatDate(friend.created_at)}</span>
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
