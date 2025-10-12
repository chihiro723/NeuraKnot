"use client";

/**
 * ツールセレクター
 * MCPサーバーのツールを選択するコンポーネント
 */

import { useState, useEffect } from "react";
import { Server, Check, ChevronDown, ChevronUp, Search } from "lucide-react";
import { listMCPTools } from "@/lib/actions/mcp-actions";
import type { MCPTool, ToolSelectionMode } from "@/lib/types/mcp";

interface ToolSelectorProps {
  serverId: string;
  serverName: string;
  mode: ToolSelectionMode;
  selectedToolIds: string[];
  onModeChange: (mode: ToolSelectionMode) => void;
  onToolsChange: (toolIds: string[]) => void;
}

export function ToolSelector({
  serverId,
  serverName,
  mode,
  selectedToolIds,
  onModeChange,
  onToolsChange,
}: ToolSelectorProps) {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTools();
  }, [serverId]);

  const fetchTools = async () => {
    setLoading(true);
    const result = await listMCPTools(serverId);
    if (result.success && result.tools) {
      setTools(result.tools);
    }
    setLoading(false);
  };

  // カテゴリ別にグループ化
  const groupedTools = tools.reduce((acc, tool) => {
    const category = tool.category || "その他";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, MCPTool[]>);

  // 検索フィルター
  const filteredTools = tools.filter(
    (tool) =>
      tool.tool_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tool.tool_description &&
        tool.tool_description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleToolToggle = (toolId: string) => {
    if (selectedToolIds.includes(toolId)) {
      onToolsChange(selectedToolIds.filter((id) => id !== toolId));
    } else {
      onToolsChange([...selectedToolIds, toolId]);
    }
  };

  const handleCategoryToggle = (category: string) => {
    const categoryTools = groupedTools[category];
    const categoryToolIds = categoryTools.map((t) => t.id);
    const allSelected = categoryToolIds.every((id) =>
      selectedToolIds.includes(id)
    );

    if (allSelected) {
      // すべて選択解除
      onToolsChange(
        selectedToolIds.filter((id) => !categoryToolIds.includes(id))
      );
    } else {
      // すべて選択
      const newSelection = [
        ...selectedToolIds,
        ...categoryToolIds.filter((id) => !selectedToolIds.includes(id)),
      ];
      onToolsChange(newSelection);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Server className="w-5 h-5 text-emerald-500" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {serverName}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {tools.length}個のツール
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* モード選択 */}
      <div className="p-4 space-y-3 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <input
            type="radio"
            id={`${serverId}-all`}
            checked={mode === "all"}
            onChange={() => onModeChange("all")}
            className="w-4 h-4"
          />
          <label
            htmlFor={`${serverId}-all`}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            全ツールを使用
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="radio"
            id={`${serverId}-selected`}
            checked={mode === "selected"}
            onChange={() => onModeChange("selected")}
            className="w-4 h-4"
          />
          <label
            htmlFor={`${serverId}-selected`}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            特定のツールのみ使用
            {mode === "selected" && selectedToolIds.length > 0 && (
              <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                ({selectedToolIds.length}個選択中)
              </span>
            )}
          </label>
        </div>
      </div>

      {/* ツール一覧（個別選択モードの場合のみ） */}
      {mode === "selected" && expanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
              {/* 検索 */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ツールを検索..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
              </div>

              {/* カテゴリ別ツールリスト */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(groupedTools).map(
                  ([category, categoryTools]) => {
                    const allSelected = categoryTools.every((t) =>
                      selectedToolIds.includes(t.id)
                    );
                    const someSelected = categoryTools.some((t) =>
                      selectedToolIds.includes(t.id)
                    );

                    return (
                      <div key={category} className="space-y-2">
                        {/* カテゴリヘッダー */}
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {category}
                          </h5>
                          <button
                            onClick={() => handleCategoryToggle(category)}
                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            {allSelected ? "すべて解除" : "すべて選択"}
                          </button>
                        </div>

                        {/* ツールリスト */}
                        <div className="space-y-1">
                          {categoryTools
                            .filter(
                              (tool) =>
                                !searchQuery ||
                                tool.tool_name
                                  .toLowerCase()
                                  .includes(searchQuery.toLowerCase()) ||
                                (tool.tool_description &&
                                  tool.tool_description
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase()))
                            )
                            .map((tool) => (
                              <label
                                key={tool.id}
                                className="flex items-start space-x-2 p-2 rounded hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedToolIds.includes(tool.id)}
                                  onChange={() => handleToolToggle(tool.id)}
                                  className="mt-0.5 w-4 h-4 rounded border-gray-300"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {tool.tool_name}
                                  </div>
                                  {tool.tool_description && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                      {tool.tool_description}
                                    </div>
                                  )}
                                </div>
                              </label>
                            ))}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {filteredTools.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                  ツールが見つかりませんでした
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
