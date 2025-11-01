"use client";

import type { AgentPerformance } from "@/lib/types/analytics";
import { Bot } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CustomTooltip } from "./CustomTooltip";

interface AgentPerformanceSectionProps {
  agents: AgentPerformance[];
}

/**
 * AIエージェント別パフォーマンスセクション
 */
export function AgentPerformanceSection({
  agents,
}: AgentPerformanceSectionProps) {
  // 全エージェント
  const allAgents = agents;

  // メッセージ数ランキングデータ
  const messageData = allAgents.map((agent) => ({
    name: agent.agent_name,
    メッセージ数: agent.message_count,
  }));

  // トークン使用量ランキングデータ
  const tokenData = allAgents.map((agent) => ({
    name: agent.agent_name,
    トークン数: agent.total_tokens,
  }));

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 md:text-xl dark:text-white">
        エージェント別パフォーマンス
      </h2>

      {allAgents.length > 0 ? (
        <>
          {/* エージェントカード */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allAgents.map((agent, index) => (
              <div
                key={agent.agent_id}
                className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2 items-center">
                    <div className="flex justify-center items-center w-8 h-8 bg-green-100 rounded-lg dark:bg-green-500/20">
                      <Bot className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {agent.agent_name}
                    </h3>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full dark:text-green-400 dark:bg-green-500/20">
                    #{index + 1}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      メッセージ
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {agent.message_count.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      トークン
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {agent.total_tokens.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      平均応答
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(agent.average_response_time_ms / 1000).toFixed(2)}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      ツール使用
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {agent.tools_used.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* グラフ */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* メッセージ数ランキング */}
            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                メッセージ数ランキング
              </h3>
              <ResponsiveContainer width="100%" height={Math.max(250, allAgents.length * 50)}>
                <BarChart data={messageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    width={120}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="メッセージ数" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* トークン使用量ランキング */}
            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                トークン使用量ランキング
              </h3>
              <ResponsiveContainer width="100%" height={Math.max(250, allAgents.length * 50)}>
                <BarChart data={tokenData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    width={120}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="トークン数" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="p-8 text-center bg-gray-50 rounded-lg dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            エージェントのパフォーマンスデータがありません
          </p>
        </div>
      )}
    </div>
  );
}
