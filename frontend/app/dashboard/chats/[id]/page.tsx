import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  listConversations,
  getOrCreateConversation,
  getMessages,
} from "@/lib/actions/conversation";
import { listAIAgents } from "@/lib/actions/ai-agent";
import { getProfile } from "@/lib/actions/user";
import { ChatWindowClient } from "@/components/chat/ChatWindowClient";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";
import { devDelayCustom } from "@/lib/utils/dev-delay";

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
  await devDelayCustom();

  // サーバーサイドでデータフェッチ
  const [conversationsResult, agentsResult, profileResult] = await Promise.all([
    listConversations(),
    listAIAgents(),
    getProfile(),
  ]);

  // チャット一覧とエージェント一覧からchatIdに該当するものを検索
  const conversations = conversationsResult.success
    ? conversationsResult.data?.conversations || []
    : [];
  const agents = agentsResult.success ? agentsResult.data?.agents || [] : [];

  // AI Agentのマッピング
  const agentsMap = new Map();
  agents.forEach((agent: any) => {
    agentsMap.set(agent.id, agent);
  });

  // chatIdに該当する会話を検索
  let selectedConversation = null;
  let selectedAgent = null;

  // まずconversation IDで検索
  const conv = conversations.find((c: any) => c.id === chatId);
  if (conv) {
    selectedConversation = conv;
    selectedAgent = agentsMap.get(conv.ai_agent_id);
  } else {
    // AI Agent IDで検索（直接エージェントとの会話）
    selectedAgent = agentsMap.get(chatId);
    if (selectedAgent) {
      // 既存の会話を探す
      selectedConversation = conversations.find(
        (c: any) => c.ai_agent_id === chatId
      );

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
  };

  // メッセージとユーザープロフィールを取得
  let initialMessages = [];
  let initialUserProfile = null;

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
    <Suspense fallback={<LoadingSpinner />}>
      <ChatWindowData chatId={chatId} />
    </Suspense>
  );
}
