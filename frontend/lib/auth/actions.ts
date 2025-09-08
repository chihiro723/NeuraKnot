'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from './server'


// useActionState用の型定義
export interface AuthState {
  error?: string
  success: boolean
  message?: string
}


/**
 * ログインアクション
 */
export async function signInAction(formData: FormData): Promise<void> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    throw new Error('メールアドレスとパスワードを入力してください')
  }

  await cookies()
  const supabase = await createClient()
  
  if (!supabase) {
    throw new Error('データベースへの接続に失敗しました')
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  
  if (error) {
    throw new Error(getErrorMessage(error))
  }
  
  if (!data.user) {
    throw new Error('ログインに失敗しました')
  }
  
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('プロフィールが見つかりません。アカウントが正しく設定されていない可能性があります。')
  }

  await supabase
    .from('profiles')
    .update({ status: 'online' })
    .eq('id', data.user.id)

  const { data: { user: verifiedUser } } = await supabase.auth.getUser()

  if (!verifiedUser) {
    throw new Error('認証の確認に失敗しました')
  }

  if (verifiedUser.id !== data.user.id) {
    throw new Error('認証情報の不一致が検出されました')
  }
  revalidatePath('/dashboard')
  redirect('/dashboard')
}

/**
 * useActionState用のログインアクション
 */
export async function signInActionState(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    const validationError: AuthState = {
      error: 'メールアドレスとパスワードを入力してください',
      success: false
    };
    return validationError;
  }

  try {
    await cookies()
    const supabase = await createClient()
    
    if (!supabase) {
      const dbError: AuthState = {
        error: 'データベースへの接続に失敗しました',
        success: false
      };
      return dbError;
    }
    
    console.log('🔍 Attempting login for:', email.trim())
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    
    if (error) {
      const authError: AuthState = {
        error: getErrorMessage(error),
        success: false
      };
      return authError;
    }
    
    if (!data.user) {
      const userError: AuthState = {
        error: 'ログインに失敗しました',
        success: false
      };
      return userError;
    }
    
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      const profileErr: AuthState = {
        error: 'プロフィールが見つかりません。アカウントが正しく設定されていない可能性があります。',
        success: false
      };
      return profileErr;
    }

    await supabase
      .from('profiles')
      .update({ status: 'online' })
      .eq('id', data.user.id)

    const { data: { user: verifiedUser } } = await supabase.auth.getUser()

    if (!verifiedUser) {
      const verifyError: AuthState = {
        error: '認証の確認に失敗しました',
        success: false
      };
      return verifyError;
    }

    if (verifiedUser.id !== data.user.id) {
      const mismatchError: AuthState = {
        error: '認証情報の不一致が検出されました',
        success: false
      };
      return mismatchError;
    }

    revalidatePath('/dashboard')
    
    return {
      success: true,
      message: 'ログインに成功しました'
    };
    
  } catch (error) {
    console.error('ログインエラー:', error)
    
    let errorMessage = 'ログイン中にエラーが発生しました'
    
    if (error instanceof Error) {
      if (error.message.includes('fetch failed') || error.message.includes('ConnectTimeoutError')) {
        errorMessage = 'ネットワーク接続に問題があります。しばらく後に再度お試しください。'
      } else if (error.message.includes('timeout')) {
        errorMessage = '接続がタイムアウトしました。再度お試しください。'
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      error: errorMessage,
      success: false
    };
  }
}

/**
 * サインアップアクション
 */
export async function signUpAction(formData: FormData): Promise<void> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = formData.get('username') as string
  const displayName = formData.get('displayName') as string
  
  if (!email || !password || !username || !displayName) {
    throw new Error('すべての項目を入力してください')
  }

  if (password.length < 6) {
    throw new Error('パスワードは6文字以上で入力してください')
  }

  await cookies()
  const supabase = await createClient()
  
  if (!supabase) {
    throw new Error('データベースへの接続に失敗しました')
  }
  
  // ユーザー名の重複チェック
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username.trim())
    .single()

  if (existingProfile) {
    throw new Error('このユーザー名は既に使用されています')
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        username: username.trim(),
        display_name: displayName.trim()
      }
    }
  })
  
  if (error) {
    throw new Error(getErrorMessage(error))
  }
  
  if (!data.user) {
    throw new Error('アカウント作成に失敗しました')
  }
  
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      username: username.trim(),
      display_name: displayName.trim(),
      email: data.user.email,
      status: 'online'
    })

  if (profileError) {
    throw new Error('プロフィールの作成に失敗しました')
  }
  
  revalidatePath('/dashboard')
  redirect('/dashboard')
}

/**
 * サインアウトアクション（リダイレクト付き）
 */
export async function signOutAction(): Promise<never> {
  await cookies()
  const supabase = await createClient()
  
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase
          .from('profiles')
          .update({ status: 'offline' })
          .eq('id', user.id)
      }
      
      await supabase.auth.signOut()

    } catch (error) {
      console.error('ログアウト処理中にエラー:', error)
    }
  }

  revalidatePath('/')
  redirect('/')
}

/**
 * API用サインアウトアクション（リダイレクトなし）
 */
export async function signOutApiAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await cookies()
    const supabase = await createClient()
    
    if (!supabase) {
      return { success: false, error: 'データベースへの接続に失敗しました' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ status: 'offline' })
        .eq('id', user.id)
    }
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('ログアウトエラー:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/')
    return { success: true }
    
  } catch (error) {
    console.error('ログアウト処理中にエラー:', error)
    return { success: false, error: 'ログアウト中にエラーが発生しました' }
  }
}

/**
 * エラーメッセージを生成
 */
function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'エラーが発生しました。再度お試しください。'
  }
  
  const err = error as { message?: string; code?: string }
  const message = err.message?.toLowerCase() || ''

  if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
    return 'メールアドレスまたはパスワードが正しくありません。'
  }

  if (message.includes('email not confirmed')) {
    return 'メールアドレスの確認が完了していません。確認メールをご確認ください。'
  }

  if (message.includes('user not found')) {
    return 'このメールアドレスで登録されたアカウントが見つかりません。'
  }

  if (message.includes('too many requests')) {
    return 'ログイン試行回数が上限に達しました。しばらく時間をおいてから再度お試しください。'
  }

  if (message.includes('duplicate') || message.includes('already registered')) {
    return 'このメールアドレスは既に登録されています。ログインをお試しください。'
  }

  if (message.includes('weak password')) {
    return 'パスワードが弱すぎます。より強力なパスワードを設定してください。'
  }

  return err.message || 'エラーが発生しました。再度お試しください。'
}