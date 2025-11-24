import { useRef, useEffect } from "react";

export function useChatScroll(messagesLength: number, chatId: string) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);

  // 初回読み込み時のみスクロール（messages が初めて設定された時）
  useEffect(() => {
    // チャットIDが変わったらフラグをリセット
    isInitialLoadRef.current = true;
  }, [chatId]);

  // 初回メッセージ読み込み時のみ最下部にスクロール
  useEffect(() => {
    if (messagesLength > 0 && isInitialLoadRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      });
      isInitialLoadRef.current = false;
    }
  }, [messagesLength]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  };

  return {
    messagesEndRef,
    messagesContainerRef,
    scrollToBottom,
  };
}
