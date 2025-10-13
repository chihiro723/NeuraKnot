"use client";

import { createContext, useContext, useState } from "react";
import type { AuthUser } from "@/lib/types/auth";
import type {
  Profile,
  SelectedChat,
  SelectedGroup,
  SelectedFriend,
  DashboardContextType,
} from "@/lib/types";

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

/**
 * ダッシュボードコンテキストを使用するためのカスタムフック
 * ユーザー情報、プロフィール、アクティブタブの状態を管理
 */
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}

interface DashboardProviderProps {
  children: React.ReactNode;
  user: AuthUser;
  profile: Profile;
}

/**
 * ダッシュボード全体のグローバル状態を提供するプロバイダー
 * ユーザー情報、プロフィール、現在のタブを管理
 */
export function DashboardProvider({
  children,
  user,
  profile,
}: DashboardProviderProps) {
  // 選択されたチャットの状態管理
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);
  // 選択された友だちの状態管理
  const [selectedFriend, setSelectedFriend] = useState<SelectedFriend | null>(
    null
  );
  // 選択されたグループの状態管理
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(
    null
  );

  return (
    <DashboardContext.Provider
      value={{
        user,
        profile,
        selectedChat,
        setSelectedChat,
        selectedFriend,
        setSelectedFriend,
        selectedGroup,
        setSelectedGroup,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
