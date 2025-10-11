"use server";

import { cookies } from "next/headers";

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
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/profile`,
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

