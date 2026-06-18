"use client";

import { useEffect, useState } from "react";
import { getExchangeRate } from "@/lib/actions/config";
import { DEFAULT_USD_TO_JPY_RATE } from "@/lib/utils/currency";

/**
 * USD→JPY 換算レートを取得するフック。
 *
 * バックエンド（正本）から取得し、取得前・失敗時はフォールバック既定値を返す。
 * レートは事実上の固定値のため、取得前後で表示が大きく変わることはない。
 */
export function useExchangeRate(): number {
  const [rate, setRate] = useState(DEFAULT_USD_TO_JPY_RATE);

  useEffect(() => {
    let active = true;
    getExchangeRate()
      .then((value) => {
        if (active && value > 0) setRate(value);
      })
      .catch(() => {
        // フォールバック既定値のまま
      });
    return () => {
      active = false;
    };
  }, []);

  return rate;
}
