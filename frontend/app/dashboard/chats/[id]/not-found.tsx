import { MessageCircle } from "lucide-react";
import { NotFoundDisplay } from "@/components/ui/feedback/NotFoundDisplay";

/**
 * チャットが見つからない場合のUI
 */
export default function ChatNotFound() {
  return (
    <NotFoundDisplay
      icon={MessageCircle}
      title="チャットが見つかりません"
      description="このチャットは存在しないか、削除された可能性があります。"
      backLink="/dashboard/chats"
      backLabel="チャット一覧に戻る"
    />
  );
}
