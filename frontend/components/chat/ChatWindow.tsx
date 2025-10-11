import { useState, useRef, useEffect } from "react";
import { Send, Smile, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  getOrCreateConversation,
  getMessages,
  sendMessage as serverSendMessage,
} from "@/lib/actions/conversation-actions";
import { useServerActionsWithAuth } from "@/lib/hooks/useServerActionWithAuth";
import { getProfile } from "@/lib/actions/user-actions";

interface Message {
  id: string;
  content: string;
  sender_type: "user" | "ai";
  sender_id: string;
  created_at: string;
}

interface SelectedChat {
  id: string;
  name: string;
  avatar_url?: string;
  type: "human" | "ai";
  status: "online" | "offline";
  personality_preset?: string;
}

interface ChatWindowProps {
  selectedChat: SelectedChat;
}

interface UserProfile {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

/**
 * チャットウィンドウコンポーネント - 完璧に統一されたデザインシステム
 */
export function ChatWindow({ selectedChat }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 401エラー時に自動リフレッシュ（複数のServer Actionsをラップ）
  const {
    getOrCreateConversation: getOrCreateConversationWithAuth,
    getMessages: getMessagesWithAuth,
    sendMessage: sendMessageWithAuth,
    getProfile: getProfileWithAuth,
  } = useServerActionsWithAuth({
    getOrCreateConversation,
    getMessages,
    sendMessage: serverSendMessage,
    getProfile,
  });

  // 現在のユーザー情報を取得
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const result = await getProfileWithAuth();
        if (result.success && result.data) {
          setCurrentUser({
            username: result.data.username,
            display_name: result.data.display_name,
            avatar_url: result.data.avatar_url,
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  // 会話を初期化してメッセージを取得
  useEffect(() => {
    const initConversation = async () => {
      if (selectedChat.type !== "ai") return;

      try {
        // 会話を取得or作成（Server Action、401エラー時に自動リフレッシュ）
        const convResult = await getOrCreateConversationWithAuth(
          selectedChat.id
        );

        if (convResult.success && convResult.data) {
          setConversationId(convResult.data.id);

          // メッセージ履歴を読み込む
          await loadMessages(convResult.data.id);
        } else {
          console.error("会話の初期化に失敗しました:", convResult.error);
        }
      } catch (error) {
        console.error("Error initializing conversation:", error);
      }
    };

    const loadMessages = async (convId: string) => {
      try {
        const result = await getMessagesWithAuth(convId, 50);

        if (result.success && result.data) {
          setMessages(result.data.messages || []);
          // メッセージ読み込み後、即座に最下部にスクロール
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
          }, 0);
        } else {
          console.error("Error loading messages:", result.error);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    initConversation();
  }, [selectedChat]);

  // 新しいメッセージが追加されたときに最下部にスクロール
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isLoading || !conversationId) return;

    const messageContent = newMessage.trim();
    setNewMessage("");

    // ユーザーメッセージを即座に表示
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_type: "user",
      sender_id: "current-user",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    if (selectedChat.type === "ai") {
      setIsLoading(true);

      try {
        // Server Actionでメッセージ送信（401エラー時に自動リフレッシュ）
        const result = await sendMessageWithAuth(
          conversationId,
          messageContent
        );

        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to send message");
        }

        const data = result.data;

        // 実際のメッセージIDで更新し、AI応答を追加
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
          return [...filtered, data.user_message, data.ai_message];
        });
      } catch (error) {
        console.error("Error sending message:", error);
        // エラー時は一時メッセージを削除
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
        alert("メッセージの送信に失敗しました");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* メッセージエリア */}
      <div className="overflow-y-auto flex-1 p-4 bg-gray-50 dark:bg-gray-900 lg:p-6">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_type === "user" ? "justify-end" : "justify-start"
              } px-2 mb-10`}
            >
              <div
                className={`flex items-end space-x-4 max-w-[75%] lg:max-w-[60%] ${
                  message.sender_type === "user"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                {message.sender_type === "user" ? (
                  /* 自分のメッセージ（右側） */
                  <div className="flex flex-row-reverse items-start space-x-3 space-x-reverse max-w-full">
                    {/* 自分のアイコン */}
                    <div className="flex overflow-hidden flex-shrink-0 justify-center items-center w-10 h-10 bg-blue-500 rounded-full">
                      {currentUser?.avatar_url ? (
                        <img
                          src={currentUser.avatar_url}
                          alt={currentUser.display_name || currentUser.username}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-sm font-medium text-white">
                          {(
                            currentUser?.display_name ||
                            currentUser?.username ||
                            "U"
                          ).charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* 右側のコンテンツ */}
                    <div className="flex flex-col flex-1 items-end space-y-1 min-w-0">
                      {/* 名前 */}
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {currentUser?.display_name ||
                          currentUser?.username ||
                          "あなた"}
                      </span>

                      {/* メッセージバブル */}
                      <div
                        className={cn(
                          "px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm",
                          "text-white bg-blue-500"
                        )}
                      >
                        <p className="text-sm leading-relaxed break-words lg:text-base">
                          {message.content}
                        </p>
                        <p className="mt-1 text-xs text-blue-100">
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 相手のメッセージ（左側） */
                  <div className="flex items-start space-x-3 max-w-full">
                    {/* アイコン */}
                    <div className="flex overflow-hidden flex-shrink-0 justify-center items-center w-10 h-10 bg-green-500 rounded-full">
                      {selectedChat.avatar_url ? (
                        <img
                          src={selectedChat.avatar_url}
                          alt={selectedChat.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-sm font-medium text-white">
                          {selectedChat.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* 右側のコンテンツ */}
                    <div className="flex flex-col flex-1 space-y-1 min-w-0">
                      {/* 名前 */}
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {selectedChat.name}
                      </span>

                      {/* メッセージバブル */}
                      <div
                        className={cn(
                          "text-gray-900 bg-white rounded-2xl rounded-tl-sm border border-gray-200 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700",
                          "px-4 py-3 max-w-xs shadow-sm"
                        )}
                      >
                        <p className="text-sm leading-relaxed break-words lg:text-base">
                          {message.content}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 入力中インジケーター */}
          {isLoading && (
            <div className="flex justify-start px-2">
              <div className="flex items-start space-x-3 max-w-[75%]">
                {/* アイコン */}
                <div className="flex overflow-hidden flex-shrink-0 justify-center items-center w-10 h-10 bg-green-500 rounded-full">
                  <span className="text-sm font-medium text-white">
                    {selectedChat.name.charAt(0)}
                  </span>
                </div>

                {/* 名前 */}
                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {selectedChat.name}
                  </span>

                  {/* 入力中バブル */}
                  <div className="px-4 py-3 max-w-xs text-gray-900 bg-white rounded-2xl rounded-tl-sm border border-gray-200 shadow-sm dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex space-x-1">
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

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 入力エリア */}
      <div className="p-4 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="w-full">
          <div className="flex items-end space-x-2">
            <button className="p-2 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="relative flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="メッセージを入力..."
                className={cn(
                  "px-4 py-3 pr-12 w-full bg-gray-50 rounded-2xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400",
                  "max-h-32 text-sm placeholder-gray-500 text-gray-900 resize-none dark:placeholder-gray-400 dark:text-gray-100 lg:text-base"
                )}
                rows={1}
                style={{ minHeight: "44px" }}
                disabled={isLoading}
              />
              <button className="absolute right-2 top-1/2 p-1 text-gray-400 rounded-lg transition-colors transform -translate-y-1/2 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <Smile className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
              className={cn(
                "p-3 rounded-full transition-colors disabled:cursor-not-allowed",
                "text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 dark:bg-blue-600 dark:hover:bg-blue-700 dark:disabled:bg-gray-600"
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
