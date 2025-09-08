import 'server-only'
import { getAuthenticatedSupabase } from '@/lib/utils/auth'
import type { DatabaseConversation, DatabaseProfile } from '@/lib/types/database'

export interface ConversationData {
  id: string
  created_at: string
  updated_at: string
  otherParticipant: {
    name: string
    avatar_url?: string
    type: 'human' | 'ai'
    status: 'online' | 'offline'
  } | null
  lastMessage: {
    content: string
    created_at: string
    sender_type: string
  } | null
}

/**
 * ユーザーの会話一覧を取得する
 */
export async function getConversations(userId: string): Promise<ConversationData[]> {
  try {
    const { supabase } = await getAuthenticatedSupabase()
    
    const { data: conversationsData, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          content,
          created_at,
          sender_type
        )
      `)
      .or(`and(participant1_type.eq.human,participant1_id.eq.${userId}),and(participant2_type.eq.human,participant2_id.eq.${userId})`)
      .order('updated_at', { ascending: false })

    if (error) throw error

    const processedConversations = await Promise.all(
      (conversationsData || []).map(async (conv: DatabaseConversation) => {
        const isParticipant1 = conv.participant1_type === 'human' && conv.participant1_id === userId
        const otherParticipantType = isParticipant1 ? conv.participant2_type : conv.participant1_type
        const otherParticipantId = isParticipant1 ? conv.participant2_id : conv.participant1_id

        let otherParticipant = null

        if (otherParticipantType === 'human') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, status')
            .eq('id', otherParticipantId)
            .single()

          if (profile) {
            otherParticipant = {
              name: profile.display_name,
              avatar_url: profile.avatar_url,
              type: 'human' as const,
              status: profile.status
            }
          }
        } else {
          const { data: agent } = await supabase
            .from('ai_agents')
            .select('name, avatar_url')
            .eq('id', otherParticipantId)
            .single()

          if (agent) {
            otherParticipant = {
              name: agent.name,
              avatar_url: agent.avatar_url,
              type: 'ai' as const,
              status: 'online' as const
            }
          }
        }

        const lastMessage = conv.messages && conv.messages.length > 0 
          ? conv.messages[conv.messages.length - 1]
          : null

        return {
          ...conv,
          otherParticipant,
          lastMessage
        }
      })
    )

    return processedConversations.filter(conv => conv.otherParticipant)
  } catch (error) {
    console.error('会話の読み込みでエラーが発生しました:', error)
    return []
  }
}