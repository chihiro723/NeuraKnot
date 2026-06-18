import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatScroll } from "./hooks/useChatScroll";
import { useStreaming } from "./hooks/useStreaming";
import { MessageList } from "./MessageList";
import { TokenLimitModal } from "@/components/modals/TokenLimitModal";
import { GroupMessageInput } from "@/components/group-chat/GroupMessageInput";
import { authFetch } from "@/lib/utils/auth-fetch";
import { getCookie } from "@/lib/utils/cookies";
import { showToast } from "@/components/ui/ToastContainer";
import { useIsMobile } from "@/lib/hooks/useResponsive";
import {
  sendMessageStream as sendGroupMessageStream,
  MentionInput,
  generateSuggestedQuestions,
} from "@/lib/api/group-chat";
import type { StreamEvent, SelectedChat, ToolUsageData } from "@/lib/types";
import type { Message } from "@/components/chat/ChatWindowClient";

// ストリーミング中のツールデータをメッセージ保存用の形式に変換するヘルパー関数
const convertToolsToMessageUsages = (tools: ToolUsageData[]) => {
  return tools.map((tool) => ({
    id: tool.tool_id,
    tool_name: tool.tool_name,
    tool_category: "function_call",
    input_data:
      typeof tool.input === "object"
        ? JSON.stringify(tool.input)
        : String(tool.input),
    output_data: tool.output || "",
    status: tool.status === "running" ? "completed" : tool.status,
    error_message: tool.error,
    execution_time_ms: tool.execution_time_ms || 0,
    insert_position: tool.insertPosition || 0,
    executed_at: new Date().toISOString(),
  }));
};

