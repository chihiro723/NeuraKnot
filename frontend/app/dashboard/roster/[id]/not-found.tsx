import { Users } from "lucide-react";
import { NotFoundDisplay } from "@/components/ui/feedback/NotFoundDisplay";

/**
 * 友だちが見つからない場合のUI
 */
export default function FriendNotFound() {
  return (
    <NotFoundDisplay
      icon={Users}
      title="友だちが見つかりません"
      description="この友だちは存在しないか、削除された可能性があります。"
      backLink="/dashboard/roster"
      backLabel="一覧に戻る"
    />
  );
}
