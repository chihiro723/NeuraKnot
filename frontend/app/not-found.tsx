import { Home } from "lucide-react";
import { NotFoundDisplay } from "@/components/ui/feedback/NotFoundDisplay";

/**
 * アプリ全体の404ページ
 */
export default function NotFound() {
  return (
    <NotFoundDisplay
      icon={Home}
      title="ページが見つかりません"
      description="お探しのページは存在しないか、削除された可能性があります。"
      backLink="/"
      backLabel="ホームに戻る"
    />
  );
}
