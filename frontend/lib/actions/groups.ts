// グループ作成をアプリケーション側で処理

import { createServerClient } from '@/lib/auth/server'
import { cookies } from 'next/headers'

export async function createGroup(name: string, description: string, createdBy: string) {
  const cookieStore = await cookies()
  const supabase = await createServerClient(cookieStore)
  
  // グループを作成
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      created_by: createdBy
    })
    .select()
    .single()
    
  if (groupError) {
    return { error: groupError.message }
  }
  
  // 作成者をadminとして追加（アプリケーション側で）
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: createdBy,
      role: 'admin'
    })
    
  if (memberError) {
    // グループ作成をロールバック
    await supabase.from('groups').delete().eq('id', group.id)
    return { error: 'グループメンバー追加に失敗しました' }
  }
  
  return { data: group }
}