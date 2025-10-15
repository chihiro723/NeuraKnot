/**
 * 認証エラーメッセージをユーザー向けの日本語に変換
 */

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "エラーが発生しました。しばらく時間をおいてから再試行してください。";
  }

  const message = error.message;

  // ログイン関連エラー
  if (message.includes("メールアドレスが未確認です")) {
    return "メールアドレスの確認が完了していません。確認コードを入力してください。";
  }
  if (message.includes("メールアドレスまたはパスワードが間違っています")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (message.includes("ログインに失敗しました")) {
    return "ログインに失敗しました。メールアドレスとパスワードを確認してください。";
  }
  if (message.includes("unauthorized") || message.includes("Unauthorized")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (message.includes("UserNotFoundException") || message.includes("ユーザーが見つかりません")) {
    return "このメールアドレスは登録されていません。";
  }

  // サインアップ関連エラー
  if (message.includes("このメールアドレスは既に登録されています")) {
    return "このメールアドレスは既に登録されています。";
  }
  if (message.includes("パスワードは8文字以上で、大文字、小文字、数字、記号を含む必要があります")) {
    return "パスワードは8文字以上で、大文字・小文字・数字・記号を含む必要があります。";
  }
  if (message.includes("入力された情報に問題があります")) {
    return "入力された情報に問題があります。すべての項目を正しく入力してください。";
  }
  if (message.includes("アカウント作成に失敗しました")) {
    return "アカウントの作成に失敗しました。しばらく時間をおいてから再試行してください。";
  }

  // 確認コード関連エラー
  if (message.includes("確認コードが間違っています")) {
    return "確認コードが正しくありません。メールに送信された6桁のコードを正確に入力してください。";
  }
  if (message.includes("確認コードの有効期限が切れています")) {
    return "確認コードの有効期限が切れました。新しいコードを再送信してください。";
  }
  if (message.includes("ユーザーが見つかりません")) {
    return "アカウントが見つかりません。メールアドレスを確認してください。";
  }
  if (message.includes("アカウント確認に失敗しました")) {
    return "アカウントの確認に失敗しました。確認コードを再確認してください。";
  }

  // パスワードリセット関連エラー
  if (message.includes("このメールアドレスは登録されていません")) {
    return "このメールアドレスは登録されていません。";
  }
  if (message.includes("リセット要求の回数が上限に達しました")) {
    return "パスワードリセットの要求回数が上限に達しました。しばらく時間をおいてから再試行してください。";
  }
  if (message.includes("パスワードリセットの開始に失敗しました")) {
    return "パスワードリセットの開始に失敗しました。しばらく時間をおいてから再試行してください。";
  }
  if (message.includes("パスワードリセットに失敗しました")) {
    return "パスワードのリセットに失敗しました。確認コードと新しいパスワードを確認してください。";
  }

  // 再送信関連エラー
  if (message.includes("再送信の回数が上限に達しました")) {
    return "確認コードの再送信回数が上限に達しました。しばらく時間をおいてから再試行してください。";
  }
  if (message.includes("メールアドレスが正しくありません")) {
    return "メールアドレスが正しくありません。";
  }
  if (message.includes("確認コードの再送信に失敗しました")) {
    return "確認コードの再送信に失敗しました。しばらく時間をおいてから再試行してください。";
  }

  // その他のエラー
  if (message.includes("ネットワークエラー") || message.includes("Network Error")) {
    return "ネットワークエラーが発生しました。インターネット接続を確認してください。";
  }
  if (message.includes("タイムアウト") || message.includes("timeout")) {
    return "処理がタイムアウトしました。しばらく時間をおいてから再試行してください。";
  }

  // デフォルトエラー
  return "エラーが発生しました。しばらく時間をおいてから再試行してください。";
}

/**
 * エラーメッセージが未確認ユーザーエラーかどうかを判定
 */
export function isUnconfirmedUserError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  return (
    message.includes("メールアドレスが未確認です") ||
    message.includes("UserNotConfirmedException") ||
    message.includes("未確認")
  );
}

/**
 * エラーメッセージが既存アカウントエラーかどうかを判定
 */
export function isExistingAccountError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  return (
    message.includes("このメールアドレスは既に登録されています") ||
    message.includes("UsernameExistsException") ||
    message.includes("既に登録されています")
  );
}
