"use client";

import {
  X,
  Save,
  User,
  Bot,
  Settings,
  Wrench,
  Code,
  Loader2,
  AlertCircle,
  Check,
  Server,
  CheckSquare,
  Square,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import {
  updateAgent,
  getAgentServices,
  addAgentService,
  updateAgentService,
  deleteAgentService,
} from "@/lib/actions/ai-agent";
import {
  listServices,
  getServiceTools,
  getUserServicesWithDetails,
} from "@/lib/actions/services";
import type {
  AIAgent,
  UpdateAgentInput,
  AgentService,
  CreateAIAgentServiceInput,
  UpdateAIAgentServiceInput,
} from "@/lib/types/ai-agent";
import type { UserServiceWithDetails } from "@/lib/types/service";
import { cn } from "@/lib/utils/cn";

interface AgentSettingsModalProps {
  agent: AIAgent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

type TabType = "basic" | "personality" | "llm" | "services";

export function AgentSettingsModal({
  agent,
  isOpen,
  onClose,
  onSave,
}: AgentSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState<UpdateAgentInput>({});
  const [agentServices, setAgentServices] = useState<AgentService[]>([]);
  const [userServices, setUserServices] = useState<UserServiceWithDetails[]>(
    []
  );
  const [expandedServices, setExpandedServices] = useState<Set<string>>(
    new Set()
  );

  // タブの定義
  const tabs = [
    { id: "basic" as TabType, name: "基本情報", icon: User },
    { id: "personality" as TabType, name: "パーソナリティ", icon: Bot },
    { id: "llm" as TabType, name: "LLM設定", icon: Settings },
    { id: "services" as TabType, name: "サービス", icon: Wrench },
  ];

  // 初期化
  useEffect(() => {
    if (isOpen && agent) {
      setFormData({
        name: agent.name,
        description: agent.description,
        avatar_url: agent.avatar_url,
        persona_type: agent.persona_type,
        provider: agent.provider,
        model: agent.model,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
        system_prompt: agent.system_prompt,
        tools_enabled: agent.tools_enabled,
        streaming_enabled: agent.streaming_enabled ?? true,
      });
      loadData();
    }
  }, [isOpen, agent]);

  // 背景スクロールをロック
  useBodyScrollLock(isOpen);

  const loadData = async () => {
    if (!agent) return;

    try {
      setError(null);

      // エージェントのサービス一覧とユーザーのサービス一覧を並行取得
      const [servicesResult, userServicesResult] = await Promise.all([
        getAgentServices(agent.id),
        getUserServicesWithDetails(),
      ]);

      if (servicesResult.success && servicesResult.data?.services) {
        setAgentServices(servicesResult.data.services);
      }

      if (userServicesResult) {
        setUserServices(userServicesResult);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("データの読み込みに失敗しました");
    }
  };

  const handleInputChange = (field: keyof UpdateAgentInput, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleServiceToggle = async (serviceId: string, enabled: boolean) => {
    if (!agent) return;

    try {
      const agentService = agentServices.find((s) => s.id === serviceId);
      if (!agentService) return;

      const result = await updateAgentService(agent.id, serviceId, { enabled });
      if (result.success) {
        setAgentServices((prev) =>
          prev.map((s) => (s.id === serviceId ? { ...s, enabled } : s))
        );
      }
    } catch (err) {
      console.error("Failed to toggle service:", err);
    }
  };

  const handleServiceToolModeChange = async (
    serviceId: string,
    mode: "all" | "selected"
  ) => {
    if (!agent) return;

    try {
      const result = await updateAgentService(agent.id, serviceId, {
        tool_selection_mode: mode,
        selected_tools: mode === "all" ? [] : [],
      });
      if (result.success) {
        setAgentServices((prev) =>
          prev.map((s) =>
            s.id === serviceId
              ? { ...s, tool_selection_mode: mode, selected_tools: [] }
              : s
          )
        );
      }
    } catch (err) {
      console.error("Failed to update service tool mode:", err);
    }
  };

  const handleServiceToolSelection = async (
    serviceId: string,
    selectedTools: string[]
  ) => {
    if (!agent) return;

    try {
      const result = await updateAgentService(agent.id, serviceId, {
        selected_tools: selectedTools,
      });
      if (result.success) {
        setAgentServices((prev) =>
          prev.map((s) =>
            s.id === serviceId ? { ...s, selected_tools: selectedTools } : s
          )
        );
      }
    } catch (err) {
      console.error("Failed to update service tool selection:", err);
    }
  };

  const toggleExpand = (serviceClass: string) => {
    setExpandedServices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serviceClass)) {
        newSet.delete(serviceClass);
      } else {
        newSet.add(serviceClass);
      }
      return newSet;
    });
  };

  const handleAddService = async (serviceClass: string) => {
    if (!agent) return;

    try {
      const result = await addAgentService(agent.id, {
        service_class: serviceClass,
        tool_selection_mode: "all",
        enabled: true,
      });
      if (result.success) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to add service:", err);
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    if (!agent) return;

    try {
      const result = await deleteAgentService(agent.id, serviceId);
      if (result.success) {
        setAgentServices((prev) => prev.filter((s) => s.id !== serviceId));
      }
    } catch (err) {
      console.error("Failed to remove service:", err);
    }
  };

  const handleSave = async () => {
    if (!agent) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await updateAgent(agent.id, formData);
      if (result.success) {
        onSave();
        onClose();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to save agent:", err);
      setError("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !agent) return null;

  return (
    <div
      className="flex fixed inset-0 z-50 justify-center items-center p-2 backdrop-blur-md md:p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-4xl h-[95vh] md:h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 md:p-6 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 md:text-xl dark:text-white">
            エージェント設定
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
          {loading && (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          )}

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
            <div className="space-y-4 md:space-y-6">
              <div>
                <label className="block mb-1.5 md:mb-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                  名前
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block mb-1.5 md:mb-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                  説明
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
          )}

          {/* パーソナリティタブ */}
          {activeTab === "personality" && (
            <div className="space-y-4 md:space-y-6">
              <div>
                <label className="block mb-1.5 md:mb-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                  パーソナリティタイプ
                </label>
                <select
                  value={formData.persona_type || ""}
                  onChange={(e) =>
                    handleInputChange("persona_type", e.target.value)
                  }
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="assistant">アシスタント</option>
                  <option value="creative">クリエイティブ</option>
                  <option value="analytical">アナリティカル</option>
                </select>
              </div>

              <div>
                <label className="block mb-1.5 md:mb-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                  カスタム指示
                </label>
                <textarea
                  value={formData.system_prompt || ""}
                  onChange={(e) =>
                    handleInputChange("system_prompt", e.target.value)
                  }
                  rows={6}
                  placeholder="エージェントの振る舞いや徳等を具体的に指示"
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all placeholder-gray-500 dark:placeholder-gray-400 font-mono"
                />
              </div>
            </div>
          )}

          {/* LLM設定タブ */}
          {activeTab === "llm" && (
            <div className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="block mb-1.5 md:mb-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                    プロバイダー
                  </label>
                  <select
                    value={formData.provider || ""}
                    onChange={(e) =>
                      handleInputChange("provider", e.target.value)
                    }
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic" disabled>
                      Anthropic（近日追加予定）
                    </option>
                    <option value="google" disabled>
                      Google（近日追加予定）
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 md:mb-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                    モデル
                  </label>
                  <input
                    type="text"
                    value={formData.model || ""}
                    onChange={(e) => handleInputChange("model", e.target.value)}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 md:mb-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                  創造性: {formData.temperature || 0.7}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature || 0.7}
                  onChange={(e) =>
                    handleInputChange("temperature", parseFloat(e.target.value))
                  }
                  className="w-full accent-green-500"
                />
              </div>

              <div>
                <label className="block mb-1.5 md:mb-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                  最大トークン数
                </label>
                <input
                  type="number"
                  min="100"
                  max="8000"
                  value={formData.max_tokens || 2000}
                  onChange={(e) =>
                    handleInputChange("max_tokens", parseInt(e.target.value))
                  }
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-medium text-gray-700 md:text-sm dark:text-gray-300">
                    ストリーミング
                  </h3>
                  <p className="text-xs text-gray-500 md:text-sm dark:text-gray-400">
                    リアルタイムレスポンスの有効化
                  </p>
                </div>
                <label className="inline-flex relative items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.streaming_enabled ?? true}
                    onChange={(e) =>
                      handleInputChange("streaming_enabled", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* サービスタブ */}
          {activeTab === "services" && (
            <div className="space-y-4 md:space-y-6">
              <div>
                <h3 className="mb-3 text-base font-medium text-gray-900 md:mb-4 md:text-lg dark:text-white">
                  連携サービス
                </h3>

                {userServices.length > 0 ? (
                  <div className="space-y-3">
                    {userServices
                      .sort((a, b) => {
                        // エージェントに登録済みのサービスを先に表示
                        const aIsRegistered = agentServices.some(
                          (as) => as.service_class === a.service.class_name
                        );
                        const bIsRegistered = agentServices.some(
                          (as) => as.service_class === b.service.class_name
                        );
                        if (aIsRegistered && !bIsRegistered) return -1;
                        if (!aIsRegistered && bIsRegistered) return 1;
                        return 0;
                      })
                      .map((userService) => {
                        const agentService = agentServices.find(
                          (as) =>
                            as.service_class === userService.service.class_name
                        );
                        const isRegistered = !!agentService;
                        const isSelected =
                          isRegistered && agentService?.enabled;
                        const isExpanded = expandedServices.has(
                          userService.service.class_name
                        );

                        return (
                          <div
                            key={userService.service.class_name}
                            className={cn(
                              "rounded-xl border",
                              isSelected
                                ? "bg-green-50 border-green-500 dark:bg-green-900/20"
                                : "bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800"
                            )}
                          >
                            {/* サービス選択 */}
                            <div
                              className="flex gap-2 items-center p-3 cursor-pointer md:gap-3 md:p-4"
                              onClick={() => {
                                if (isRegistered) {
                                  // 既に登録済みの場合は有効/無効を切り替え
                                  handleServiceToggle(
                                    agentService!.id,
                                    !isSelected
                                  );
                                } else {
                                  // 未登録の場合は新規追加
                                  handleAddService(
                                    userService.service.class_name
                                  );
                                }
                              }}
                            >
                              {isSelected ? (
                                <CheckSquare className="flex-shrink-0 w-4 h-4 text-green-500 md:w-5 md:h-5" />
                              ) : (
                                <Square className="flex-shrink-0 w-4 h-4 text-gray-400 md:w-5 md:h-5" />
                              )}
                              <div
                                className={cn(
                                  "w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                  userService.service.type === "built_in"
                                    ? "bg-gradient-to-br from-blue-500 to-blue-600"
                                    : "bg-gradient-to-br from-green-500 to-green-600"
                                )}
                              >
                                <Server className="w-4 h-4 text-white md:w-5 md:h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex gap-1.5 md:gap-2 items-center">
                                  <h3 className="text-sm font-medium text-gray-900 truncate md:text-base dark:text-white">
                                    {userService.service.name}
                                  </h3>
                                  {!userService.config.is_enabled && (
                                    <span className="text-[10px] md:text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 md:px-2 py-0.5 rounded flex-shrink-0">
                                      無効
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 truncate md:text-sm dark:text-gray-400">
                                  {userService.service.description}
                                </p>
                              </div>

                              {/* 展開ボタン */}
                              {isSelected && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(
                                      userService.service.class_name
                                    );
                                  }}
                                  className="p-2 text-gray-400 rounded-full transition-colors md:p-3 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 md:w-5 md:h-5" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* ツール選択（選択されている場合のみ） */}
                            {isSelected && isExpanded && agentService && (
                              <div className="p-3 space-y-2 border-t border-gray-200 md:p-4 md:space-y-3 dark:border-gray-700">
                                {/* ツール選択モード */}
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-gray-700 md:text-sm dark:text-gray-300">
                                    ツール選択
                                  </span>
                                  <div className="flex gap-1.5 md:gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const allToolNames =
                                          userService.tools.map(
                                            (tool) => tool.name
                                          );
                                        handleServiceToolSelection(
                                          agentService.id,
                                          allToolNames
                                        );
                                        handleServiceToolModeChange(
                                          agentService.id,
                                          "all"
                                        );
                                      }}
                                      className={cn(
                                        "px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs rounded-lg transition-colors",
                                        agentService.tool_selection_mode ===
                                          "all"
                                          ? "bg-green-500 text-white"
                                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                      )}
                                    >
                                      全選択
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleServiceToolSelection(
                                          agentService.id,
                                          []
                                        );
                                        handleServiceToolModeChange(
                                          agentService.id,
                                          "selected"
                                        );
                                      }}
                                      className={cn(
                                        "px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs rounded-lg transition-colors",
                                        agentService.tool_selection_mode ===
                                          "selected" &&
                                          agentService.selected_tools.length ===
                                            0
                                          ? "bg-red-500 text-white"
                                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                      )}
                                    >
                                      全解除
                                    </button>
                                  </div>
                                </div>

                                {/* ツールリスト（常に表示） */}
                                <div className="grid grid-cols-1 gap-1.5 md:gap-2 md:grid-cols-2">
                                  {userService.tools.map((tool) => {
                                    const isToolSelected =
                                      agentService.tool_selection_mode ===
                                        "all" ||
                                      agentService.selected_tools.includes(
                                        tool.name
                                      );

                                    return (
                                      <button
                                        key={tool.name}
                                        type="button"
                                        onClick={() => {
                                          if (
                                            agentService.tool_selection_mode ===
                                            "all"
                                          ) {
                                            const newTools =
                                              agentService.selected_tools.filter(
                                                (t) => t !== tool.name
                                              );
                                            handleServiceToolSelection(
                                              agentService.id,
                                              newTools
                                            );
                                            handleServiceToolModeChange(
                                              agentService.id,
                                              "selected"
                                            );
                                          } else {
                                            const newTools = isToolSelected
                                              ? agentService.selected_tools.filter(
                                                  (t) => t !== tool.name
                                                )
                                              : [
                                                  ...agentService.selected_tools,
                                                  tool.name,
                                                ];
                                            handleServiceToolSelection(
                                              agentService.id,
                                              newTools
                                            );
                                          }
                                        }}
                                        className={cn(
                                          "flex gap-1.5 md:gap-2 items-center p-1.5 md:p-2 text-left rounded-lg transition-colors",
                                          isToolSelected
                                            ? "text-green-900 bg-green-100 dark:bg-green-900/30 dark:text-green-300"
                                            : "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        )}
                                      >
                                        {isToolSelected ? (
                                          <CheckSquare className="flex-shrink-0 w-3 h-3 md:w-4 md:h-4" />
                                        ) : (
                                          <Square className="flex-shrink-0 w-3 h-3 md:w-4 md:h-4" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-medium truncate md:text-sm">
                                            {tool.name}
                                          </div>
                                          {tool.description && (
                                            <div className="text-[10px] md:text-xs truncate opacity-75">
                                              {tool.description}
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-4 text-center rounded-lg border border-gray-300 border-dashed md:py-6 dark:border-gray-700">
                    <Server className="mx-auto mb-1.5 md:mb-2 w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                    <p className="text-xs text-gray-500 md:text-sm dark:text-gray-400">
                      利用可能なサービスがありません
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-end items-center p-4 space-x-2 border-t border-gray-200 md:p-6 md:space-x-3 dark:border-gray-700">
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
  );
}
