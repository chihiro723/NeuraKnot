import 'server-only'
import { getAuthenticatedSupabase } from '@/lib/utils/auth'

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
 */
export async function getFriends(userId: string): Promise<FriendData[]> {
  try {
    const { supabase } = await getAuthenticatedSupabase()
    
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    const friendsData = await Promise.all(
      (friendships || []).map(async (friendship) => {
        if (friendship.friend_type === 'human') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, status')
            .eq('id', friendship.friend_id)
            .single()

          if (profile) {
            return {
              id: friendship.friend_id,
              type: 'human' as const,
              name: profile.display_name,
              avatar_url: profile.avatar_url,
              status: profile.status
            }
          }
        } else {
          const { data: agent } = await supabase
            .from('ai_agents')
            .select('name, avatar_url, personality_preset')
            .eq('id', friendship.friend_id)
            .single()

          if (agent) {
            return {
              id: friendship.friend_id,
              type: 'ai' as const,
              name: agent.name,
              avatar_url: agent.avatar_url,
              personality_preset: agent.personality_preset,
              status: 'online' as const
            }
          }
        }
        return null
      })
    )

    return friendsData.filter(Boolean) as FriendData[]
  } catch (error) {
    console.error('友だちリストの読み込みでエラーが発生しました:', error)
    return []
  }
}