interface UserProfile {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface GroupChatWindowProps {
  selectedChat: SelectedChat;
  initialMessages?: Message[];
  initialConversationId?: string;
  initialUserProfile?: UserProfile;
}

export function GroupChatWindow({
  selectedChat,
  initialMessages = [],
  initialConversationId,
  initialUserProfile,
}: GroupChatWindowProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  const { messages, setMessages, conversationId, addMessage, reloadMessages } =
    useChatMessages(initialMessages, selectedChat, initialConversationId);

  const { messagesEndRef, messagesContainerRef, scrollToBottom } =
    useChatScroll(messages.length, selectedChat.id);

  const {
    isStreaming,
    setIsStreaming,
    streamingContent,
    setStreamingContent,
    streamingTools,
    setStreamingTools,
    streamingContentRef,
    setStreamingAgentName,
    setStreamingAgentIcon,
    streamingAgentName,
    streamingAgentIcon,
  } = useStreaming();

  const [newMessage, setNewMessage] = useState("");
  const [isLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState<number | null>(null);
  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false);
  const [tokenLimitData, setTokenLimitData] = useState<{
    tier: string;
    costUsd: number;
    budgetLimitUsd: number;
    usagePercentage: number;
    periodEnd: string;
  } | null>(null);

  const footerRef = useRef<HTMLDivElement>(null);
  const MESSAGE_LIMIT = 50;
  const STREAMING_DELAY = 500;

  useEffect(() => {
    setIsClient(true);
    setAvatarTimestamp(Date.now());
  }, []);

  const handleGenerateSuggestions = async () => {
    if (isGeneratingSuggestions || isStreaming || !conversationId) return;

    setIsGeneratingSuggestions(true);
    try {
      const result = await generateSuggestedQuestions(conversationId, 10);
      setSuggestedQuestions(result.suggestions);
    } catch (error: any) {
      console.error("質問候補の生成に失敗しました:", error);
      showToast({
        message: "質問候補の生成に失敗しました",
        type: "error",
        duration: 3000,
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    setNewMessage(question);
    // GroupMessageInputへのフォーカスは難しいので省略（必要ならrefを渡す）
  };

  const messageInputMembers = useMemo(() => {
    return (selectedChat.members || []).map((m) => ({
      id: m.id,
      group_chat_id: selectedChat.id,
      ai_agent_id: m.id,
      ai_agent_name: m.name,
      ai_agent_icon: m.avatar_url,
      ai_agent_model: "",
      display_order: 0,
      joined_at: new Date().toISOString(),
    }));
  }, [selectedChat.members, selectedChat.id]);

  return (
    <div className="flex overflow-hidden overscroll-none flex-col flex-1">
      <div
        ref={messagesContainerRef}
        role="log"
        aria-live="polite"
        className="overflow-y-auto overflow-x-hidden flex-1 pt-4 px-3 pb-0 md:px-4 w-full bg-gray-50 dark:bg-gray-900 lg:pt-6 lg:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] overscroll-contain touch-pan-y"
      >
        <MessageList
          messages={messages}
          currentUser={initialUserProfile || null}
          selectedChat={selectedChat}
          isGroupChat={true}
          isClient={isClient}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          streamingTools={streamingTools}
          streamingAgentName={streamingAgentName}
          streamingAgentIcon={streamingAgentIcon}
          avatarTimestamp={avatarTimestamp}
          messagesEndRef={messagesEndRef}
        />
      </div>

      {/* 入力エリア */}
      <>
        {/* 質問候補生成ボタン */}
        <div className="flex-shrink-0 px-4 pt-2 pb-1 bg-gray-50 border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <button
              onClick={handleGenerateSuggestions}
              disabled={
                isGeneratingSuggestions || isStreaming || messages.length < 2
              }
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all duration-200",
                isGeneratingSuggestions || isStreaming || messages.length < 2
                  ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : "text-green-600 dark:text-emerald-400 hover:bg-green-50 dark:hover:bg-emerald-950 hover:scale-105"
              )}
            >
              {isGeneratingSuggestions ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 animate-spin border-t-transparent" />
                  <span>質問候補を生成中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>質問候補を生成</span>
                </>
              )}
            </button>
            {suggestedQuestions.length > 0 && (
              <button
                onClick={() => setSuggestedQuestions([])}
                className="text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {/* 質問候補カード */}
        {suggestedQuestions.length > 0 && (
          <div className="flex-shrink-0 px-4 pb-3 bg-gray-50 dark:bg-gray-900">
            <div className="grid grid-cols-2 gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(question)}
                  disabled={isStreaming}
                  className={cn(
                    "group relative p-4 text-left text-sm rounded-2xl border-2 transition-all duration-300",
                    "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900",
                    "border-gray-200 dark:border-gray-700",
                    "hover:border-green-400 hover:shadow-lg hover:shadow-green-100",
                    "dark:hover:border-emerald-400 dark:hover:shadow-emerald-900/20",
                    "hover:-translate-y-1 active:translate-y-0",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    isStreaming &&
                      "opacity-50 cursor-not-allowed hover:transform-none"
                  )}
                >
                  <span className="block font-medium leading-relaxed text-gray-800 line-clamp-3 dark:text-gray-100">
                    {question}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <GroupMessageInput
          members={messageInputMembers}
          value={newMessage}
          onValueChange={setNewMessage}
          onSend={async (content: string, mentions: "all" | MentionInput[]) => {
            // トークン制限チェック
            try {
              const response = await authFetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/billing/check-limit`
              );

              if (response.ok) {
                const limitCheck = await response.json();
                if (!limitCheck.can_send) {
                  setTokenLimitData({
                    tier: limitCheck.current_tier,
                    costUsd: limitCheck.cost_usd,
                    budgetLimitUsd: limitCheck.budget_limit_usd,
                    usagePercentage: limitCheck.usage_percentage,
                    periodEnd: limitCheck.period_end,
                  });
                  setShowTokenLimitModal(true);
                  return;
                }
              }
            } catch (error) {
              console.error("Error checking token limit:", error);
            }

            setIsStreaming(true);
            setStreamingContent("");
            setStreamingTools([]);
            setNewMessage("");
            setSuggestedQuestions([]);
            setStreamingAgentName("");
            setStreamingAgentIcon("");

            // Optimistic UI
            const tempUserMessage = {
              id: `temp-${Date.now()}`,
              content,
              sender_type: "user" as const,
              sender_id: "current-user",
              created_at: new Date().toISOString(),
              tool_usages: [],
            };
            addMessage(tempUserMessage);
            scrollToBottom();

            try {
              const accessToken = getCookie("access_token") || null;

              // メンション対象エージェントのID抽出（ストリーミング用）
              const mentionedAgentIds: string[] = [];
              if (selectedChat.members) {
                // ... (mentions logic) ...
                if (Array.isArray(mentions)) {
                  const mentionMatches = content.matchAll(/@(\w+)/g);
                  for (const match of mentionMatches) {
                    const mentionedName = match[1];
                    const agent = selectedChat.members.find(
                      (m) => m.name === mentionedName
                    );
                    if (agent) {
                      mentionedAgentIds.push(agent.id);
                    }
                  }
                }
              }

              // ストリーミング中の状態を保持するローカル変数（クロージャ用）
              let currentTools: typeof streamingTools = [];
              let currentContent = "";

              sendGroupMessageStream(
                selectedChat.id,
                { content, mentions },
                (event: any) => {
                  switch (event.event) {
                    case "user_message_saved":
                      // ...
                      break;

                    case "agent_start":
                    case "agent_preparing":
                      // 新しいエージェントの生成開始前に前回の状態をクリア
                      currentTools = [];
                      currentContent = "";
                      setStreamingContent("");
                      setStreamingTools([]);
                      if (event.data) {
                        setStreamingAgentName(event.data.agent_name || "");
                        setStreamingAgentIcon(event.data.agent_icon || "");
                      }
                      break;

                    case "agent_chunk":
                      const chunk = event.data.content || "";
                      currentContent += chunk;
                      setStreamingContent(currentContent);
                      break;

                    case "tool_start":
                      const toolId = event.data.tool_id;
                      if (toolId) {
                        const existingIndex = currentTools.findIndex(
                          (t) => t.tool_id === toolId
                        );
                        if (existingIndex !== -1) {
                          currentTools[existingIndex] = {
                            ...currentTools[existingIndex],
                            tool_name:
                              event.data.tool_name ||
                              currentTools[existingIndex].tool_name,
                            status: "running",
                            input:
                              event.data.input ||
                              currentTools[existingIndex].input,
                            insertPosition:
                              event.data.insert_position !== undefined
                                ? event.data.insert_position
                                : currentTools[existingIndex].insertPosition,
                          };
                        } else {
                          currentTools.push({
                            tool_id: toolId,
                            tool_name: event.data.tool_name || "",
                            status: "running",
                            input: event.data.input || "",
                            expanded: false,
                            insertPosition:
                              event.data.insert_position !== undefined
                                ? event.data.insert_position
                                : currentContent.length,
                          });
                        }
                        setStreamingTools([...currentTools]);
                      }
                      break;

                    case "tool_end":
                      const endToolId = event.data.tool_id;
                      if (endToolId) {
                        const existingIndex = currentTools.findIndex(
                          (t) => t.tool_id === endToolId
                        );
                        if (existingIndex !== -1) {
                          currentTools[existingIndex] = {
                            ...currentTools[existingIndex],
                            status:
                              event.data.status === "failed"
                                ? "failed"
                                : "completed",
                            output: event.data.output,
                            error: event.data.error,
                            execution_time_ms: event.data.execution_time_ms,
                          };
                          setStreamingTools([...currentTools]);
                        }
                      }
                      break;

                    case "agent_complete":
                      const newMessage = {
                        id: event.data.message_id,
                        content: event.data.content,
                        sender_type: "ai" as const,
                        sender_id: event.data.agent_id,
                        sender_name: event.data.agent_name || "AI Agent",
                        sender_icon: event.data.agent_icon || "",
                        created_at: new Date().toISOString(),
                        // ローカル変数 currentTools を使用してツール履歴を反映
                        tool_usages: convertToolsToMessageUsages(currentTools),
                      };
                      addMessage(newMessage);

                      // 状態リセット
                      currentContent = "";
                      currentTools = [];
                      setStreamingContent("");
                      setStreamingTools([]);
                      scrollToBottom();
                      break;

                    case "all_complete":
                      setIsStreaming(false);
                      currentContent = "";
                      currentTools = [];
                      setStreamingContent("");
                      setStreamingTools([]);
                      router.refresh();
                      break;
                  }
                },
                (error: Error) => {
                  console.error("Group chat streaming error:", error);
                  // エラー時は一時メッセージ削除
                  // removeMessage(tempUserMessage.id);
                  showToast({
                    message: error.message || "メッセージの送信に失敗しました",
                    type: "error",
                  });
                  setIsStreaming(false);
                  setStreamingContent("");
                  setStreamingTools([]);
                },
                () => {
                  setIsStreaming(false);
                  setStreamingContent("");
                  setStreamingTools([]);
                }
              );
            } catch (error: any) {
              console.error("Send error:", error);
              showToast({
                message: "メッセージの送信に失敗しました",
                type: "error",
              });
              setIsStreaming(false);
              setStreamingContent("");
              setStreamingTools([]);
            }
          }}
          disabled={isLoading || isStreaming}
        />
      </>

      {tokenLimitData && (
        <TokenLimitModal
          isOpen={showTokenLimitModal}
          onClose={() => setShowTokenLimitModal(false)}
          tier={tokenLimitData.tier}
          costUsd={tokenLimitData.costUsd}
          budgetLimitUsd={tokenLimitData.budgetLimitUsd}
          usagePercentage={tokenLimitData.usagePercentage}
          periodEnd={tokenLimitData.periodEnd}
        />
      )}
    </div>
  );
}
