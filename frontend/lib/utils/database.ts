// アプリケーション側でのupdated_at更新ユーティリティ

export function withUpdatedAt<T extends Record<string, unknown>>(data: T): T & { updated_at: string } {
  return {
    ...data,
    updated_at: new Date().toISOString()
  }
}

// 使用例
export async function updateProfile(userId: string, updates: Partial<Profile>) {
  return await supabase
    .from('profiles')
    .update(withUpdatedAt(updates))
    .eq('id', userId)
}