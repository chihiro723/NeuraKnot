import 'server-only'

export interface FriendData {
  id: string
  type: 'human' | 'ai'
  name: string
  avatar_url?: string
  status: 'online' | 'offline'
  personality_preset?: string
}

/**
 * ユーザーの友だち一覧を取得する
 * TODO: PostgreSQLから友だちデータを取得する実装が必要
 */
export async function getFriends(userId: string): Promise<FriendData[]> {
  try {
    // PostgreSQLから友だちデータを取得する実装が必要
    // const friends = await getFriendsFromPostgres(userId)
    return []
  } catch (error) {
    console.error('友だちリストの読み込みでエラーが発生しました:', error)
    return []
  }
}