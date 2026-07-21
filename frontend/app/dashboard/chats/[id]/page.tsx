import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  listConversations,
  getOrCreateConversation,
  getMessages,
} from "@/lib/actions/conversation";
import { listAIAgents } from "@/lib/actions/ai-agent";
import { listGroupChats, getGroupChatMessages } from "@/lib/actions/group-chat";
import { getProfile } from "@/lib/actions/user";
import { ChatWindowClient } from "@/components/chat/ChatWindowClient";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";
import type { Conversation, AIAgent } from "@/lib/types/agent";

interface UserProfile {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

/**
 * 個別チャット画面（サーバーコンポーネント）
 * URLパラメータからチャットIDを取得してSSRで表示
 * サイドバーは layout.tsx で定義されている
 */
export const revalidate = 30; // 30秒ごとに再検証

interface ChatDetailPageProps {
  params: {
    id: string;
  };
}

/**
 * チャットウィンドウのデータを取得
 */
async function ChatWindowData({ chatId }: { chatId: string }) {
  // スケルトンUI確認用の遅延（環境変数で制御）
  // await devDelayCustom();

  // サーバーサイドでデータフェッチ
  const [conversationsResult, agentsResult, groupChatsResult, profileResult] = await Promise.all([
    listConversations(),
    listAIAgents(),
    listGroupChats(),
    getProfile(),
  ]);

  // チャット一覧とエージェント一覧からchatIdに該当するものを検索
  const conversations = conversationsResult.success
    ? conversationsResult.data?.conversations || []
    : [];
  const agents = agentsResult.success ? agentsResult.data?.agents || [] : [];
  const groupChats = groupChatsResult.success
    ? groupChatsResult.data?.group_chats || []
    : [];

  // AI Agentのマッピング
  const agentsMap = new Map<string, AIAgent>();
  agents.forEach((agent: AIAgent) => {
    agentsMap.set(agent.id, agent);
  });

  // グループチャットかどうかチェック
  const groupChat = groupChats.find((gc: any) => gc.id === chatId);
  if (groupChat) {
    // グループチャットの場合
    const memberAgents = groupChat.members
      ?.map((m: any) => agentsMap.get(m.ai_agent_id))
      .filter((a: any): a is AIAgent => !!a) || [];

    const chatData = {
      id: chatId,
      name: groupChat.name,
      avatar_url: groupChat.icon_url,
      type: "group" as const,
      status: "online" as const,
      description: groupChat.description || `メンバー: ${memberAgents.length}人`,
      members: memberAgents,
    };

    // グループチャットのメッセージ履歴を取得
    let groupMessages = [];
    const messagesResult = await getGroupChatMessages(chatId, 50);
    if (messagesResult.success && messagesResult.data) {
      groupMessages = messagesResult.data.messages || [];
    }

    return (
      <ChatWindowClient
        chatData={chatData}
        conversationId={chatId}
        initialMessages={groupMessages}
        initialUserProfile={profileResult.success ? {
          username: profileResult.data.username,
          display_name: profileResult.data.display_name,
          avatar_url: profileResult.data.avatar_url,
        } : undefined}
        isGroupChat={true}
      />
    );
  }

  // chatIdに該当する会話を検索（1対1チャット）
  let selectedConversation: Conversation | null = null;
  let selectedAgent: AIAgent | null = null;

  // まずconversation IDで検索
  const conv = conversations.find((c: Conversation) => c.id === chatId);
  if (conv) {
    selectedConversation = conv;
    selectedAgent = agentsMap.get(conv.ai_agent_id) || null;
  } else {
    // AI Agent IDで検索（直接エージェントとの会話）
    selectedAgent = agentsMap.get(chatId) || null;
    if (selectedAgent) {
      // 既存の会話を探す
      selectedConversation =
        conversations.find((c: Conversation) => c.ai_agent_id === chatId) ||
        null;

      // 会話が見つからない場合は作成
      if (!selectedConversation) {
        const createResult = await getOrCreateConversation(chatId);
        if (createResult.success && createResult.data) {
          selectedConversation = createResult.data;
        }
      }
    }
  }

  // チャットが見つからない場合は404
  if (!selectedAgent) {
    notFound();
  }

  // チャットデータを整形
  const chatData = {
    id: chatId,
    name: selectedAgent.name,
    avatar_url: selectedAgent.avatar_url,
    type: "ai" as const,
    status: "online" as const,
    personality_preset: selectedAgent.persona_type,
    description: selectedAgent.description,
    // ブラウザローカル(WebLLM)判定用に LLM 設定を渡す
    provider: selectedAgent.provider,
    model: selectedAgent.model,
  };

  // メッセージとユーザープロフィールを取得
  let initialMessages = [];
  let initialUserProfile: UserProfile | undefined = undefined;

  if (selectedConversation) {
    const messagesResult = await getMessages(selectedConversation.id, 50);
    if (messagesResult.success && messagesResult.data) {
      initialMessages = messagesResult.data.messages || [];
    }
  }

  if (profileResult.success && profileResult.data) {
    initialUserProfile = {
      username: profileResult.data.username,
      display_name: profileResult.data.display_name,
      avatar_url: profileResult.data.avatar_url,
    };
  }

  return (
    <ChatWindowClient
      chatData={chatData}
      conversationId={selectedConversation?.id}
      initialMessages={initialMessages}
      initialUserProfile={initialUserProfile}
    />
  );
}

export default async function ChatDetailPage({ params }: ChatDetailPageProps) {
  const { id: chatId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-full">
          <LoadingSpinner />
        </div>
      }
    >
      <ChatWindowData chatId={chatId} />
    </Suspense>
  );
}
