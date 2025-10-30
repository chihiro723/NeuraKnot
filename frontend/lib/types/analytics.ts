/**
 * 統計・分析データの型定義
 */

export type TimeRange = "today" | "week" | "month" | "all";

export interface AnalyticsData {
  token_stats: TokenStats;
  activity_stats: ActivityStats;
  agent_performance: AgentPerformance[];
  tool_usage_stats: ToolUsageStats;
  service_stats: ServiceStats;
}

export interface TokenStats {
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  estimated_cost_jpy: number;
  by_provider: TokensByProvider[];
  by_model: TokensByModel[];
}

export interface TokensByProvider {
  provider: string;
  total_tokens: number;
  estimated_cost_usd: number;
}

export interface TokensByModel {
  provider: string;
  model: string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
}

export interface ActivityStats {
  total_messages: number;
  user_messages: number;
  ai_messages: number;
  total_conversations: number;
  active_conversations: number;
  daily_activity: DailyActivityPoint[];
  average_response_time_ms: number;
}

export interface DailyActivityPoint {
  date: string; // YYYY-MM-DD形式
  message_count: number;
  user_messages: number;
  ai_messages: number;
}

export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  message_count: number;
  total_tokens: number;
  average_response_time_ms: number;
  tools_used: number;
}

export interface ToolUsageStats {
  total_tool_calls: number;
  successful_calls: number;
  failed_calls: number;
  success_rate: number;
  by_category: ToolsByCategory[];
  by_tool: ToolStats[];
}

export interface ToolsByCategory {
  category: string;
  call_count: number;
  success_rate: number;
}

export interface ToolStats {
  tool_name: string;
  category: string;
  call_count: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  average_execution_time_ms: number;
}

export interface ServiceStats {
  total_services: number;
  enabled_services: number;
  disabled_services: number;
  by_service: ServiceUsageStats[];
}

export interface ServiceUsageStats {
  service_class: string;
  is_enabled: boolean;
  agent_count: number;
}

