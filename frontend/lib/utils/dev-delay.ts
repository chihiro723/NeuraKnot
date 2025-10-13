/**
 * 開発環境でスケルトンUIを確認するための遅延ユーティリティ
 * 
 * 使い方:
 * ```ts
 * import { devDelay } from '@/lib/utils/dev-delay';
 * 
 * async function fetchData() {
 *   await devDelay(2000); // 2秒遅延
 *   const data = await actualFetch();
 *   return data;
 * }
 * ```
 */

/**
 * 開発環境でのみ指定時間遅延する
 * @param ms 遅延時間（ミリ秒）デフォルト: 2000ms (2秒)
 */
export async function devDelay(ms: number = 2000): Promise<void> {
  // 本番環境では何もしない
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  
  // 環境変数で遅延を無効化できる
  if (process.env.NEXT_PUBLIC_DISABLE_DEV_DELAY === 'true') {
    return;
  }
  
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 開発環境用の遅延時間を環境変数から取得
 */
export function getDevDelayTime(): number {
  const envDelay = process.env.NEXT_PUBLIC_DEV_DELAY_MS;
  if (envDelay) {
    const parsed = parseInt(envDelay, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return 2000; // デフォルト2秒
}

/**
 * カスタマイズ可能な開発遅延
 */
export async function devDelayCustom(): Promise<void> {
  await devDelay(getDevDelayTime());
}

