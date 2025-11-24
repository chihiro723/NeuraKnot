import React from "react";
import { AIChatWindow } from "./AIChatWindow";
import { GroupChatWindow } from "./GroupChatWindow";
import type { SelectedChat } from "@/lib/types";
import type { Message, UserProfile } from "@/components/chat/ChatWindowClient";

interface ChatWindowProps {
  selectedChat: SelectedChat;
  initialMessages?: Message[];
  initialConversationId?: string;
  initialUserProfile?: UserProfile;
  isGroupChat?: boolean;
}

/**
 * チャットウィンドウの親コンポーネント
 * AIチャットとグループチャットの振り分けを行う
 */
export function ChatWindow(props: ChatWindowProps) {
  // isGroupChatフラグに基づいて適切なコンポーネントをレンダリング
  // これにより、各モードのロジックが分離され、パフォーマンスと保守性が向上する
  if (props.isGroupChat) {
    return <GroupChatWindow {...props} />;
  }

  return <AIChatWindow {...props} />;
}
