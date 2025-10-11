/**
 * グループチャットウィンドウコンポーネント
 */

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Smile,
  Paperclip,
  Users,
  Settings,
  Crown,
  Bot,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { SelectedGroup, GroupMessage } from "@/lib/types";

interface GroupChatWindowProps {
  selectedGroup: SelectedGroup;
}

/**
 * グループチャットウィンドウコンポーネント
 */
export function GroupChatWindow({ selectedGroup }: GroupChatWindowProps) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // サンプルメッセージデータ
  useEffect(() => {
    const loadMessages = () => {
      const sampleMessages: GroupMessage[] =
        selectedGroup.id === "g1111111-1111-1111-1111-111111111111"
          ? [
              {
                id: "1",
                group_id: selectedGroup.id,
                sender_type: "ai",
                sender_id: "a1111111-1111-1111-1111-111111111111",
                content:
                  "こんにちは！開発に関してご質問がございましたら、いつでもお声かけください。",
                message_type: "text",
                created_at: new Date(
                  Date.now() - 2 * 60 * 60 * 1000
                ).toISOString(),
                sender_name: "サポートボット",
                sender_avatar:
                  "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=150",
              },
              {
                id: "2",
                group_id: selectedGroup.id,
                sender_type: "ai",
                sender_id: "a3333333-3333-3333-3333-333333333333",
                content:
                  "プロジェクトの進捗管理や効率化についてもサポートいたします。",
                message_type: "text",
                created_at: new Date(
                  Date.now() - 1 * 60 * 60 * 1000
                ).toISOString(),
                sender_name: "ビジネスアシスタント",
                sender_avatar:
                  "https://images.pexels.com/photos/8386439/pexels-photo-8386439.jpeg?auto=compress&cs=tinysrgb&w=150",
              },
            ]
          : selectedGroup.id === "g2222222-2222-2222-2222-222222222222"
          ? [
              {
                id: "3",
                group_id: selectedGroup.id,
                sender_type: "ai",
                sender_id: "a1111111-1111-1111-1111-111111111111",
                content:
                  "技術的なサポートが必要でしたら、お気軽にお聞かせください！",
                message_type: "text",
                created_at: new Date(
                  Date.now() - 3 * 60 * 60 * 1000
                ).toISOString(),
                sender_name: "サポートボット",
                sender_avatar:
                  "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=150",
              },
            ]
          : [
              {
                id: "4",
                group_id: selectedGroup.id,
                sender_type: "ai",
                sender_id: "a2222222-2222-2222-2222-222222222222",
                content:
                  "みなさん、こんにちは！今日はどんなお話をしましょうか？😊",
                message_type: "text",
                created_at: new Date(
                  Date.now() - 4 * 60 * 60 * 1000
                ).toISOString(),
                sender_name: "フレンドちゃん",
                sender_avatar:
                  "https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg?auto=compress&cs=tinysrgb&w=150",
              },
              {
                id: "5",
                group_id: selectedGroup.id,
                sender_type: "ai",
                sender_id: "a4444444-4444-4444-4444-444444444444",
                content:
                  "のんびりお話ししましょう〜。最近何か面白いことありました？",
                message_type: "text",
                created_at: new Date(
                  Date.now() - 3 * 60 * 60 * 1000
                ).toISOString(),
                sender_name: "のんびりくん",
                sender_avatar:
                  "https://images.pexels.com/photos/8386442/pexels-photo-8386442.jpeg?auto=compress&cs=tinysrgb&w=150",
              },
              {
                id: "6",
                group_id: selectedGroup.id,
                sender_type: "ai",
                sender_id: "a5555555-5555-5555-5555-555555555555",
                content:
                  "今日はどんな面白い話をしましょうか？笑顔になれるような話題を用意していますよ！😂",
                message_type: "text",
                created_at: new Date(
                  Date.now() - 3 * 60 * 60 * 1000
                ).toISOString(),
                sender_name: "コメディアン太郎",
                sender_avatar:
                  "https://images.pexels.com/photos/8386445/pexels-photo-8386445.jpeg?auto=compress&cs=tinysrgb&w=150",
              },
            ];

      setMessages(sampleMessages);
      // メッセージ読み込み後、即座に最下部にスクロール
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 0);
    };

    loadMessages();
  }, [selectedGroup]);

  // 新しいメッセージが追加されたときに最下部にスクロール
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    const userMessage: GroupMessage = {
      id: Date.now().toString(),
      group_id: selectedGroup.id,
      sender_type: "human",
      sender_id: "guest-user-id",
      content: newMessage.trim(),
      message_type: "text",
      created_at: new Date().toISOString(),
      sender_name: "ゲストユーザー",
    };

    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");
    setIsLoading(true);

    // AIの返答をシミュレート（複数のAIが順番に返答）
    setTimeout(() => {
      const aiMembers = selectedGroup.members.filter(
        (m) => m.member_type === "ai"
      );
      const randomAI = aiMembers[Math.floor(Math.random() * aiMembers.length)];

      const responses = {
        support: [
          "ご質問ありがとうございます。詳しく説明させていただきますね。",
          "その件についてお調べいたします。少々お待ちください。",
          "解決策をいくつかご提案させていただきます。",
        ],
        friendly: [
          "そうなんですね！とても興味深いです😊",
          "わあ、それは素晴らしいですね！",
          "もっと詳しく聞かせてください♪",
        ],
        business: [
          "承知いたしました。効率的に進めるための提案をいたします。",
          "データを分析して最適な解決策をご提示いたします。",
          "プロジェクトの成功に向けて全力でサポートいたします。",
        ],
        casual: [
          "なるほど〜、そういうことなんですね！",
          "それは面白そうですね！",
          "のんびり話しましょう〜",
        ],
        humor: [
          "それは面白いですね！😂 私も笑ってしまいました！",
          "ユーモアのセンスが素晴らしいですね！",
          "今度はもっと面白い話を聞かせてください！",
        ],
      };

      const aiResponses = responses[
        randomAI.personality_preset as keyof typeof responses
      ] || ["ありがとうございます。", "そうですね。", "なるほど。"];

      const aiMessage: GroupMessage = {
        id: (Date.now() + 1).toString(),
        group_id: selectedGroup.id,
        sender_type: "ai",
        sender_id: randomAI.member_id,
        content: aiResponses[Math.floor(Math.random() * aiResponses.length)],
        message_type: "text",
        created_at: new Date().toISOString(),
        sender_name: randomAI.name,
        sender_avatar: randomAI.avatar_url,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000 + Math.random() * 2000);
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
      <div className="overflow-y-auto flex-1 p-4 bg-gray-50 transition-colors duration-200 dark:bg-gray-800 lg:p-6">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_type === "human"
                  ? "justify-end"
                  : "justify-start"
              } px-2 mb-10`}
            >
              <div
                className={`flex items-end space-x-4 max-w-[75%] lg:max-w-[60%] ${
                  message.sender_type === "human"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                {message.sender_type === "human" ? (
                  /* 自分のメッセージ（右側） */
                  <div
                    className={`px-4 py-3 text-white bg-green-500 rounded-2xl rounded-br-sm shadow-sm transition-all duration-200 hover:shadow-md hover:bg-green-600`}
                  >
                    <p className="text-sm leading-relaxed break-words lg:text-base">
                      {message.content}
                    </p>
                    <p className="mt-1 text-xs text-green-100">
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                ) : (
                  /* 相手のメッセージ（左側） */
                  <div className="flex items-start space-x-3 max-w-full">
                    {/* アイコン */}
                    <div className="flex overflow-hidden flex-shrink-0 justify-center items-center w-10 h-10 bg-gray-300 rounded-full dark:bg-gray-600">
                      {message.sender_avatar ? (
                        <img
                          src={message.sender_avatar}
                          alt={message.sender_name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-sm font-medium text-white">
                          {message.sender_name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* 右側のコンテンツ */}
                    <div className="flex flex-col flex-1 space-y-1 min-w-0">
                      {/* 名前 */}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {message.sender_name}
                      </span>

                      {/* メッセージバブル */}
                      <div className="px-4 py-3 max-w-xs text-gray-900 bg-white rounded-2xl rounded-tl-sm border border-gray-200 shadow-sm transition-all duration-200 dark:bg-gray-700 dark:text-white dark:border-gray-600 hover:shadow-md">
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
                <div className="flex overflow-hidden flex-shrink-0 justify-center items-center w-10 h-10 bg-gray-300 rounded-full dark:bg-gray-600">
                  <Bot className="w-5 h-5 text-white" />
                </div>

                {/* 右側のコンテンツ */}
                <div className="flex flex-col flex-1 space-y-1 min-w-0">
                  {/* 名前 */}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    AIエージェント
                  </span>

                  {/* 入力中バブル */}
                  <div className="px-4 py-3 max-w-xs text-gray-900 bg-white rounded-2xl rounded-tl-sm border border-gray-200 shadow-sm dark:bg-gray-700 dark:text-white dark:border-gray-600">
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
      <div className="p-4 bg-white border-t border-gray-200 transition-colors duration-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="w-full">
          <div className="flex items-end space-x-2">
            <button className="p-2 text-gray-400 rounded-lg transition-colors duration-200 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="relative flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="グループにメッセージを送信..."
                className="px-4 py-3 pr-12 w-full max-h-32 text-sm placeholder-gray-500 text-gray-900 bg-white rounded-2xl border border-gray-200 transition-colors duration-200 resize-none dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent lg:text-base dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                rows={1}
                style={{ minHeight: "44px" }}
                disabled={isLoading}
              />
              <button className="absolute right-2 top-1/2 p-1 text-gray-400 rounded-lg transition-colors duration-200 transform -translate-y-1/2 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600">
                <Smile className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="p-3 text-white bg-green-500 rounded-full shadow-lg transition-all duration-200 transform hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed hover:shadow-xl hover:scale-105 disabled:transform-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* メンバーリスト（サイドパネル） */}
      {showMembers && (
        <div className="absolute top-0 right-0 bottom-0 z-10 w-80 bg-white border-l border-gray-200 shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-900 dark:text-white">
                メンバー ({selectedGroup.member_count})
              </h3>
              <button
                onClick={() => setShowMembers(false)}
                className="p-1 text-gray-400 rounded hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {selectedGroup.members.map((member) => (
              <div key={member.id} className="flex items-center space-x-3">
                <Avatar
                  src={member.avatar_url}
                  alt={member.name}
                  name={member.name}
                  type={member.member_type}
                  status={member.status}
                  showStatus
                  size="sm"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.name}
                    </span>
                    {member.role === "admin" && (
                      <Crown className="w-3 h-3 text-yellow-500" />
                    )}
                    {member.member_type === "ai" && (
                      <Bot className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {member.member_type === "ai"
                      ? "AIエージェント"
                      : "ユーザー"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
