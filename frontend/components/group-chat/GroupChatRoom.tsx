"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  GroupChat,
  GroupMessage as GroupMessageType,
  getGroupChat,
  getMessages,
  sendMessageStream,
  cancelMessage,
  MentionInput,
  StreamEvent,
  generateSuggestedQuestions,
} from "@/lib/api/group-chat";
import { Button } from "@/components/ui/button";
import { Settings, ArrowLeft, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { GroupMessageList } from "./GroupMessageList";
import { GroupMessageInput } from "./GroupMessageInput";
import {
  AgentProgressIndicator,
  MentionProgress,
} from "./AgentProgressIndicator";
import { StreamingMessage } from "../chat/StreamingMessage";

interface GroupChatRoomProps {
  groupChatId: string;
}

export function GroupChatRoom({ groupChatId }: GroupChatRoomProps) {
  const router = useRouter();
  const [groupChat, setGroupChat] = useState<GroupChat | null>(null);
  const [messages, setMessages] = useState<GroupMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingAgentId, setStreamingAgentId] = useState<string | null>(null);
  const [streamingAgentName, setStreamingAgentName] = useState<string>("");
  const [streamingAgentIcon, setStreamingAgentIcon] = useState<string>("");
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingTools, setStreamingTools] = useState<Array<{
    tool_id: string;
    tool_name: string;
    status: 'running' | 'completed' | 'failed';
    input: unknown;
    output?: string | null;
    error?: string | null;
    execution_time_ms?: number | null;
    insertPosition?: number | null;
    expanded: boolean;
  }>>([]);
  const streamingContentRef = useRef(""); // ストリーミング内容の最新値を追跡
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null);
  const [mentionProgress, setMentionProgress] = useState<MentionProgress[]>([]);
  const [error, setError] = useState("");

  // 質問候補機能
  const [messageContent, setMessageContent] = useState("");
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [groupChatData, messagesData] = await Promise.all([
        getGroupChat(groupChatId),
        getMessages(groupChatId, 50),
      ]);
      setGroupChat(groupChatData);
      setMessages(messagesData.messages || []);
    } catch (err: any) {
      setError(err.message || "データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [groupChatId]);

  useEffect(() => {
    console.log('[GroupChatRoom] コンポーネントマウント');
    loadData();
  }, [loadData]);

  useEffect(() => {
    console.log('[GroupChatRoom] 状態更新:', {
      messagesCount: messages.length,
      isStreaming,
      isGeneratingSuggestions,
      suggestedQuestionsCount: suggestedQuestions.length,
    });
  }, [messages.length, isStreaming, isGeneratingSuggestions, suggestedQuestions.length]);

  const handleSendMessage = async (
    content: string,
    mentions: "all" | MentionInput[]
  ) => {
    console.log("[GroupChatRoom] handleSendMessage called with:", {
      content,
      mentions,
    });

    // ユーザーメッセージを即座に表示
    const tempUserMessage: GroupMessageType = {
      id: `temp-${Date.now()}`,
      group_chat_id: groupChatId,
      sender_type: "user",
      sender_id: "current-user",
      sender_name: "あなた",
      sender_icon: "",
      content,
      processing_status: "pending",
      created_at: new Date().toISOString(),
    };

    console.log("[GroupChatRoom] Adding temp user message:", tempUserMessage);
    setMessages((prev) => {
      const newMessages = [...prev, tempUserMessage];
      console.log("[GroupChatRoom] New messages state:", newMessages);
      return newMessages;
    });

    setIsStreaming(true);
    setError("");
    setMentionProgress([]);
    setStreamingContent("");
    setStreamingAgentId(null);

    // 送信後に質問候補とメッセージ内容をクリア
    setSuggestedQuestions([]);
    setMessageContent("");

    try {
      const cancel = await sendMessageStream(
        groupChatId,
        { content, mentions },
        (event: StreamEvent) => {
          handleStreamEvent(event);
        },
        (error) => {
          setError(error.message || "メッセージの送信に失敗しました");
          setIsStreaming(false);
          setCancelFn(null);
          setStreamingContent("");
          setStreamingAgentId(null);
        },
        () => {
          setIsStreaming(false);
          setCancelFn(null);
          setMentionProgress([]);
          setStreamingContent("");
          setStreamingAgentId(null);
          // メッセージを再読み込み
          loadData();
        }
      );

      setCancelFn(() => cancel);
    } catch (err: any) {
      setError(err.message || "メッセージの送信に失敗しました");
      setIsStreaming(false);
      setStreamingContent("");
      setStreamingAgentId(null);
    }
  };

  const handleGenerateSuggestions = async () => {
    console.log('[GroupChatRoom] 質問候補生成ボタンがクリックされました');
    if (isGeneratingSuggestions || isStreaming) {
      console.log('[GroupChatRoom] 生成中またはストリーミング中のため処理をスキップ');
      return;
    }

    setIsGeneratingSuggestions(true);
    try {
      console.log('[GroupChatRoom] API呼び出し開始:', groupChatId);
      const result = await generateSuggestedQuestions(groupChatId, 10);
      console.log('[GroupChatRoom] API呼び出し成功:', result);
      setSuggestedQuestions(result.suggestions);
    } catch (error: any) {
      console.error('[GroupChatRoom] 質問候補の生成に失敗しました:', error);
      setError(error.message || '質問候補の生成に失敗しました');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    setMessageContent(question);
  };

  const handleStreamEvent = (event: StreamEvent) => {
    // すべてのイベントをログ出力
    if (event.event === "tool_start" || event.event === "tool_end" || 
        event.event === "agent_preparing" || event.event === "agent_start") {
      console.log(`[GroupChatRoom] ===== Received ${event.event} event =====`, event.data);
    }
    
    switch (event.event) {
      case "user_message_saved":
        // ユーザーメッセージが保存された - tempメッセージを実際のIDに置き換え
        setMessages((prev) => {
          const filtered = prev.filter((m) => !m.id.startsWith("temp-"));
          return [
            ...filtered,
            {
              id: event.data.message_id,
              group_chat_id: groupChatId,
              sender_type: "user" as const,
              sender_id: "current-user",
              sender_name: "あなた",
              sender_icon: "",
              content: event.data.content,
              processing_status: "pending",
              created_at: event.data.created_at,
            },
          ];
        });
        break;

      case "mention_queue":
        // メンションキューを設定
        setMentionProgress(
          event.data.mentions.map((m: any) => ({
            agent_id: m.agent_id,
            agent_name: m.agent_name,
            agent_icon: m.agent_icon,
            order: m.order,
            status: m.status,
          }))
        );
        break;

      case "agent_preparing":
        // エージェントの処理準備（リセットはしない）
        const preparingAgentId = event.data.agent_id;
        console.log("[GroupChatRoom] agent_preparing for agent:", preparingAgentId, "- NOT resetting");
        
        // mentionProgressを更新
        setMentionProgress((prev) =>
          prev.map((m) =>
            m.agent_id === preparingAgentId
              ? { ...m, status: "processing" as const }
              : m
          )
        );
        break;

      case "agent_start":
        // エージェントの処理開始（ここでリセット）
        const agentId = event.data.agent_id;
        console.log("[GroupChatRoom] agent_start for agent:", agentId);
        
        // 前のエージェントと異なる場合のみリセット
        if (streamingAgentId !== null && streamingAgentId !== agentId) {
          console.log("[GroupChatRoom] Different agent detected, resetting tools and content");
          setStreamingContent("");
          setStreamingTools([]);
          streamingContentRef.current = "";
        } else if (streamingAgentId === null) {
          // 最初のエージェント
          console.log("[GroupChatRoom] First agent, resetting tools and content");
          setStreamingContent("");
          setStreamingTools([]);
          streamingContentRef.current = "";
        } else {
          console.log("[GroupChatRoom] Same agent, NOT resetting");
        }
        
        // mentionProgressから該当エージェントの情報を取得
        setMentionProgress((prev) => {
          const updatedProgress = prev.map((m) =>
            m.agent_id === agentId
              ? { ...m, status: "processing" as const }
              : m
          );
          
          // 該当エージェントの情報を取得してステートに設定
          const currentAgent = updatedProgress.find((m) => m.agent_id === agentId);
          if (currentAgent) {
            setStreamingAgentName(currentAgent.agent_name || "AI");
            setStreamingAgentIcon(currentAgent.agent_icon || "");
          } else {
            // フォールバック: イベントデータから取得
            setStreamingAgentName(event.data.agent_name || "AI");
            setStreamingAgentIcon(event.data.agent_icon || "");
          }
          
          return updatedProgress;
        });
        
        setStreamingAgentId(agentId);
        break;

      case "agent_chunk":
        // ストリーミングチャンク - streamingContentステートに追加
        setStreamingContent((prev) => {
          const newContent = prev + (event.data.content || "");
          streamingContentRef.current = newContent; // refも更新
          return newContent;
        });
        break;

      case "tool_start":
        // ツール使用開始（1対1チャットと同じ処理）
        console.log("[GroupChatRoom] tool_start event received:", event.data);
        setStreamingTools((prev) => {
          const toolId = event.data.tool_id;
          if (!toolId) {
            console.warn("[GroupChatRoom] tool_start without tool_id", event.data);
            return prev;
          }

          // 同じtool_idのツールが既に存在するかチェック
          const existingTool = prev.find((tool) => tool.tool_id === toolId);

          if (existingTool) {
            // 既に存在する場合は更新のみ（重複防止）
            console.log("[GroupChatRoom] Updating existing tool:", toolId);
            return prev.map((tool) =>
              tool.tool_id === toolId
                ? {
                    ...tool,
                    tool_name: event.data.tool_name || tool.tool_name,
                    status: "running" as const,
                    input: event.data.input || tool.input,
                    insertPosition:
                      event.data.insert_position !== undefined
                        ? event.data.insert_position
                        : tool.insertPosition,
                  }
                : tool
            );
          } else {
            // 新しいツールを追加
            console.log("[GroupChatRoom] Adding new tool:", toolId);
            const newTool = {
              tool_id: toolId,
              tool_name: event.data.tool_name || "",
              status: "running" as const,
              input: event.data.input || "",
              expanded: false,
              // Backend-Pythonから送られてくる位置を使用（より正確）
              insertPosition:
                event.data.insert_position !== undefined
                  ? event.data.insert_position
                  : streamingContentRef.current.length,
            };
            console.log("[GroupChatRoom] New tool object:", newTool);
            return [...prev, newTool];
          }
        });
        break;

      case "tool_end":
        // ツール使用完了（1対1チャットと同じ処理）
        console.log("[GroupChatRoom] tool_end event received:", event.data);
        setStreamingTools((prev) => {
          const toolId = event.data.tool_id;
          if (!toolId) {
            console.warn("[GroupChatRoom] tool_end without tool_id", event.data);
            return prev;
          }

          return prev.map((tool) =>
            tool.tool_id === toolId
              ? {
                  ...tool,
                  status:
                    event.data.status === "failed" ? ("failed" as const) : ("completed" as const),
                  output: event.data.output,
                  error: event.data.error,
                  execution_time_ms: event.data.execution_time_ms,
                }
              : tool
          );
        });
        break;

      case "agent_complete":
        // エージェントの処理完了 - 完成したメッセージをmessages配列に追加
        setMentionProgress((prev) =>
          prev.map((m) =>
            m.agent_id === event.data.agent_id
              ? { ...m, status: "completed" as const }
              : m
          )
        );

        // 完成したメッセージを追加
        setMessages((prev) => [
          ...prev,
          {
            id: event.data.message_id,
            group_chat_id: groupChatId,
            sender_type: "ai",
            sender_id: event.data.agent_id,
            sender_name: event.data.agent_name,
            sender_icon: event.data.agent_icon || "",
            content: event.data.content,
            processing_status: "completed",
            created_at: new Date().toISOString(),
          },
        ]);

        // ストリーミングコンテンツをリセット
        setStreamingContent("");
        setStreamingTools([]);
        streamingContentRef.current = "";
        setStreamingAgentId(null);
        break;

      case "all_complete":
        // 全完了
        setIsStreaming(false);
        setCancelFn(null);
        setMentionProgress([]);
        setStreamingContent("");
        setStreamingTools([]);
        streamingContentRef.current = "";
        setStreamingAgentId(null);
        break;
    }
  };

  const handleCancel = async () => {
    if (cancelFn) {
      cancelFn();
    }
    setIsStreaming(false);
    setCancelFn(null);
    setMentionProgress([]);
    setStreamingContent("");
    setStreamingAgentId(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-8 h-8 rounded-full border-b-2 animate-spin border-primary"></div>
      </div>
    );
  }

  if (!groupChat) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="mb-2 text-lg">グループチャットが見つかりません</p>
          <Button onClick={() => router.push("/dashboard/group-chats")}>
            一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* ヘッダー */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/group-chats")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <button
            onClick={() => router.push(`/dashboard/roster/${groupChatId}`)}
            className="transition-opacity hover:opacity-80"
          >
            {groupChat.icon_url ? (
              <img
                src={groupChat.icon_url}
                alt={groupChat.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="flex justify-center items-center w-10 h-10 rounded-full bg-primary/10">
                <span className="text-lg">{groupChat.name.charAt(0)}</span>
              </div>
            )}
          </button>
          <div>
            <h2 className="font-semibold">{groupChat.name}</h2>
            <p className="text-xs text-muted-foreground">
              {(groupChat.members?.length || 0) + 1}人のメンバー
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isStreaming && (
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <X className="mr-2 w-4 h-4" />
              キャンセル
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(`/dashboard/group-chats/${groupChatId}/settings`)
            }
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 進捗表示 */}
      {isStreaming && mentionProgress.length > 0 && (
        <AgentProgressIndicator mentions={mentionProgress} />
      )}

      {/* エラー表示 */}
      {error && (
        <div className="p-3 text-sm bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      {/* メッセージリスト */}
      <GroupMessageList
        messages={messages}
        streamingAgentId={streamingAgentId}
        streamingAgentName={streamingAgentName}
        streamingAgentIcon={streamingAgentIcon}
        streamingContent={streamingContent}
        streamingTools={streamingTools}
      />

      {/* 質問候補生成ボタン - DEBUG版 */}
      <div className="flex-shrink-0 px-4 py-3 bg-yellow-100 border-t-4 border-yellow-500 dark:bg-yellow-900 dark:border-yellow-600">
        <p className="mb-2 text-xs font-bold text-red-600 dark:text-red-400">
          🚨 DEBUG: 質問候補機能 - メッセージ数: {messages.length}
        </p>
        <div className="flex justify-between items-center">
          <button
            onClick={() => {
              console.log('🔥 ボタンがクリックされました！');
              handleGenerateSuggestions();
            }}
            disabled={
              isGeneratingSuggestions || isStreaming || messages.length < 2
            }
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm",
              isGeneratingSuggestions || isStreaming || messages.length < 2
                ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                : "bg-green-500 text-white hover:bg-green-600 dark:bg-emerald-500 dark:hover:bg-emerald-600 hover:scale-105 hover:shadow-md"
            )}
          >
            {isGeneratingSuggestions ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                <span>質問候補を生成中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>💡 質問候補を生成</span>
              </>
            )}
          </button>
          {suggestedQuestions.length > 0 && (
            <button
              onClick={() => setSuggestedQuestions([])}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ✕ クリア
            </button>
          )}
        </div>
      </div>

      {/* 質問候補カード（2x2グリッド） - DEBUG版：常に表示 */}
      <div className="flex-shrink-0 px-4 py-3 bg-blue-50 border-t border-blue-300 dark:bg-blue-900/20 dark:border-blue-700">
        <p className="mb-2 text-xs font-bold text-blue-600 dark:text-blue-400">
          🔷 DEBUG: 質問候補カードエリア（候補数: {suggestedQuestions.length}）
        </p>
        <div className="grid grid-cols-2 gap-3">
          {suggestedQuestions.length > 0 ? (
            suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => {
                  console.log('✅ カードがクリックされました:', question);
                  handleSuggestionClick(question);
                }}
                disabled={isStreaming}
                className={cn(
                  "p-4 text-left text-sm rounded-xl border-2 transition-all duration-200",
                  "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
                  "border-blue-200 dark:border-blue-700",
                  "hover:border-blue-400 hover:shadow-lg hover:-translate-y-1",
                  "dark:hover:border-blue-500",
                  "active:translate-y-0 active:scale-95",
                  isStreaming
                    ? "opacity-50 cursor-not-allowed hover:transform-none"
                    : "cursor-pointer"
                )}
              >
                <span className="block font-medium leading-snug text-gray-900 line-clamp-3 dark:text-gray-100">
                  {question}
                </span>
              </button>
            ))
          ) : (
            <>
              <div className="p-4 text-center text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl">
                候補1
              </div>
              <div className="p-4 text-center text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl">
                候補2
              </div>
              <div className="p-4 text-center text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl">
                候補3
              </div>
              <div className="p-4 text-center text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl">
                候補4
              </div>
            </>
          )}
        </div>
      </div>

      {/* メッセージ入力 */}
      <GroupMessageInput
        members={groupChat.members}
        onSend={handleSendMessage}
        disabled={isStreaming}
        value={messageContent}
        onValueChange={setMessageContent}
      />
    </div>
  );
}
