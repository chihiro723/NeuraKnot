// 認証関連の型定義

export interface AuthUser {
  id: string
  email: string
  name: string
  display_name: string
  email_verified: boolean
  created_at: string
  updated_at: string
}

// Cookieベースなのでトークンはレスポンスに含まれない
export interface AuthResponse {
  user: AuthUser
  expires_in: number
}


export interface AuthState {
  user: AuthUser | null
  session: AuthResponse | null
  loading: boolean
  error: string | null
}

export interface SignInRequest {
  email: string
  password: string
}

export interface SignUpRequest {
  email: string
  password: string
  display_name: string
}


export interface ForgotPasswordRequest {
  email: string
}

export interface ConfirmForgotPasswordRequest {
  email: string
  confirmation_code: string
  new_password: string
}

