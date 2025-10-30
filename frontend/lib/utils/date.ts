/**
 * 日付関連のユーティリティ関数
 */

/**
 * 時間の表示形式を整形
 * 今日の場合は時刻（午前/午後表記）、昨日の場合は「昨日」、それ以外は日付を表示
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  
  // 今日の0時
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // 昨日の0時
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  
  if (date >= todayStart) {
    // 今日の場合：時刻を表示
    return date.toLocaleTimeString('ja-JP', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    })
  } else if (date >= yesterdayStart) {
    // 昨日の場合：「昨日」と表示
    return '昨日'
  } else {
    // それ以前の場合：日付を表示
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  }
}

/**
 * 日付を日本語形式でフォーマット
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

/**
 * 相対時間を表示（例：2時間前、3日前）
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) {
    return 'たった今'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}分前`
  } else if (diffInHours < 24) {
    return `${diffInHours}時間前`
  } else if (diffInDays < 7) {
    return `${diffInDays}日前`
  } else {
    return formatDate(dateString)
  }
}

/**
 * 日付セパレーター用の表示形式
 * メッセージ画面で日付が変わる箇所に表示
 */
export const formatDateSeparator = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  
  // 今日の0時
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // 昨日の0時
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  
  if (date >= todayStart) {
    return '今日'
  } else if (date >= yesterdayStart) {
    return '昨日'
  } else {
    // 今年の場合は年を省略
    const currentYear = now.getFullYear()
    const messageYear = date.getFullYear()
    
    if (currentYear === messageYear) {
      return date.toLocaleDateString('ja-JP', { 
        month: 'numeric', 
        day: 'numeric' 
      })
    } else {
      return date.toLocaleDateString('ja-JP', { 
        year: 'numeric',
        month: 'numeric', 
        day: 'numeric' 
      })
    }
  }
}

/**
 * 2つの日付が同じ日かどうかを判定
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}