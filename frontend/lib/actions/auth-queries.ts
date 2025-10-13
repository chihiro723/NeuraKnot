"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthUser } from "@/lib/types/auth";
import type { Profile } from "@/lib/types";

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || "http://localhost:8080";

/**
 * サーバー側で認証ユーザー情報とプロフィールを取得
 * 
 * @returns ユーザー情報とプロフィール情報を含むオブジェクト
 * @throws Cookie がない場合や認証失敗時は /auth/login にリダイレクト
 */
export async function getAuthUser(): Promise<{
  user: AuthUser;
  profile: Profile;
}> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      console.log("[getAuthUser] No access token found in cookies");
      redirect("/auth/login");
    }

    // Backend-go からユーザープロフィールを取得
    const response = await fetch(`${BACKEND_GO_URL}/api/v1/users/profile`, {
      headers: {
        Cookie: `access_token=${accessToken}`,
      },
      cache: "no-store", // 常に最新のデータを取得
    });

    if (!response.ok) {
      console.log(
        `[getAuthUser] Failed to fetch user profile: ${response.status}`
      );
      redirect("/auth/login");
    }

    const data = await response.json();

    // AuthUser と Profile の両方を返す
    // backend-go の /api/v1/users/profile は両方の情報を含む想定
    return {
      user: {
        id: data.id,
        cognito_user_id: data.cognito_user_id,
        email: data.email,
        display_name: data.display_name,
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      profile: {
        id: data.id,
        email: data.email,
        username: data.username || data.email,
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        status: data.status as "online" | "offline" | "away",
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    };
  } catch (error) {
    // redirect() は例外をスローするため、それ以外のエラーのみキャッチ
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("[getAuthUser] Error:", error);
    redirect("/auth/login");
  }
}

