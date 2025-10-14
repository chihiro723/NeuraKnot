"use client";

import { useState, useEffect } from "react";
import {
  X,
  Server,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { UserServiceWithDetails, Tool } from "@/lib/types/service";

interface SelectedService {
  service_class: string;
  service_name: string;
  tool_selection_mode: "all" | "selected";
  selected_tools: string[];
  enabled: boolean;
}

interface ServiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userServices: UserServiceWithDetails[];
  onAddServices: (services: SelectedService[]) => void;
}

/**
 * サービス選択モーダル
 * エージェント作成時にサービスとツールを選択
 */
export function ServiceSelectorModal({
  isOpen,
  onClose,
  userServices,
  onAddServices,
}: ServiceSelectorModalProps) {
  const [expandedServices, setExpandedServices] = useState<Set<string>>(
    new Set()
  );
  const [selectedServices, setSelectedServices] = useState<
    Map<string, SelectedService>
  >(new Map());

  // モーダルが開いたときにリセット
  useEffect(() => {
    if (isOpen) {
      setExpandedServices(new Set());
      setSelectedServices(new Map());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleExpand = (serviceClass: string) => {
    const newExpanded = new Set(expandedServices);
    if (newExpanded.has(serviceClass)) {
      newExpanded.delete(serviceClass);
    } else {
      newExpanded.add(serviceClass);
    }
    setExpandedServices(newExpanded);
  };

  const toggleServiceSelection = (service: UserServiceWithDetails) => {
    const newSelected = new Map(selectedServices);
    if (newSelected.has(service.service.class_name)) {
      newSelected.delete(service.service.class_name);
    } else {
      newSelected.set(service.service.class_name, {
        service_class: service.service.class_name,
        service_name: service.service.name,
        tool_selection_mode: "all",
        selected_tools: [],
        enabled: true,
      });
    }
    setSelectedServices(newSelected);
  };

  const toggleToolSelection = (serviceClass: string, toolName: string) => {
    const newSelected = new Map(selectedServices);
    const service = newSelected.get(serviceClass);
    if (!service) return;

    if (service.tool_selection_mode === "all") {
      // 全ツールモードから個別選択モードに切り替え
      const userService = userServices.find(
        (s) => s.service.class_name === serviceClass
      );
      const allTools = userService?.tools.map((t) => t.name) || [];
      service.tool_selection_mode = "selected";
      service.selected_tools = allTools.filter((t) => t !== toolName);
    } else {
      // 個別選択モード
      if (service.selected_tools.includes(toolName)) {
        service.selected_tools = service.selected_tools.filter(
          (t) => t !== toolName
        );
      } else {
        service.selected_tools.push(toolName);
      }
    }

    newSelected.set(serviceClass, service);
    setSelectedServices(newSelected);
  };

  const selectAllTools = (serviceClass: string) => {
    const newSelected = new Map(selectedServices);
    const service = newSelected.get(serviceClass);
    if (!service) return;

    service.tool_selection_mode = "all";
    service.selected_tools = [];

    newSelected.set(serviceClass, service);
    setSelectedServices(newSelected);
  };

  const deselectAllTools = (serviceClass: string) => {
    const newSelected = new Map(selectedServices);
    const service = newSelected.get(serviceClass);
    if (!service) return;

    service.tool_selection_mode = "selected";
    service.selected_tools = [];

    newSelected.set(serviceClass, service);
    setSelectedServices(newSelected);
  };

  const handleAdd = () => {
    const services = Array.from(selectedServices.values());
    onAddServices(services);
    onClose();
  };

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center p-4 backdrop-blur-sm bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            サービスを選択
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 rounded-lg transition-colors hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* サービスリスト */}
        <div className="overflow-y-auto flex-1 p-6 space-y-3">
          {userServices.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto mb-3 w-12 h-12 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">
                登録されているサービスがありません
              </p>
            </div>
          ) : (
            userServices.map((userService) => {
              const isSelected = selectedServices.has(
                userService.service.class_name
              );
              const isDisabled = !userService.config.is_enabled;
              const selectedService = selectedServices.get(
                userService.service.class_name
              );
              const isExpanded = expandedServices.has(
                userService.service.class_name
              );

              return (
                <div
                  key={userService.service.class_name}
                  className={cn(
                    "border rounded-xl transition-all",
                    isSelected
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50",
                    isDisabled && "opacity-60"
                  )}
                >
                  {/* サービス選択 */}
                  <div className="flex gap-3 items-center p-4">
                    <button
                      type="button"
                      onClick={() => toggleServiceSelection(userService)}
                      disabled={isDisabled}
                      className={cn(
                        "flex items-center gap-3 flex-1 text-left",
                        !isDisabled && "cursor-pointer"
                      )}
                    >
                      {isSelected ? (
                        <CheckSquare className="flex-shrink-0 w-5 h-5 text-green-500" />
                      ) : (
                        <Square className="flex-shrink-0 w-5 h-5 text-gray-400" />
                      )}
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          userService.service.type === "built_in"
                            ? "bg-gradient-to-br from-blue-500 to-blue-600"
                            : "bg-gradient-to-br from-green-500 to-green-600"
                        )}
                      >
                        <Server className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-2 items-center">
                          <h3 className="font-medium text-gray-900 truncate dark:text-white">
                            {userService.service.name}
                          </h3>
                          {isDisabled && (
                            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                              無効
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                          {userService.service.description}
                        </p>
                      </div>
                    </button>

                    {/* 展開ボタン */}
                    {isSelected && (
                      <button
                        type="button"
                        onClick={() =>
                          toggleExpand(userService.service.class_name)
                        }
                        className="p-2 text-gray-400 rounded-lg transition-colors hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* ツール選択（選択されている場合のみ） */}
                  {isSelected && isExpanded && selectedService && (
                    <div className="p-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                      {/* ツール選択モード */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          ツール選択
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              selectAllTools(userService.service.class_name)
                            }
                            className={cn(
                              "px-3 py-1 text-xs rounded-lg transition-colors",
                              selectedService.tool_selection_mode === "all"
                                ? "bg-green-500 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                            )}
                          >
                            全選択
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              deselectAllTools(userService.service.class_name)
                            }
                            className={cn(
                              "px-3 py-1 text-xs rounded-lg transition-colors",
                              selectedService.tool_selection_mode ===
                                "selected" &&
                                selectedService.selected_tools.length === 0
                                ? "bg-red-500 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                            )}
                          >
                            全解除
                          </button>
                        </div>
                      </div>

                      {/* ツールリスト */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {userService.tools.map((tool) => {
                          const isToolSelected =
                            selectedService.tool_selection_mode === "all" ||
                            selectedService.selected_tools.includes(tool.name);

                          return (
                            <button
                              key={tool.name}
                              type="button"
                              onClick={() =>
                                toggleToolSelection(
                                  userService.service.class_name,
                                  tool.name
                                )
                              }
                              className={cn(
                                "flex gap-2 items-center p-2 text-left rounded-lg transition-colors",
                                isToolSelected
                                  ? "text-green-900 bg-green-100 dark:bg-green-900/30 dark:text-green-300"
                                  : "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                              )}
                            >
                              {isToolSelected ? (
                                <CheckSquare className="flex-shrink-0 w-4 h-4" />
                              ) : (
                                <Square className="flex-shrink-0 w-4 h-4" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {tool.name}
                                </div>
                                {tool.description && (
                                  <div className="text-xs truncate opacity-75">
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
            })
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedServices.size}件選択中
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-colors dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedServices.size === 0}
              className={cn(
                "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors",
                selectedServices.size > 0
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
              )}
            >
              追加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
