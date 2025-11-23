import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Smile, Paperclip, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils/cn";
import type { Components } from "react-markdown";
import {
  getOrCreateConversation,
  getMessages,
  sendMessage as serverSendMessage,
} from "@/lib/actions/conversation";
import { sendMessageStream } from "@/lib/api/streaming";
import { generateConversationSuggestedQuestions } from "@/lib/api/conversation";
import {
  sendMessageStream as sendGroupMessageStream,
  MentionInput,
} from "@/lib/api/group-chat";
import { useServerActionWithAuth } from "@/lib/hooks/useServerActionWithAuth";
import { getProfile } from "@/lib/actions/user";
import { StreamingMessage } from "./StreamingMessage";
import { StampPicker } from "./StampPicker";
import { TokenLimitModal } from "@/components/modals/TokenLimitModal";
import { authFetch } from "@/lib/utils/auth-fetch";
import { getCookie } from "@/lib/utils/cookies";
import { formatDateSeparator, isSameDay } from "@/lib/utils/date";
import { showToast } from "@/components/ui/ToastContainer";
import { useIsMobile } from "@/lib/hooks/useResponsive";
import { GroupMessageInput } from "@/components/group-chat/GroupMessageInput";
import type {
  StreamEvent,
  ToolUsageData,
  ToolUsage,
  SelectedChat,
} from "@/lib/types";
import type { MentionInput } from "@/lib/api/group-chat";

interface Message {
  id: string;
  content: string;
  sender_type: "user" | "ai";
  sender_id: string;
  created_at: string;
  tool_usages?: ToolUsage[];
}

interface ChatWindowProps {
  selectedChat: SelectedChat;
  initialMessages?: Message[];
  initialConversationId?: string;
  initialUserProfile?: UserProfile;
  isGroupChat?: boolean;
}

