/**
 * バリデーション関連のユーティリティ関数
 */

/**
 * メールアドレスの形式をチェック
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * ユーザー名の形式をチェック
 */
export const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_-]+$/
  return usernameRegex.test(username.trim())
}

/**
 * パスワードの強度をチェック
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6
}

/**
 * 必須フィールドのチェック
 */
export const isRequired = (value: string): boolean => {
  return value.trim().length > 0
}

/**
 * フォームデータの検証
 */
export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export const validateSignUpForm = (data: {
  email: string
  password: string
  username: string
  displayName: string
}): ValidationResult => {
  const errors: Record<string, string> = {}

  if (!isRequired(data.email)) {
    errors.email = 'メールアドレスは必須です'
  } else if (!isValidEmail(data.email)) {
    errors.email = '有効なメールアドレスを入力してください'
  }

  if (!isRequired(data.password)) {
    errors.password = 'パスワードは必須です'
  } else if (!isValidPassword(data.password)) {
    errors.password = 'パスワードは6文字以上で入力してください'
  }

  if (!isRequired(data.username)) {
    errors.username = 'ユーザー名は必須です'
  } else if (!isValidUsername(data.username)) {
    errors.username = 'ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます'
  }

  if (!isRequired(data.displayName)) {
    errors.displayName = '表示名は必須です'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateSignInForm = (data: {
  email: string
  password: string
}): ValidationResult => {
  const errors: Record<string, string> = {}

  if (!isRequired(data.email)) {
    errors.email = 'メールアドレスは必須です'
  } else if (!isValidEmail(data.email)) {
    errors.email = '有効なメールアドレスを入力してください'
  }

  if (!isRequired(data.password)) {
    errors.password = 'パスワードは必須です'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}