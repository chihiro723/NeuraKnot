import { Search } from "lucide-react";
import { NotFoundDisplay } from "@/components/ui/feedback/NotFoundDisplay";

/**
 * ダッシュボード全体の404ページ
 * すべてのセクションで共有される
 */
export default function DashboardNotFound() {
  return (
    <NotFoundDisplay
      icon={Search}
      title="ページが見つかりません"
      description="お探しのページは存在しないか、削除された可能性があります。"
      backLink="/dashboard/chats"
      backLabel="ダッシュボードに戻る"
    />
  );
}
