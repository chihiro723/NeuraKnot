"use client";

import { ErrorDisplay } from "@/components/ui/feedback/ErrorDisplay";

/**
 * ダッシュボード全体のエラーUI
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      title="ダッシュボードの読み込みに失敗しました"
      description="ダッシュボードの読み込み中に問題が発生しました。もう一度お試しください。"
    />
  );
}
