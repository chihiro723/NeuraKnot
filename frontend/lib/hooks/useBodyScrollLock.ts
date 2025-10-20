"use client";

import { useEffect } from "react";

/**
 * モーダル等の表示中に `body` スクロールをロックするフック。
 * - iOS Safari を含むモバイルでの背面スクロールを防ぐ
 * - 連打・多重モーダルでも原則安全（classNameの付け外しのみ）
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const body = document.body;
    if (locked) {
      body.classList.add("scroll-lock");
    } else {
      body.classList.remove("scroll-lock");
    }

    return () => {
      body.classList.remove("scroll-lock");
    };
  }, [locked]);
}


