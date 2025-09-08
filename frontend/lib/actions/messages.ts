// メッセージ送信時の会話更新をアプリケーション側で処理

import { createServerClient } from '@/lib/auth/server'
import { cookies } from 'next/headers'

export async function sendMessage(conversationId: string, content: string, senderId: string) {
  const cookieStore = await cookies()
  const supabase = await createServerClient(cookieStore)
  
  // トランザクションで実行
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_type: 'user',
      content: content
    })
    .select()
    .single()
    
  if (messageError) {
    return { error: messageError.message }
  }
  
  // 会話の最終メッセージ時刻を更新（アプリケーション側で）
  const { error: conversationError } = await supabase
    .from('conversations')
    .update({
      last_message_at: message.created_at,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId)
    
  if (conversationError) {
    console.error('会話更新エラー:', conversationError)
  }
  
  return { data: message }
}