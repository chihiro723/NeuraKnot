import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Smile, Paperclip, Sparkles, Cpu, Cloud } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatScroll } from "./hooks/useChatScroll";
import { useStreaming } from "./hooks/useStreaming";
import { MessageList } from "./MessageList";
import { StampPicker } from "./StampPicker";
import { TokenLimitModal } from "@/components/modals/TokenLimitModal";
import { authFetch } from "@/lib/utils/auth-fetch";
import { getCookie } from "@/lib/utils/cookies";
import { showToast } from "@/components/ui/ToastContainer";
import { useIsMobile } from "@/lib/hooks/useResponsive";
import { sendChatMessage } from "@/lib/api/chat-router";
import { generateConversationSuggestedQuestions } from "@/lib/api/conversation";
import { useLocalLLM } from "@/lib/contexts/LocalLLMContext";
import { checkWebGPUSupport } from "@/lib/local-llm/support";
import type { StreamEvent, SelectedChat } from "@/lib/types";
import type { Message } from "@/components/chat/ChatWindowClient";

interface UserProfile {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface AIChatWindowProps {
  selectedChat: SelectedChat;
  initialMessages?: Message[];
  initialConversationId?: string;
  initialUserProfile?: UserProfile;
}

export function AIChatWindow({
  selectedChat,
  initialMessages = [],
  initialConversationId,
  initialUserProfile,
}: AIChatWindowProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const localLLM = useLocalLLM();

  // このエージェントがブラウザローカル(WebLLM)で動作するか
  const isLocalAgent =
    selectedChat.provider === "webllm" && !!selectedChat.model;

  // カスタムフックの使用
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

  // ローカルステート
  const [newMessage, setNewMessage] = useState("");
  const [isLoading] = useState(false); // 将来的に使用
  const [showStampPicker, setShowStampPicker] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  // 直近の質問候補をどちら（ローカルWebLLM / クラウド）で生成したかの確認用
  const [suggestionSource, setSuggestionSource] = useState<
    "local" | "cloud" | null
  >(null);
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const MESSAGE_LIMIT = 50;
  const STREAMING_DELAY = 500;
  const MAX_TEXTAREA_LINES = 10;
  const LINE_HEIGHT = 24;

  // クライアントサイド初期化
  useEffect(() => {
    setIsClient(true);
    setAvatarTimestamp(Date.now());
  }, []);

  // テキストエリアの高さ調整
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const maxHeight = LINE_HEIGHT * MAX_TEXTAREA_LINES;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // スタンプピッカー外側クリック検知
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showStampPicker) {
        const target = event.target as HTMLElement;
        if (
          !target.closest("[data-stamp-picker]") &&
          !target.closest("[data-smile-button]")
        ) {
          setShowStampPicker(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStampPicker]);

  // ローカル(WebLLM)エンジンを利用可能な状態にする。
  // WebGPU 判定・初回ダウンロード確認・モデルロードまでを行い、可否を返す。
  const ensureLocalReady = useCallback(
    async (model: string): Promise<boolean> => {
      // 1. WebGPU 対応判定（非対応ならクラウド利用を案内）
      const support = await checkWebGPUSupport();
      if (!support.supported) {
        showToast({
          message:
            (support.reason || "WebGPU 非対応です。") +
            " クラウドのAIをご利用ください。",
          type: "error",
          duration: 6000,
        });
        return false;
      }

      // 2. 既に同じモデルがロード済みなら即OK
      if (localLLM.status === "ready" && localLLM.currentModelId === model) {
        return true;
      }

      // 3. モデルが未キャッシュなら初回ダウンロードの確認を取る（数GBになり得る）
      let cached = false;
      try {
        const { hasModelInCache } = await import("@mlc-ai/web-llm");
        cached = await hasModelInCache(model);
      } catch {
        cached = false;
      }
      if (!cached) {
        const ok = window.confirm(
          `このAI（${selectedChat.name}）はブラウザ内で動作します。\n` +
            `初回のみモデル（${model}）のダウンロードが必要です。数百MB〜数GBになる場合があるため、Wi-Fi環境を推奨します。\n\n` +
            `ダウンロードを開始しますか？`
        );
        if (!ok) return false;
      }

      // 4. エンジンをロード（進捗は localLLM.progress に反映される）
      try {
        await localLLM.ensureEngine(model);
        return true;
      } catch (e) {
        showToast({
          message:
            "ローカルモデルの準備に失敗しました: " +
            (e instanceof Error ? e.message : String(e)),
          type: "error",
          duration: 6000,
        });
        return false;
      }
    },
    [localLLM, selectedChat.name]
  );

  // メッセージ送信ハンドラー
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || (isLoading && !isStreaming) || !conversationId)
      return;

