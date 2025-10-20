'use client'

import { useState, useEffect, useCallback } from 'react'
import { cognitoAuth } from '@/lib/auth/cognito'
import { AuthState, AuthUser, SignInRequest, SignUpRequest, ForgotPasswordRequest, ConfirmForgotPasswordRequest } from '@/lib/types/auth'

export function useCognitoAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null
  })

  // 初期化：Cookie内のトークンを使用してユーザー情報を取得
  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }))

        // Cookieにトークンがある場合、ユーザー情報を取得
        try {
          const user = await cognitoAuth.getUser()
          if (isMounted) {
            setState({
              user,
              session: null,
              loading: false,
              error: null
            })
          }
        } catch (error) {
          // トークンがない、または無効な場合は未認証として扱う
          if (isMounted) {
            setState({
              user: null,
              session: null,
              loading: false,
              error: null
            })
          }
        }
      } catch (error) {
        if (isMounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : '認証の初期化に失敗しました'
          }))
        }
      }
    }

    initializeAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const signIn = useCallback(async (credentials: SignInRequest): Promise<{ success: boolean }> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const authResponse = await cognitoAuth.signIn(credentials.email, credentials.password)

      setState({
        user: authResponse.user,
        session: null,
        loading: false,
        error: null
      })

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ログインに失敗しました'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return { success: false }
    }
  }, [])

  const signUp = useCallback(async (userData: SignUpRequest): Promise<{ success: boolean }> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      await cognitoAuth.signUp(
        userData.email,
        userData.password,
        userData.display_name
      )

      setState(prev => ({
        ...prev,
        loading: false,
        error: null
      }))

      return { success: true }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'アカウント作成に失敗しました'
      }))
      return { success: false }
    }
  }, [])

  const confirmSignUp = useCallback(async (email: string, confirmationCode: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      await cognitoAuth.confirmSignUp(email, confirmationCode)
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: null
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'メール確認に失敗しました'
      }))
      // エラーをthrowしない - フック内でエラーメッセージを管理
    }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      // バックエンドのサインアウトを実行（エラーでも続行）
      await cognitoAuth.signOut()
    } catch (error) {
      // サインアウトエラーは無視（既にログアウトしている可能性があるため）
      console.warn('サインアウトエラー（無視）:', error)
    } finally {
      // エラーの有無に関わらず、ローカルの状態をクリア
      setState({
        user: null,
        session: null,
        loading: false,
        error: null
      })
    }
  }, [])

  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      await cognitoAuth.refreshToken()
      const user = await cognitoAuth.getUser()
      setState(prev => ({
        ...prev,
        user,
        loading: false,
        error: null
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'トークンリフレッシュに失敗しました'
      }))
      throw error
    }
  }, [])


  const forgotPassword = useCallback(async (emailData: ForgotPasswordRequest): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      await cognitoAuth.forgotPassword(emailData.email)
      
      setState(prev => ({ ...prev, loading: false, error: null }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'パスワードリセットメールの送信に失敗しました'
      }))
      // エラーをthrowしない - フック内でエラーメッセージを管理
    }
  }, [])

  const confirmForgotPassword = useCallback(async (confirmData: ConfirmForgotPasswordRequest): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      await cognitoAuth.confirmForgotPassword(
        confirmData.email,
        confirmData.confirmation_code,
        confirmData.new_password
      )
      
      setState(prev => ({ ...prev, loading: false, error: null }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'パスワードリセットの確認に失敗しました'
      }))
      // エラーをthrowしない - フック内でエラーメッセージを管理
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    signIn,
    signUp,
    confirmSignUp,
    signOut,
    refreshToken,
    forgotPassword,
    confirmForgotPassword,
    clearError,
    isAuthenticated: !!state.user
  }
}