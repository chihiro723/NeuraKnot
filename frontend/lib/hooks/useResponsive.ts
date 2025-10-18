"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * モバイル判定フック
 * 768px未満をモバイルとして判定（タブレット境界）
 * ハイドレーションミスマッチを防ぐため、初期値はfalseで開始
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 初期値設定
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // マウント時にチェック
    checkMobile();

    // リサイズイベントリスナー
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  return isMobile;
}

/**
 * 詳細画面判定フック
 * URLパターンから詳細画面かどうかを判定
 * 
 * 詳細画面と判定するパターン:
 * - /dashboard/chats/[id]
 * - /dashboard/roster/[id]
 * - /dashboard/settings/profile
 * - /dashboard/settings/subscription
 * - /dashboard/settings/analytics
 * - /dashboard/add/ai
 * - /dashboard/add/user
 * - /dashboard/add/group
 */
export function useIsDetailPage(): boolean {
  const pathname = usePathname();

  // パスが存在しない場合は詳細画面ではない
  if (!pathname) return false;

  // チャット詳細: /dashboard/chats/[id] (id部分が存在)
  if (pathname.match(/^\/dashboard\/chats\/[^/]+$/)) {
    return true;
  }

  // 一覧管理詳細: /dashboard/roster/[id]
  if (pathname.match(/^\/dashboard\/roster\/[^/]+$/)) {
    return true;
  }

  // 設定サブページ: /dashboard/settings/[subsection]
  if (
    pathname.match(/^\/dashboard\/settings\/(profile|subscription|analytics)$/)
  ) {
    return true;
  }

  // 新規追加サブページ: /dashboard/add/[type]
  if (pathname.match(/^\/dashboard\/add\/(ai|user|group)$/)) {
    return true;
  }

  // 外部サービスサブページ: /dashboard/services/[subsection]
  if (pathname.match(/^\/dashboard\/services\/(my-services|register)$/)) {
    return true;
  }

  // その他は一覧ページ
  return false;
}

/**
 * モバイルかつ詳細画面かを判定
 */
export function useIsMobileDetailPage(): boolean {
  const isMobile = useIsMobile();
  const isDetailPage = useIsDetailPage();

  return isMobile && isDetailPage;
}