    if (isLocalAgent) {
      // ローカル実行: 課金チェックはスキップ（サーバーコスト$0）。
      // 代わりにエンジンの準備（WebGPU判定・DL確認・ロード）を行う。
      const ready = await ensureLocalReady(selectedChat.model as string);
      if (!ready) return;
    } else {
      // クラウド実行: トークン制限チェック
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
    }

    const messageContent = newMessage.trim();
    setNewMessage("");
    setSuggestedQuestions([]);
    setSuggestionSource(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "48px";
    }

    // ユーザーメッセージを即座に表示（Optimistic UI）
    const tempMessageId = `temp-${Date.now()}`;
    const tempUserMessage: Message = {
      id: tempMessageId,
      content: messageContent,
      sender_type: "user",
      sender_id: "current-user",
      created_at: new Date().toISOString(),
    };
    addMessage(tempUserMessage);
    scrollToBottom();

    // サイドバー更新用
    setTimeout(() => {
      router.refresh();
    }, 500);

    // ストリーミング開始
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingTools([]);
    streamingContentRef.current = "";
    setStreamingAgentName(selectedChat.name);
    setStreamingAgentIcon(selectedChat.avatar_url || "");

    try {
      const accessToken = getCookie("access_token") || null;

      await sendChatMessage(
        conversationId,
        messageContent,
        accessToken,
        (event: StreamEvent) => {
          switch (event.type) {
            case "token":
              setStreamingContent((prev) => {
                const newContent = prev + (event.content || "");
                streamingContentRef.current = newContent;
                return newContent;
              });
              break;
            case "tool_start":
              setStreamingTools((prev) => {
                const toolId = event.tool_id;
                if (!toolId) return prev;

                const existingTool = prev.find(
                  (tool) => tool.tool_id === toolId
                );
                if (existingTool) {
                  return prev.map((tool) =>
                    tool.tool_id === toolId
                      ? {
                          ...tool,
                          tool_name: event.tool_name || tool.tool_name,
                          status: "running",
                          input: event.input || tool.input,
                          insertPosition:
                            event.insert_position !== undefined
                              ? event.insert_position
                              : tool.insertPosition,
                        }
                      : tool
                  );
                } else {
                  return [
                    ...prev,
                    {
                      tool_id: toolId,
                      tool_name: event.tool_name || "",
                      status: "running",
                      input: event.input || "",
                      expanded: false,
                      insertPosition:
                        event.insert_position !== undefined
                          ? event.insert_position
                          : streamingContentRef.current.length,
                    },
                  ];
                }
              });
              break;
            case "tool_end":
              setStreamingTools((prev) => {
                const toolId = event.tool_id;
                if (!toolId) return prev;

                return prev.map((tool) =>
                  tool.tool_id === toolId
                    ? {
                        ...tool,
                        status:
                          event.status === "failed" ? "failed" : "completed",
                        output: event.output,
                        error: event.error,
                        execution_time_ms: event.execution_time_ms,
                      }
                    : tool
                );
              });
              break;
            case "done":
              // ツール位置情報の更新とメッセージリロード
              setTimeout(async () => {
                const toolPositions: Record<string, number> = {};
                streamingTools.forEach((tool) => {
                  if (tool.insertPosition !== undefined) {
                    toolPositions[tool.tool_name] = tool.insertPosition;
                  }
                });

                await reloadMessages();
                router.refresh();

                // 最新メッセージのツール位置更新ロジックはここに記述すべきだが
                // 複雑になるため一旦リロードだけで対応し、必要なら追加実装する
                // (ChatWindow.tsxのロジックを再現すると長くなるため)

                setIsStreaming(false);
                setStreamingContent("");
                setStreamingTools([]);
              }, STREAMING_DELAY);
              break;
            case "error":
              console.error("Streaming error:", event.message);
              setMessages((prev) => prev.filter((m) => m.id !== tempMessageId));
              setIsStreaming(false);
              setStreamingContent("");
              setStreamingTools([]);
              showToast({
                message: "メッセージの送信中にエラーが発生しました。",
                type: "error",
                duration: 5000,
              });
              break;
          }
        },
        (error: string) => {
          console.error("Streaming error:", error);
          setIsStreaming(false);
          setMessages((prev) =>
            prev.filter((m) => m.id !== tempUserMessage.id)
          );
          showToast({
            message: `メッセージの送信に失敗しました: ${error}`,
            type: "error",
            duration: 5000,
          });
        },
        // ローカル実行(WebLLM)時のみエンジンフックを渡す
        isLocalAgent
          ? { ensureEngine: (model: string) => localLLM.ensureEngine(model) }
          : undefined
      );
    } catch (error) {
      console.error("Error in streaming:", error);
      setIsStreaming(false);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      showToast({
        message: "メッセージの送信に失敗しました。",
        type: "error",
        duration: 5000,
      });
    }
  }, [
    newMessage,
    isLoading,
    isStreaming,
    conversationId,
    selectedChat,
    addMessage,
    scrollToBottom,
    router,
    setIsStreaming,
    setStreamingContent,
    setStreamingTools,
    setStreamingAgentName,
    setStreamingAgentIcon,
    setMessages,
    streamingTools,
    reloadMessages,
    isLocalAgent,
    ensureLocalReady,
    localLLM,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const handleStampSelect = (stamp: string) => {
    setNewMessage((prev) => prev + stamp);
  };

  const handleGenerateSuggestions = async () => {
    if (isGeneratingSuggestions || isStreaming || !conversationId) return;

    setIsGeneratingSuggestions(true);
    setSuggestionSource(null);
    try {
      // ローカルエンジンがロード済みなら、まずローカルで生成を試みる（クラウドコスト$0）
      const engine = localLLM.getEngine();
      if (isLocalAgent && localLLM.status === "ready" && engine) {
        try {
          const { generateSuggestionsLocal } = await import(
            "@/lib/local-llm/aux"
          );
          const recent = messages.slice(-10).map((m) => ({
            role: (m.sender_type === "user" ? "user" : "assistant") as
              | "user"
              | "assistant",
            content: m.content,
          }));
          const suggestions = await generateSuggestionsLocal(engine, recent);
          setSuggestedQuestions(suggestions);
          setSuggestionSource("local");
          return;
        } catch (localError) {
          // ローカル失敗時はクラウドへフォールバック
          console.warn(
            "ローカル質問候補生成に失敗、クラウドにフォールバックします:",
            localError
          );
        }
      }

      const result = await generateConversationSuggestedQuestions(
        conversationId,
        10
      );
      setSuggestedQuestions(result.suggestions);
      setSuggestionSource("cloud");
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
    textareaRef.current?.focus();
  };

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
          isGroupChat={false}
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

      {/* ローカルLLM(WebLLM)ステータスバナー */}
      {isLocalAgent && (
        <div className="flex-shrink-0 px-4 py-2 bg-emerald-50 border-t border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900">
          {localLLM.status === "loading" && localLLM.progress ? (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  ローカルAIモデルを準備中...
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  {Math.round((localLLM.progress.ratio || 0) * 100)}%
                </span>
              </div>
              <div className="overflow-hidden w-full h-1.5 bg-emerald-200 rounded-full dark:bg-emerald-900">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${Math.round((localLLM.progress.ratio || 0) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-emerald-600 truncate dark:text-emerald-400">
                {localLLM.progress.text}
              </p>
            </div>
          ) : (
            <div className="flex gap-1.5 items-center text-xs text-emerald-700 dark:text-emerald-300">
              <Cpu className="w-3.5 h-3.5" />
              <span>
                このAIはブラウザ内（あなたの端末）で動作します・データは外部送信されません・無料
                {localLLM.status === "ready" ? "（準備完了）" : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 入力エリア */}
      <>
        {/* 質問候補生成ボタン */}
        <div className="flex-shrink-0 px-4 pt-2 pb-1 bg-gray-50 border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <button
              onClick={handleGenerateSuggestions}
              disabled={
                isGeneratingSuggestions || isStreaming || messages.length === 0
              }
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all duration-200",
                isGeneratingSuggestions || isStreaming || messages.length === 0
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
            <div className="flex gap-2 items-center">
              {/* 生成経路の確認用バッジ（ローカルWebLLM or クラウド） */}
              {suggestionSource && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border",
                    suggestionSource === "local"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-900"
                      : "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/50 dark:border-blue-900"
                  )}
                  title={
                    suggestionSource === "local"
                      ? "この端末のローカルLLM（WebLLM）で生成・無料"
                      : "クラウドLLM（gpt-4.1）で生成"
                  }
                >
                  {suggestionSource === "local" ? (
                    <>
                      <Cpu className="w-3 h-3" />
                      ローカル生成
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3 h-3" />
                      クラウド生成
                    </>
                  )}
                </span>
              )}
              {suggestedQuestions.length > 0 && (
                <button
                  onClick={() => {
                    setSuggestedQuestions([]);
                    setSuggestionSource(null);
                  }}
                  className="text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                >
                  クリア
                </button>
              )}
            </div>
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

        <div
          ref={footerRef}
          className="flex-shrink-0 px-3 pt-0 pb-3 bg-gray-50 md:px-4 md:pb-4 dark:bg-gray-900"
        >
          <div className="relative w-full">
            <div
              className={cn(
                "flex flex-col gap-2 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600",
                "transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500 dark:focus-within:ring-emerald-500 focus-within:border-green-500 dark:focus-within:border-emerald-500"
              )}
            >
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isMobile
                    ? "メッセージを入力..."
                    : "メッセージを入力...（Cmd/Ctrl+Enterで送信）"
                }
                className={cn(
                  "px-0 py-0 w-full bg-transparent border-0 resize-none",
                  "overflow-y-auto overflow-x-hidden focus:outline-none",
                  "text-base placeholder-gray-500 text-gray-900 dark:placeholder-gray-400 dark:text-gray-100"
                )}
                rows={1}
                inputMode="text"
                enterKeyHint="send"
                style={{ minHeight: "32px", lineHeight: "24px" }}
                disabled={isLoading || isStreaming}
              />

              <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-600">
                <div className="flex gap-1 items-center">
                  <button
                    className="p-1.5 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-green-500 dark:hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                    aria-label="ファイルを添付"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <button
                    data-smile-button
                    onClick={() => setShowStampPicker(!showStampPicker)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      showStampPicker
                        ? "text-green-500 bg-green-50 dark:text-emerald-500 dark:bg-green-500/10"
                        : "text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                    )}
                    aria-label="スタンプを選択"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isLoading || isStreaming}
                  className={cn(
                    "px-4 py-1.5 rounded-xl transition-all duration-200 disabled:cursor-not-allowed flex items-center gap-1.5",
                    newMessage.trim() && !isLoading && !isStreaming
                      ? "text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-sm hover:shadow-md shadow-green-500/40 dark:from-green-500 dark:to-emerald-600 dark:hover:from-green-600 dark:hover:to-emerald-700"
                      : "text-gray-400 bg-gray-200 dark:text-gray-500 dark:bg-gray-600"
                  )}
                >
                  <Send className="w-4 h-4" />
                  <span className="text-sm font-medium">送信</span>
                </button>
              </div>
            </div>

            {showStampPicker && (
              <StampPicker
                onSelectStamp={handleStampSelect}
                onClose={() => setShowStampPicker(false)}
              />
            )}
          </div>
        </div>
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
