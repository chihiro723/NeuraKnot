'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { cognitoAuth } from './cognito'
import { SignInRequest, SignUpRequest, ChangePasswordRequest, ForgotPasswordRequest, ConfirmForgotPasswordRequest } from '@/lib/types/auth'

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

  try {
    await cognitoAuth.signIn({ email: email.trim(), password })
    revalidatePath('/dashboard')
    redirect('/dashboard')
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'ログインに失敗しました')
  }
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
    return {
      error: 'メールアドレスとパスワードを入力してください',
      success: false
    }
  }

  try {
    await cognitoAuth.signIn({ email: email.trim(), password })
    revalidatePath('/dashboard')
    return {
      success: true,
      message: 'ログインに成功しました'
    }
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
    }
  }
}

/**
 * サインアップアクション
 */
export async function signUpAction(formData: FormData): Promise<void> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const displayName = formData.get('displayName') as string
  const username = formData.get('username') as string
  
  if (!email || !password || !name || !displayName || !username) {
    throw new Error('すべての項目を入力してください')
  }

  if (password.length < 8) {
    throw new Error('パスワードは8文字以上で入力してください')
  }

  try {
    await cognitoAuth.signUp({
      email: email.trim(),
      password,
      name: name.trim(),
      display_name: displayName.trim(),
      username: username.trim()
    })
    revalidatePath('/dashboard')
    redirect('/dashboard')
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'アカウント作成に失敗しました')
  }
}

/**
 * useActionState用のサインアップアクション
 */
export async function signUpActionState(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const displayName = formData.get('displayName') as string
  const username = formData.get('username') as string
  
  if (!email || !password || !name || !displayName || !username) {
    return {
      error: 'すべての項目を入力してください',
      success: false
    }
  }

  if (password.length < 8) {
    return {
      error: 'パスワードは8文字以上で入力してください',
      success: false
    }
  }

  try {
    await cognitoAuth.signUp({
      email: email.trim(),
      password,
      name: name.trim(),
      display_name: displayName.trim(),
      username: username.trim()
    })
    revalidatePath('/dashboard')
    return {
      success: true,
      message: 'アカウント作成に成功しました'
    }
  } catch (error) {
    console.error('サインアップエラー:', error)
    
    let errorMessage = 'アカウント作成中にエラーが発生しました'
    
    if (error instanceof Error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        errorMessage = 'このメールアドレスまたはユーザー名は既に使用されています'
      } else if (error.message.includes('weak password')) {
        errorMessage = 'パスワードが弱すぎます。より強力なパスワードを設定してください'
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      error: errorMessage,
      success: false
    }
  }
}

/**
 * サインアウトアクション（リダイレクト付き）
 */
export async function signOutAction(): Promise<never> {
  try {
    await cognitoAuth.signOut()
  } catch (error) {
    console.error('ログアウト処理中にエラー:', error)
  }

  revalidatePath('/')
  redirect('/')
}

/**
 * API用サインアウトアクション（リダイレクトなし）
 */
export async function signOutApiAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await cognitoAuth.signOut()
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('ログアウト処理中にエラー:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'ログアウト中にエラーが発生しました'
    }
  }
}

/**
 * パスワード変更アクション
 */
export async function changePasswordAction(formData: FormData): Promise<AuthState> {
  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string
  
  if (!currentPassword || !newPassword || !confirmPassword) {
    return {
      error: 'すべての項目を入力してください',
      success: false
    }
  }

  if (newPassword !== confirmPassword) {
    return {
      error: '新しいパスワードと確認パスワードが一致しません',
      success: false
    }
  }

  if (newPassword.length < 8) {
    return {
      error: '新しいパスワードは8文字以上で入力してください',
      success: false
    }
  }

  try {
    await cognitoAuth.changePassword({
      current_password: currentPassword,
      new_password: newPassword
    })
    
    return {
      success: true,
      message: 'パスワードが正常に変更されました'
    }
  } catch (error) {
    console.error('パスワード変更エラー:', error)
    
    let errorMessage = 'パスワード変更中にエラーが発生しました'
    
    if (error instanceof Error) {
      if (error.message.includes('incorrect') || error.message.includes('invalid')) {
        errorMessage = '現在のパスワードが正しくありません'
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      error: errorMessage,
      success: false
    }
  }
}

/**
 * パスワードリセットアクション
 */
export async function forgotPasswordAction(formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string
  
  if (!email) {
    return {
      error: 'メールアドレスを入力してください',
      success: false
    }
  }

  try {
    await cognitoAuth.forgotPassword({ email: email.trim() })
    
    return {
      success: true,
      message: 'パスワードリセットメールを送信しました。メールをご確認ください。'
    }
  } catch (error) {
    console.error('パスワードリセットエラー:', error)
    
    let errorMessage = 'パスワードリセットメールの送信中にエラーが発生しました'
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('invalid')) {
        errorMessage = 'このメールアドレスで登録されたアカウントが見つかりません'
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      error: errorMessage,
      success: false
    }
  }
}

/**
 * パスワードリセット確認アクション
 */
export async function confirmForgotPasswordAction(formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string
  const confirmationCode = formData.get('confirmationCode') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string
  
  if (!email || !confirmationCode || !newPassword || !confirmPassword) {
    return {
      error: 'すべての項目を入力してください',
      success: false
    }
  }

  if (newPassword !== confirmPassword) {
    return {
      error: '新しいパスワードと確認パスワードが一致しません',
      success: false
    }
  }

  if (newPassword.length < 8) {
    return {
      error: '新しいパスワードは8文字以上で入力してください',
      success: false
    }
  }

  try {
    await cognitoAuth.confirmForgotPassword({
      email: email.trim(),
      confirmation_code: confirmationCode.trim(),
      new_password: newPassword
    })
    
    return {
      success: true,
      message: 'パスワードが正常にリセットされました。新しいパスワードでログインしてください。'
    }
  } catch (error) {
    console.error('パスワードリセット確認エラー:', error)
    
    let errorMessage = 'パスワードリセットの確認中にエラーが発生しました'
    
    if (error instanceof Error) {
      if (error.message.includes('invalid') || error.message.includes('expired')) {
        errorMessage = '確認コードが無効または期限切れです'
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      error: errorMessage,
      success: false
    }
  }
}
