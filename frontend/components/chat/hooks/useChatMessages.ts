import { useState, useCallback, useEffect } from "react";
import {
  getOrCreateConversation,
  getMessages,
} from "@/lib/actions/conversation";
import { useServerActionWithAuth } from "@/lib/hooks/useServerActionWithAuth";
import { Message } from "@/components/chat/ChatWindowClient";
import type { SelectedChat } from "@/lib/types";

export function useChatMessages(
  initialMessages: Message[],
  selectedChat: SelectedChat,
  initialConversationId?: string
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const MESSAGE_LIMIT = 50;

  // Server Actions with Auth
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

  // チャット切り替え時にメッセージをリセット（初期データがあればそれを使う）
  useEffect(() => {
      // 初期データがプロパティとして渡されている場合（SSR）、それをセットするロジックは
      // 親コンポーネントのkey変更等で再マウントされるなら不要かもしれないが、
      // クライアントサイドでの遷移を考慮してセットする。
      setMessages(initialMessages);
      setConversationId(initialConversationId || null);
  }, [selectedChat.id, initialMessages, initialConversationId]);


  // 会話を初期化してメッセージを取得（初期データがない場合のみ）
  useEffect(() => {
    if (initialConversationId && initialMessages.length > 0) {
      // 初期データがあればスキップ
      return;
    }

    const initConversation = async () => {
      if (selectedChat.type !== "ai") return;

      try {
        const convResult = await getOrCreateConversationWithAuth(
          selectedChat.id
        );

        if (convResult.success && convResult.data) {
          const conversation = convResult.data as { id: string };
          setConversationId(conversation.id);
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
          const loadedMessages = data.messages || [];
          
          if (process.env.NODE_ENV === "development") {
             console.debug("Loaded messages:", loadedMessages);
          }
          setMessages(loadedMessages);
        } else {
          console.error("Error loading messages:", result.error);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    initConversation();
  }, [selectedChat.id, initialConversationId, initialMessages.length]);

  // メッセージを追加する関数
  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  // 一時メッセージを削除する関数
  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  // 一時メッセージを正式なメッセージに置き換える関数
  const updateMessage = useCallback((tempId: string, newMessage: Message) => {
    setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempId);
        return [...filtered, newMessage];
    });
  }, []);
  
  // メッセージリスト全体を更新
  const reloadMessages = useCallback(async () => {
      if (!conversationId) return;
      try {
        const result = await getMessagesWithAuth(conversationId, MESSAGE_LIMIT);
        if (result.success && result.data) {
             const data = result.data as { messages: Message[] };
             setMessages(data.messages || []);
        }
      } catch(e) {
          console.error("Reload messages error", e);
      }
  }, [conversationId, getMessagesWithAuth]);


  return {
    messages,
    setMessages,
    conversationId,
    addMessage,
    removeMessage,
    updateMessage,
    reloadMessages
  };
}