interface UserProfile {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

/**
 * テキスト内の@メンションを処理して青色にする
 */
const processTextWithMentions = (text: string) => {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, index) => {
    if (part.match(/^@\w+$/)) {
      return (
        <span
          key={index}
          className="font-medium text-blue-500 dark:text-blue-400"
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

/**
 * ReactMarkdownのカスタムコンポーネント
 * 全てのリンクを新しいタブで開く
 * @メンションを青色で表示
 */
const markdownComponents: Components = {
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
  p: ({ node, children, ...props }) => {
    const processedChildren = React.Children.map(children, (child) => {
      if (typeof child === "string") {
        return processTextWithMentions(child);
      }
      return child;
    });
    return <p {...props}>{processedChildren}</p>;
  },
  text: ({ node, children, ...props }) => {
    if (typeof children === "string") {
      return <>{processTextWithMentions(children)}</>;
    }
    return <>{children}</>;
  },
};

/**
 * チャットウィンドウコンポーネント - 完璧に統一されたデザインシステム
 */
export function ChatWindow({
  selectedChat,
  initialMessages = [],
  initialConversationId,
  initialUserProfile,
  isGroupChat = false,
}: ChatWindowProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(
    initialUserProfile || null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // ローディング状態（将来的に使用予定）
  const [isLoading] = useState(false);

  // ストリーミング状態
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingTools, setStreamingTools] = useState<ToolUsageData[]>([]);
  const streamingContentRef = useRef(""); // ストリーミング内容の最新値を追跡
  const [streamingAgentName, setStreamingAgentName] = useState<string>("");
  const [streamingAgentIcon, setStreamingAgentIcon] = useState<string>("");

  // スタンプピッカーの表示状態
  const [showStampPicker, setShowStampPicker] = useState(false);

  // 質問候補機能
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // メンション補完の状態
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // トークン制限モーダルの表示状態
  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false);
  const [tokenLimitData, setTokenLimitData] = useState<{
    tier: string;
    tokensUsed: number;
    tokensLimit: number;
    usagePercentage: number;
    periodEnd: string;
  } | null>(null);

  // クライアントサイドレンダリング用の状態
  const [isClient, setIsClient] = useState(false);

  // アバターURLのキャッシュバスティング用タイムスタンプ
  const [avatarTimestamp, setAvatarTimestamp] = useState<number | null>(null);

  // 初回メッセージ読み込みかどうかを追跡（初回のみ自動スクロール）
  const isInitialLoadRef = useRef(true);

  // 定数
  const MESSAGE_LIMIT = 50;
  const STREAMING_DELAY = 500;
  const MAX_TEXTAREA_LINES = 10;
  const LINE_HEIGHT = 24;

  // 401エラー時に自動リフレッシュ（各Server Actionを個別にラップ）
  const getOrCreateConversationWithAuth = useServerActionWithAuth(
    getOrCreateConversation as (
      aiAgentId: string
    ) => Promise<{ success: boolean; data?: { id: string }; error?: string }>
  );
  const getMessagesWithAuth = useServerActionWithAuth(
    getMessages as (
      conversationId: string,
      limit?: number
    ) => Promise<{
      success: boolean;
      data?: { messages: Message[] };
      error?: string;
    }>
  );
  const sendMessageWithAuth = useServerActionWithAuth(
    serverSendMessage as (
      conversationId: string,
      content: string
    ) => Promise<{ success: boolean; data?: unknown; error?: string }>
  );
  const getProfileWithAuth = useServerActionWithAuth(
    getProfile as () => Promise<{
      success: boolean;
      data?: { username: string; display_name: string; avatar_url: string };
      error?: string;
    }>
  );

  // クライアントサイドでタイムスタンプを設定
  useEffect(() => {
    setAvatarTimestamp(Date.now());
  }, []);

  // 現在のユーザー情報を取得（初期データがない場合のみ）
  useEffect(() => {
    if (initialUserProfile) return; // 初期データがあればスキップ

    const fetchUserProfile = async () => {
      try {
        const result = await getProfileWithAuth();
        if (result.success && result.data) {
          const data = result.data as {
            username: string;
            display_name: string;
            avatar_url: string;
          };
          setCurrentUser({
            username: data.username,
            display_name: data.display_name,
            avatar_url: data.avatar_url,
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, [initialUserProfile]);

  // クライアントサイドレンダリングの状態を設定
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 初回読み込み時のみスクロール（messages が初めて設定された時）
  useEffect(() => {
    // チャットIDが変わったらフラグをリセット
    isInitialLoadRef.current = true;
  }, [selectedChat.id]);

  // 初回メッセージ読み込み時のみ最下部にスクロール
  useEffect(() => {
    if (messages.length > 0 && isInitialLoadRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      });
      isInitialLoadRef.current = false;
    }
  }, [messages.length > 0 ? messages[0]?.id : null]); // 初回のメッセージIDが変わった時のみ

  // 会話を初期化してメッセージを取得（初期データがない場合のみ）
  useEffect(() => {
    if (initialConversationId && initialMessages.length > 0) {
      // 初期データがあればスキップ
      return;
    }

    const initConversation = async () => {
      if (selectedChat.type !== "ai") return;

      try {
        // 会話を取得or作成（Server Action、401エラー時に自動リフレッシュ）
        const convResult = await getOrCreateConversationWithAuth(
          selectedChat.id
        );

        if (convResult.success && convResult.data) {
          const conversation = convResult.data as { id: string };
          setConversationId(conversation.id);

          // メッセージ履歴を読み込む
          await loadMessages(conversation.id);
        } else {
          console.error("会話の初期化に失敗しました:", convResult.error);
        }
      } catch (error) {
        console.error("Error initializing conversation:", error);
      }
    };

    const loadMessages = async (convId: string) => {
      try {
        const result = await getMessagesWithAuth(convId, MESSAGE_LIMIT);

        if (result.success && result.data) {
          const data = result.data as { messages: Message[] };
          const messages = data.messages || [];

          // 開発環境でのみデバッグログを出力
          if (process.env.NODE_ENV === "development") {
            console.debug("Loaded messages:", messages);
            // ツール使用履歴のデバッグ
            messages.forEach((msg: Message, index: number) => {
              if (msg.tool_usages && msg.tool_usages.length > 0) {
                console.debug(`Message ${index} tool_usages:`, msg.tool_usages);
              }
            });
          }
          setMessages(messages);
        } else {
          console.error("Error loading messages:", result.error);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    initConversation();
  }, [selectedChat, initialConversationId, initialMessages]);

  // 自動スクロールを無効化（メッセージ送信時は画面上部に固定）
  // useEffect(() => {
  //   if (messages.length > 0) {
  //     requestAnimationFrame(() => {
  //       messagesEndRef.current?.scrollIntoView({
  //         behavior: "smooth",
  //         block: "end",
  //       });
  //     });
  //   }
  // }, [messages]);

  // ストリーミング中の自動スクロールを無効化（UX改善）
  // useEffect(() => {
  //   if (isStreaming && streamingContent) {
  //     requestAnimationFrame(() => {
  //       messagesEndRef.current?.scrollIntoView({
  //         behavior: "smooth",
  //         block: "end",
  //       });
  //     });
  //   }
  // }, [streamingContent, isStreaming]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // テキストエリアの高さを自動調整（最大10行まで）
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 高さをリセットして正確な scrollHeight を取得
    textarea.style.height = "auto";

    const maxHeight = LINE_HEIGHT * MAX_TEXTAREA_LINES;

    // 内容に応じた高さを計算
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // メンション候補を検出
  const detectMention = useCallback(
    (text: string, cursorPos: number) => {
      if (!isGroupChat || !selectedChat.members) return;

      const beforeCursor = text.substring(0, cursorPos);
      const mentionMatch = beforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setMentionCursorPosition(cursorPos);
        setShowMentionSuggestions(true);
        setSelectedMentionIndex(0); // リセット
      } else {
        setShowMentionSuggestions(false);
        setSelectedMentionIndex(0);
      }
    },
    [isGroupChat, selectedChat.members]
  );

  // メンション補完を挿入
  const insertMention = useCallback(
    (agentName: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const beforeCursor = newMessage.substring(0, mentionCursorPosition);
      const afterCursor = newMessage.substring(mentionCursorPosition);

      // @を含む部分を置換
      const beforeMention = beforeCursor.replace(/@\w*$/, `@${agentName} `);
      const newText = beforeMention + afterCursor;

      setNewMessage(newText);
      setShowMentionSuggestions(false);

      // カーソル位置を調整
      setTimeout(() => {
        const newCursorPos = beforeMention.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    },
    [newMessage, mentionCursorPosition]
  );

  // テキストエリアfocus時のハンドラー（自動スクロールなし）
  const handleInputFocus = useCallback(() => {
    // 何もしない（ユーザーが自分でスクロール位置を管理）
  }, []);

  // スタンプピッカー外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showStampPicker) {
        const target = event.target as HTMLElement;
        // スタンプピッカーとSmileボタン以外をクリックしたら閉じる
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

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || (isLoading && !isStreaming) || !conversationId)
      return;

    // トークン制限をチェック
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/billing/check-limit`
      );

      if (response.ok) {
        const limitCheck = await response.json();

        if (!limitCheck.can_send) {
          // トークン制限に達している場合、モーダルを表示
          setTokenLimitData({
            tier: limitCheck.current_tier,
            tokensUsed: limitCheck.tokens_used,
            tokensLimit: limitCheck.tokens_limit,
            usagePercentage: limitCheck.usage_percentage,
            periodEnd: limitCheck.period_end,
          });
          setShowTokenLimitModal(true);
          return; // メッセージ送信をブロック
        }
      } else {
        console.error("Failed to check token limit:", await response.text());
        // エラー時は送信を許可（フェイルオープン）
      }
    } catch (error) {
      console.error("Error checking token limit:", error);
      // エラー時は送信を許可（フェイルオープン）
    }

    const messageContent = newMessage.trim();
    setNewMessage("");

    // 質問候補をクリア
    setSuggestedQuestions([]);

    // textareaの高さをリセット
    if (textareaRef.current) {
      textareaRef.current.style.height = "48px";
    }

    // ユーザーメッセージを即座に表示
    const tempMessageId = `temp-${Date.now()}`;
    const tempUserMessage: Message = {
      id: tempMessageId,
      content: messageContent,
      sender_type: "user",
      sender_id: "current-user",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    // メッセージ送信後、最下部にスクロール
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    });

    // サイドバーにユーザーメッセージを表示（少し遅延を入れてDBの書き込みを待つ）
    setTimeout(() => {
      router.refresh();
    }, 500);

    if (isGroupChat) {
      // グループチャット: グループチャット用ストリーミングAPIを使用
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingTools([]);
      streamingContentRef.current = "";

      try {
        const accessToken = getCookie("access_token") || null;

        // @メンションからエージェントIDを抽出
        const mentionedAgentIds: string[] = [];
        if (selectedChat.members) {
          const mentionMatches = messageContent.matchAll(/@(\w+)/g);
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

        await sendGroupChatMessageStream(
          conversationId,
          messageContent,
          accessToken,
          (event: StreamEvent) => {
            // グループチャットのイベント処理
            switch (event.type) {
              case "token":
                setStreamingContent((prev) => {
                  const newContent = prev + (event.content || "");
                  streamingContentRef.current = newContent;
                  return newContent;
                });
                break;
              case "done":
                // ストリーミング完了
                setTimeout(() => {
                  router.refresh();
                  setIsStreaming(false);
                  setStreamingContent("");
                  setStreamingTools([]);
                }, STREAMING_DELAY);
                break;
              case "error":
                console.error("Group chat streaming error:", event.message);
                setMessages((prev) =>
                  prev.filter((m) => m.id !== tempMessageId)
                );
                setIsStreaming(false);
                setStreamingContent("");
                setStreamingTools([]);
                showToast({
                  message:
                    "メッセージの送信中にエラーが発生しました。もう一度お試しください。",
                  type: "error",
                  duration: 5000,
                });
                break;
            }
          },
          (error: string) => {
            console.error("Group chat streaming error:", error);
            setIsStreaming(false);
            setStreamingContent("");
            setStreamingTools([]);
            setMessages((prev) =>
              prev.filter((m) => m.id !== tempUserMessage.id)
            );
            showToast({
              message: `グループメッセージの送信に失敗しました: ${error}`,
              type: "error",
              duration: 5000,
            });
          },
          mentionedAgentIds
        );
      } catch (error) {
        console.error("Error in group chat streaming:", error);
        setIsStreaming(false);
        setStreamingContent("");
        setStreamingTools([]);
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
        showToast({
          message:
            "グループメッセージの送信に失敗しました。もう一度お試しください。",
          type: "error",
          duration: 5000,
        });
      }
    } else if (selectedChat.type === "ai") {
      // AIチャット: ストリーミングAPIを使用（非ストリーミングも自動処理）
      // Cookieは自動的にリクエストに含まれる（credentials: 'include'）
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingTools([]);
      streamingContentRef.current = ""; // refもリセット
      // 1対1チャットの場合、エージェント情報を設定
      setStreamingAgentName(selectedChat.name);
      setStreamingAgentIcon(selectedChat.avatar_url || "");

      try {
        // アクセストークンを取得
        const accessToken = getCookie("access_token") || null;

        await sendMessageStream(
          conversationId,
          messageContent,
          accessToken,
          (event: StreamEvent) => {
            switch (event.type) {
              case "token":
                setStreamingContent((prev) => {
                  const newContent = prev + (event.content || "");
                  streamingContentRef.current = newContent; // refも更新
                  return newContent;
                });
                break;
              case "tool_start":
                setStreamingTools((prev) => {
                  const toolId = event.tool_id;
                  if (!toolId) {
                    console.warn(
                      "Tool start event received without tool_id:",
                      event
                    );
                    return prev;
                  }

                  // 同じtool_idのツールが既に存在するかチェック
                  const existingTool = prev.find(
                    (tool) => tool.tool_id === toolId
                  );

                  if (existingTool) {
                    // 既に存在する場合は更新のみ（重複防止）
                    console.debug(`Updating existing tool: ${toolId}`);
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
                    // 新しいツールを追加
                    console.debug(`Adding new tool: ${toolId}`);
                    return [
                      ...prev,
                      {
                        tool_id: toolId,
                        tool_name: event.tool_name || "",
                        status: "running",
                        input: event.input || "",
                        expanded: false,
                        // Backend-Pythonから送られてくる位置を使用（より正確）
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
                  if (!toolId) {
                    console.warn(
                      "Tool end event received without tool_id:",
                      event
                    );
                    return prev;
                  }

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
                // ストリーミング完了: ツール位置情報をDBに保存してメッセージをリロード
                setTimeout(async () => {
                  // ツールの位置情報を記録
                  const toolPositions: Record<string, number> = {};
                  streamingTools.forEach((tool) => {
                    if (tool.insertPosition !== undefined) {
                      toolPositions[tool.tool_name] = tool.insertPosition;
                    }
                  });

                  const result = await getMessagesWithAuth(
                    conversationId,
                    MESSAGE_LIMIT
                  );
                  if (result.success && result.data) {
                    const data = result.data as { messages: Message[] };
                    const newMessages = data.messages || [];

                    // サイドバーの会話リストを更新（リアルタイム反映）
                    router.refresh();

                    // 最新のAIメッセージ（今ストリーミングしたもの）を見つけて、ツール位置情報をDBに保存
                    if (newMessages.length > 0) {
                      const latestAIMessage = newMessages.find(
                        (msg: Message) =>
                          msg.sender_type === "ai" &&
                          msg.tool_usages &&
                          msg.tool_usages.length > 0
                      );

                      if (latestAIMessage && latestAIMessage.tool_usages) {
                        // ToolUsageID -> InsertPosition のマッピングを作成
                        const positions: Record<string, number> = {};

                        latestAIMessage.tool_usages.forEach(
                          (toolUsage: ToolUsage) => {
                            if (
                              toolPositions[toolUsage.tool_name] !== undefined
                            ) {
                              positions[toolUsage.id] =
                                toolPositions[toolUsage.tool_name];
                            }
                          }
                        );

                        // APIを呼び出してDBを更新
                        if (Object.keys(positions).length > 0) {
                          try {
                            const response = await fetch(
                              `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/conversations/${conversationId}/messages/${latestAIMessage.id}/tools/positions`,
                              {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                credentials: "include",
                                body: JSON.stringify({ positions }),
                              }
                            );

                            if (!response.ok) {
                              console.error(
                                "Failed to update tool positions:",
                                await response.text()
                              );
                            }
                          } catch (error) {
                            console.error(
                              "Error updating tool positions:",
                              error
                            );
                          }
                        }
                      }
                    }

                    setMessages(newMessages);
                    // メッセージ更新後、即座にストリーミング状態を終了
                    setIsStreaming(false);
                    setStreamingContent("");
                    setStreamingTools([]);
                  } else {
                    // メッセージ取得に失敗した場合もストリーミング状態を終了
                    setIsStreaming(false);
                    setStreamingContent("");
                    setStreamingTools([]);
                  }
                }, STREAMING_DELAY);
                break;
              case "error":
                console.error("Streaming error:", event.message);
                // エラー時は一時的なユーザーメッセージも削除
                setMessages((prev) =>
                  prev.filter((m) => m.id !== tempMessageId)
                );
                setIsStreaming(false);
                setStreamingContent("");
                setStreamingTools([]);
                // ユーザーフレンドリーなエラーメッセージを表示
                showToast({
                  message:
                    "メッセージの送信中にエラーが発生しました。もう一度お試しください。",
                  type: "error",
                  duration: 5000,
                });
                break;
            }
          },
          (error: string) => {
            console.error("Streaming error:", error);
            setIsStreaming(false);
            setStreamingContent("");
            setStreamingTools([]);
            setMessages((prev) =>
              prev.filter((m) => m.id !== tempUserMessage.id)
            );
            showToast({
              message: `メッセージの送信に失敗しました: ${error}`,
              type: "error",
              duration: 5000,
            });
          }
        );
      } catch (error) {
        console.error("Error in streaming:", error);
        setIsStreaming(false);
        setStreamingContent("");
        setStreamingTools([]);
        // オプティミスティックUIで追加したメッセージを削除
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
        // エラー通知を表示
        showToast({
          message: "メッセージの送信に失敗しました。もう一度お試しください。",
          type: "error",
          duration: 5000,
        });
      }
    }
  }, [
    newMessage,
    isLoading,
    isStreaming,
    conversationId,
    selectedChat.type,
    isGroupChat,
    getOrCreateConversationWithAuth,
    sendMessageWithAuth,
    router,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd+Enter（Mac）またはCtrl+Enter（Windows）で送信
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSendMessage();
      }
      // 通常のEnterキーは改行として処理（デフォルト動作）
    },
    [handleSendMessage]
  );

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    // 午前/午後表記で時刻を表示
    return date.toLocaleTimeString("ja-JP", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  const handleStampSelect = (stamp: string) => {
    // スタンプをメッセージ入力欄に追加
    setNewMessage((prev) => prev + stamp);
    // スタンプピッカーは開いたまま（ユーザーが✖️ボタンまたは外側をクリックするまで）
  };

  const handleGenerateSuggestions = async () => {
    if (isGeneratingSuggestions || isStreaming) return;

    // グループチャットか1対1チャットかで分岐
    const chatId = isGroupChat ? selectedChat.id : conversationId;
    if (!chatId) return;

    setIsGeneratingSuggestions(true);
    try {
      let result;
      if (isGroupChat) {
        // グループチャット用のAPI呼び出し
        const { generateSuggestedQuestions } = await import("@/lib/api/group-chat");
        result = await generateSuggestedQuestions(chatId, 10);
      } else {
        // 1対1チャット用のAPI呼び出し
        result = await generateConversationSuggestedQuestions(chatId, 10);
      }
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
    textareaRef.current?.focus();
  };

  return (
    <div className="flex overflow-hidden overscroll-none flex-col flex-1">
      {/* メッセージエリア */}
      <div
        ref={messagesContainerRef}
        role="log"
        aria-live="polite"
        aria-label="チャットメッセージ"
        className="overflow-y-auto overflow-x-hidden flex-1 pt-4 px-3 pb-0 md:px-4 w-full bg-gray-50 dark:bg-gray-900 lg:pt-6 lg:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] overscroll-contain touch-pan-y"
      >
        <div className="space-y-4 md:space-y-6">
          {messages.map((message, index) => {
            // 前のメッセージと日付が異なる場合、日付セパレーターを表示
            const showDateSeparator =
              index === 0 ||
              !isSameDay(
                new Date(messages[index - 1].created_at),
                new Date(message.created_at)
              );

            return (
              <div key={message.id}>
                {/* 日付セパレーター */}
                {showDateSeparator && isClient && (
                  <div
                    className="flex justify-center items-center my-6 animate-fadeIn"
                    role="separator"
                    aria-label={`日付: ${formatDateSeparator(
                      message.created_at
                    )}`}
                  >
                    <div className="px-3 py-1 text-xs text-gray-500 rounded-full shadow-sm backdrop-blur-sm transition-all bg-gray-100/80 dark:text-gray-400 dark:bg-gray-800/80 hover:scale-105">
                      {formatDateSeparator(message.created_at)}
                    </div>
                  </div>
                )}

                {/* メッセージ */}
                <div
                  id={`message-${message.id}`}
                  className={`flex ${
                    message.sender_type === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`flex items-end space-x-2 md:space-x-3 ${
                      message.sender_type === "user"
                        ? "flex-row-reverse space-x-reverse max-w-[90%] md:max-w-[75%]"
                        : "max-w-[90%] md:max-w-[75%] overflow-hidden"
                    }`}
                  >
                    {message.sender_type === "user" ? (
                      /* 自分のメッセージ（右側） */
                      <div className="flex flex-row-reverse flex-1 items-start space-x-3 space-x-reverse min-w-0">
                        {/* 自分のアイコン */}
                        <div className="flex overflow-hidden flex-shrink-0 justify-center items-center w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-md md:w-10 md:h-10 shadow-green-500/40">
                          {currentUser?.avatar_url ? (
                            <img
                              src={currentUser.avatar_url}
                              alt={
                                currentUser.display_name || currentUser.username
                              }
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <span className="text-xs font-medium text-white md:text-sm">
                              {(
                                currentUser?.display_name ||
                                currentUser?.username ||
                                "U"
                              ).charAt(0)}
                            </span>
                          )}
                        </div>

                        {/* 右側のコンテンツ */}
                        <div className="flex overflow-hidden flex-col flex-1 items-end space-y-1 min-w-0 max-w-full">
                          {/* 名前 */}
                          <span className="text-xs font-medium text-gray-600 md:text-sm dark:text-gray-400">
                            {currentUser?.display_name ||
                              currentUser?.username ||
                              "あなた"}
                          </span>

                          <div className="flex space-x-1 min-w-0 max-w-full">
                            {/* タイムスタンプ（吹き出しの左側、下） */}
                            <span className="flex-shrink-0 self-end pb-1 text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
                              {isClient
                                ? formatTime(message.created_at)
                                : "--:--"}
                            </span>

                            {/* メッセージバブル */}
                            <div
                              className={cn(
                                "overflow-hidden px-3 py-2 min-w-0 max-w-full break-words rounded-2xl rounded-tr-sm shadow-sm md:px-4 md:py-3",
                                "text-white bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30"
                              )}
                            >
                              <div className="max-w-full text-sm leading-relaxed break-words lg:text-base overflow-wrap-anywhere word-break-break-word markdown-chat">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={markdownComponents}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* AIメッセージ（左側） - StreamingMessageコンポーネントを使用 */
                      <StreamingMessage
                        content={message.content}
                        tools={
                          message.tool_usages
                            ? message.tool_usages.map((toolUsage) => ({
                                tool_id: toolUsage.id,
                                tool_name: toolUsage.tool_name,
                                status: toolUsage.status,
                                input: JSON.parse(toolUsage.input_data),
                                output: toolUsage.output_data,
                                error: toolUsage.error_message,
                                execution_time_ms: toolUsage.execution_time_ms,
                                insertPosition: toolUsage.insert_position,
                                expanded: false,
                              }))
                            : []
                        }
                        avatarUrl={
                          isGroupChat
                            ? message.sender_icon || undefined
                            : message.sender_icon || selectedChat.avatar_url
                        }
                        name={message.sender_name || selectedChat.name}
                        showCursor={false}
                        agentId={message.sender_id || selectedChat.id}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ストリーミングメッセージ（最初のトークンが来てから表示） */}
          {isStreaming && streamingContent && (
            <>
              {/* ストリーミングメッセージの日付セパレーター（最後のメッセージと日付が異なる場合） */}
              {isClient &&
                messages.length > 0 &&
                !isSameDay(
                  new Date(messages[messages.length - 1].created_at),
                  new Date()
                ) && (
                  <div
                    className="flex justify-center items-center my-6 animate-fadeIn"
                    role="separator"
                    aria-label={`日付: ${formatDateSeparator(
                      new Date().toISOString()
                    )}`}
                  >
                    <div className="px-3 py-1 text-xs text-gray-500 rounded-full shadow-sm backdrop-blur-sm transition-all bg-gray-100/80 dark:text-gray-400 dark:bg-gray-800/80 hover:scale-105">
                      {formatDateSeparator(new Date().toISOString())}
                    </div>
                  </div>
                )}
              <div className="flex justify-start">
                <div className="flex items-end space-x-2 md:space-x-3 max-w-[90%] md:max-w-[75%] overflow-hidden">
                  <StreamingMessage
                    content={streamingContent}
                    tools={streamingTools}
                    avatarUrl={
                      isGroupChat
                        ? streamingAgentIcon || undefined
                        : selectedChat.avatar_url && avatarTimestamp
                        ? `${
                            selectedChat.avatar_url.split("?")[0]
                          }?t=${avatarTimestamp}`
                        : selectedChat.avatar_url
                    }
                    name={
                      isGroupChat
                        ? streamingAgentName || selectedChat.name
                        : selectedChat.name
                    }
                    showCursor={true}
                    agentId={selectedChat.id}
                  />
                </div>
              </div>
            </>
          )}

          {/* ローディングインジケーター（ストリーミング開始前 or 非ストリーミング） */}
          {/* グループチャットの場合、streamingAgentNameが設定されるまで表示しない */}
          {((isStreaming &&
            !streamingContent &&
            (!isGroupChat || streamingAgentName)) ||
            (isLoading && !isStreaming)) && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2 md:space-x-3 max-w-[90%] md:max-w-[75%] overflow-hidden">
                {/* アイコン - グループチャットの場合はstreamingAgentIconを使用、1対1の場合はselectedChatを使用 */}
                <div className="flex overflow-hidden flex-shrink-0 justify-center items-center w-8 h-8 bg-green-500 rounded-full md:w-10 md:h-10">
                  {(
                    isGroupChat ? streamingAgentIcon : selectedChat.avatar_url
                  ) ? (
                    <img
                      src={
                        isGroupChat && streamingAgentIcon
                          ? streamingAgentIcon
                          : selectedChat.avatar_url && avatarTimestamp
                          ? `${
                              selectedChat.avatar_url.split("?")[0]
                            }?t=${avatarTimestamp}`
                          : selectedChat.avatar_url || ""
                      }
                      alt={isGroupChat ? streamingAgentName : selectedChat.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-xs font-medium text-white md:text-sm">
                      {(isGroupChat
                        ? streamingAgentName
                        : selectedChat.name
                      ).charAt(0)}
                    </span>
                  )}
                </div>

                {/* 名前 + バブル（通常AIメッセージと合わせる） */}
                <div className="flex overflow-hidden flex-col space-y-1 min-w-0 max-w-full">
                  <span className="text-xs font-medium text-gray-600 md:text-sm dark:text-gray-400">
                    {isGroupChat && streamingAgentName
                      ? streamingAgentName
                      : selectedChat.name}
                  </span>
                  {/* 入力中バブル（固定幅） */}
                  <div className="px-4 py-3 w-20 text-gray-900 bg-white rounded-2xl rounded-tl-sm border border-gray-200 shadow-sm dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex justify-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce dark:bg-gray-500"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce dark:bg-gray-500"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce dark:bg-gray-500"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 最後のメッセージと入力欄の間のスペース */}
          <div ref={messagesEndRef} className="pb-4" />
        </div>
      </div>

      {/* 入力エリア */}
      {isGroupChat && selectedChat.members ? (
        <>
          {/* グループチャット用: 質問候補生成ボタン */}
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

          {/* グループチャット用: 質問候補カード（2x2グリッド） */}
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
            members={selectedChat.members.map((m) => ({
              id: m.id,
              group_chat_id: selectedChat.id,
              ai_agent_id: m.id,
              ai_agent_name: m.name,
              ai_agent_icon: m.avatar_url,
              ai_agent_model: "",
              display_order: 0,
              created_at: "",
            }))}
            value={newMessage}
            onValueChange={setNewMessage}
            onSend={async (
              content: string,
              mentions: "all" | MentionInput[]
            ) => {
              // GroupMessageInputから送信されたメッセージを処理
              console.log("[ChatWindow] GroupMessageInput onSend called:", {
                content,
                mentions,
              });

              // トークン制限をチェック
              try {
                const response = await authFetch(
                  `${process.env.NEXT_PUBLIC_API_BASE_URL}/billing/check-limit`
                );

                if (response.ok) {
                  const limitCheck = await response.json();

                  if (!limitCheck.can_send) {
                    // トークン制限に達している場合、モーダルを表示
                    setTokenLimitData({
                      tier: limitCheck.current_tier,
                      tokensUsed: limitCheck.tokens_used,
                      tokensLimit: limitCheck.tokens_limit,
                      usagePercentage: limitCheck.usage_percentage,
                      periodEnd: limitCheck.period_end,
                    });
                    setShowTokenLimitModal(true);
                    return; // メッセージ送信をブロック
                  }
                } else {
                  console.error(
                    "Failed to check token limit:",
                    await response.text()
                  );
                  // エラー時は送信を許可（フェイルオープン）
                }
              } catch (error) {
                console.error("Error checking token limit:", error);
                // エラー時は送信を許可（フェイルオープン）
              }

              setIsStreaming(true);
              setStreamingContent("");
              setStreamingTools([]);
              setNewMessage("");
              setSuggestedQuestions([]); // 質問候補をクリア
              // エージェント情報をリセット（agent_preparing/agent_startイベントで設定される）
              setStreamingAgentName("");
              setStreamingAgentIcon("");

              // ユーザーメッセージを即座に表示
              const tempUserMessage = {
                id: `temp-${Date.now()}`,
                conversation_id: selectedChat.id,
                sender_type: "user" as const,
                sender_id: "current-user",
                content,
                created_at: new Date().toISOString(),
                tool_usages: [],
              };
              console.log(
                "[ChatWindow] Adding temp user message:",
                tempUserMessage
              );
              setMessages((prev) => [...prev, tempUserMessage]);

              try {
                sendGroupMessageStream(
                  selectedChat.id,
                  { content, mentions }, // payloadオブジェクトとして渡す
                  (event: any) => {
                    console.log("[ChatWindow] Group chat stream event:", event);

                    switch (event.event) {
                      case "user_message_saved":
                        // ユーザーメッセージが保存された - tempメッセージを実際のIDに置き換え
                        setMessages((prev) => {
                          const filtered = prev.filter(
                            (m) => !m.id.startsWith("temp-")
                          );
                          return [
                            ...filtered,
                            {
                              ...tempUserMessage,
                              id: event.data.message_id,
                              created_at: event.data.created_at,
                            },
                          ];
                        });
                        break;

                      case "agent_start":
                      case "agent_preparing":
                        // エージェントの処理開始 - ストリーミングコンテンツをリセット
                        setStreamingContent("");
                        // グループチャットの場合、イベントデータからエージェント情報を取得
                        // 1対1チャットの場合、selectedChatの情報を使用
                        if (isGroupChat && event.data) {
                          setStreamingAgentName(event.data.agent_name || "");
                          setStreamingAgentIcon(event.data.agent_icon || "");
                        } else {
                          setStreamingAgentName(selectedChat.name);
                          setStreamingAgentIcon(selectedChat.avatar_url || "");
                        }
                        break;

                      case "agent_chunk":
                        // ストリーミングチャンク - streamingContentステートに追加
                        setStreamingContent(
                          (prev) => prev + (event.data.content || "")
                        );
                        break;

                      case "agent_complete":
                        // エージェントの処理完了 - 完成したメッセージをmessages配列に追加
                        console.log(
                          "[ChatWindow] agent_complete event:",
                          event.data
                        );
                        const newMessage = {
                          id: event.data.message_id,
                          conversation_id: selectedChat.id,
                          sender_type: "ai" as const,
                          sender_id: event.data.agent_id,
                          sender_name: event.data.agent_name || "AI Agent",
                          sender_icon: event.data.agent_icon || "",
                          content: event.data.content,
                          created_at: new Date().toISOString(),
                          tool_usages: [],
                        };
                        console.log("[ChatWindow] Adding message:", newMessage);
                        setMessages((prev) => [...prev, newMessage]);
                        // ストリーミングコンテンツをリセット
                        setStreamingContent("");
                        break;

                      case "all_complete":
                        // 全完了
                        setIsStreaming(false);
                        setStreamingContent("");
                        setStreamingTools([]);
                        // メッセージを再読み込み
                        router.refresh();
                        break;
                    }
                  },
                  (error: Error) => {
                    console.error(
                      "[ChatWindow] Group chat stream error:",
                      error
                    );
                    setMessages((prev) =>
                      prev.filter((m) => !m.id.startsWith("temp-"))
                    );
                    showToast({
                      message: error.message || "メッセージの送信に失敗しました",
                      type: "error",
                    });
                    setIsStreaming(false);
                    setStreamingContent("");
                    setStreamingTools([]);
                  },
                  () => {
                    // onComplete コールバック
                    console.log("[ChatWindow] Group chat stream complete");
                    setIsStreaming(false);
                    setStreamingContent("");
                    setStreamingTools([]);
                  }
                );
              } catch (error: any) {
                console.error("[ChatWindow] Send error:", error);
                setMessages((prev) =>
                  prev.filter((m) => !m.id.startsWith("temp-"))
                );
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
      ) : (
        <>
          {/* 質問候補生成ボタン */}
          <div className="flex-shrink-0 px-4 pt-2 pb-1 bg-gray-50 border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <button
                onClick={handleGenerateSuggestions}
                disabled={
                  isGeneratingSuggestions ||
                  isStreaming ||
                  messages.length === 0
                }
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all duration-200",
                  isGeneratingSuggestions ||
                    isStreaming ||
                    messages.length === 0
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

          {/* 質問候補カード（2x2グリッド） */}
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
              {/* 統合されたモダンな入力コンテナ */}
              <div
                className={cn(
                  "flex flex-col gap-2 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600",
                  "transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500 dark:focus-within:ring-emerald-500 focus-within:border-green-500 dark:focus-within:border-emerald-500"
                )}
              >
                {/* テキストエリア */}
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    adjustTextareaHeight();
                    if (isGroupChat) {
                      detectMention(e.target.value, e.target.selectionStart);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (showMentionSuggestions) {
                      const filteredMembers =
                        selectedChat.members?.filter((member) =>
                          member.name
                            .toLowerCase()
                            .includes(mentionQuery.toLowerCase())
                        ) || [];

                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setSelectedMentionIndex((prev) =>
                          prev < filteredMembers.length - 1 ? prev + 1 : prev
                        );
                        return;
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setSelectedMentionIndex((prev) =>
                          prev > 0 ? prev - 1 : 0
                        );
                        return;
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        if (filteredMembers[selectedMentionIndex]) {
                          insertMention(
                            filteredMembers[selectedMentionIndex].name
                          );
                        }
                        return;
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setShowMentionSuggestions(false);
                        return;
                      }
                    }
                    handleKeyDown(e);
                  }}
                  onFocus={handleInputFocus}
                  placeholder={
                    isMobile
                      ? "メッセージを入力..."
                      : "メッセージを入力...（Cmd/Ctrl+Enterで送信）"
                  }
                  className={cn(
                    "px-0 py-0 w-full bg-transparent border-0 resize-none",
                    "overflow-y-auto overflow-x-hidden focus:outline-none",
                    // iOS自動ズーム防止のためモバイルで16px以上
                    "text-base placeholder-gray-500 text-gray-900 dark:placeholder-gray-400 dark:text-gray-100"
                  )}
                  rows={1}
                  inputMode="text"
                  enterKeyHint="send"
                  style={{ minHeight: "32px", lineHeight: "24px" }}
                  disabled={isLoading || isStreaming}
                />

                {/* ボタン類 */}
                <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex gap-1 items-center">
                    {/* ファイル添付ボタン */}
                    <button
                      className="p-1.5 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-green-500 dark:hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                      aria-label="ファイルを添付"
                      title="ファイルを添付"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    {/* スマイルボタン */}
                    <button
                      data-smile-button
                      onClick={() => setShowStampPicker(!showStampPicker)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        showStampPicker
                          ? "text-green-500 bg-green-50 dark:text-emerald-500 dark:bg-green-500/10"
                          : "text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                      )}
                      aria-label={
                        showStampPicker
                          ? "スタンプピッカーを閉じる"
                          : "スタンプを選択"
                      }
                      title="スタンプを選択"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 送信ボタン */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isLoading || isStreaming}
                    aria-label="メッセージを送信"
                    title="送信（Cmd/Ctrl+Enter）"
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

              {/* スタンプピッカー */}
              {showStampPicker && (
                <StampPicker
                  onSelectStamp={handleStampSelect}
                  onClose={() => setShowStampPicker(false)}
                />
              )}

              {/* メンション補完 */}
              {showMentionSuggestions &&
                isGroupChat &&
                selectedChat.members && (
                  <div className="overflow-hidden absolute right-0 left-0 bottom-full mb-2 bg-white rounded-lg border border-gray-200 shadow-lg dark:bg-gray-800 dark:border-gray-700">
                    <div className="overflow-y-auto max-h-48">
                      {selectedChat.members
                        .filter((member) =>
                          member.name
                            .toLowerCase()
                            .includes(mentionQuery.toLowerCase())
                        )
                        .map((member, index) => (
                          <button
                            key={member.id}
                            onClick={() => insertMention(member.name)}
                            className={cn(
                              "flex gap-3 items-center px-4 py-2 w-full text-left transition-colors",
                              index === selectedMentionIndex
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700"
                            )}
                          >
                            <div className="flex overflow-hidden flex-shrink-0 justify-center items-center w-8 h-8 bg-green-500 rounded-full">
                              {member.avatar_url ? (
                                <img
                                  src={member.avatar_url}
                                  alt={member.name}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <span className="text-xs font-medium text-white">
                                  {member.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                @{member.name}
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </>
      )}

      {/* トークン制限モーダル */}
      {tokenLimitData && (
        <TokenLimitModal
          isOpen={showTokenLimitModal}
          onClose={() => setShowTokenLimitModal(false)}
          tier={tokenLimitData.tier}
          tokensUsed={tokenLimitData.tokensUsed}
          tokensLimit={tokenLimitData.tokensLimit}
          usagePercentage={tokenLimitData.usagePercentage}
          periodEnd={tokenLimitData.periodEnd}
        />
      )}
    </div>
  );
}
