"use server";

import { cookies } from "next/headers";
import type { AnalyticsData, TimeRange } from "@/lib/types/analytics";

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || "http://localhost:8080";

/**
 * ユーザーの統計データを取得
 * @param timeRange 期間フィルター (today, week, month, all)
 * @returns 統計データ
 */
export async function getAnalytics(
  timeRange: TimeRange = "all"
): Promise<AnalyticsData> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      throw new Error("認証が必要です");
    }

    const response = await fetch(
      `${BACKEND_GO_URL}/api/v1/analytics?time_range=${timeRange}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `統計データの取得に失敗しました (${response.status})`
      );
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Failed to fetch analytics:", error);
    throw new Error(error.message || "統計データの取得に失敗しました");
  }
}

