"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import { cn } from "@/lib/utils/cn";

interface ModalOverlayProps {
  /** モーダルの表示状態 */
  isOpen: boolean;
  /** 背景クリック・ESC で閉じるときのハンドラ（省略時は閉じない） */
  onClose?: () => void;
  /** 背景クリックで閉じるか（デフォルト true） */
  closeOnBackdropClick?: boolean;
  /** ESC キーで閉じるか（デフォルト true） */
  closeOnEscape?: boolean;
  /** 背景オーバーレイの className を上書き（レイアウト微調整用） */
  className?: string;
  children: React.ReactNode;
}

/**
 * 全モーダル共通の背景オーバーレイ。
 *
 * - `document.body` 直下に Portal 描画するため、祖先の `transform` や
 *   スクロールコンテナの影響を受けず、常に画面全体を均一に覆う
 *   （背景ぼかしが上下端で切れる不具合を構造的に防ぐ）。
 * - body スクロールロック・ESC・背景クリックでのクローズを一元化する。
 *
 * 子要素（モーダル本体カード）側で `onClick={(e) => e.stopPropagation()}` を
 * 付けることで、カード内クリックでは閉じない従来挙動を維持する。
 */
export function ModalOverlay({
  isOpen,
  onClose,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  children,
}: ModalOverlayProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen || !closeOnEscape || !onClose) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md",
        className,
      )}
      onClick={closeOnBackdropClick && onClose ? onClose : undefined}
    >
      {children}
    </div>,
    document.body,
  );
}
