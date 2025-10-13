"use server";

import { cookies } from "next/headers";

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || "http://localhost:8080";

/**
 * ユーザープロフィールを取得
 */
export async function getProfile() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return {
        success: false,
        error: "Not authenticated",
        statusCode: 401,
      };
    }

    const response = await fetch(
      `${BACKEND_GO_URL}/api/v1/users/profile`,
      {
        method: "GET",
        headers: {
          Cookie: `access_token=${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch profile: ${response.status}`,
        statusCode: response.status,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error in getProfile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    };
  }
}

/**
 * ユーザープロフィールを更新
 */
export async function updateProfile(displayName: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return {
        success: false,
        error: "認証が必要です",
      };
    }

    const response = await fetch(
      `${BACKEND_GO_URL}/api/v1/users/profile`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: `access_token=${accessToken}`,
        },
        body: JSON.stringify({
          display_name: displayName,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "プロフィールの更新に失敗しました",
      }));
      return {
        success: false,
        error: error.error || "プロフィールの更新に失敗しました",
      };
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

