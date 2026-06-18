/**
 * 通貨換算ユーティリティ
 *
 * USD→JPY のレートはバックエンド (backend-go/pkg/money) を正本とし、
 * `GET /api/v1/exchange-rate` から取得する（`useExchangeRate` フック）。
 * ここで定義する定数は、API 取得前・取得失敗時に用いるフォールバック既定値。
 */

export const DEFAULT_USD_TO_JPY_RATE = 150;

/**
 * USD を JPY に換算する（小数はそのまま返す。表示側で丸める）。
 *
 * @param usd  USD 金額
 * @param rate USD→JPY レート（省略時はフォールバック既定値）
 */
export function convertUsdToJpy(
  usd: number,
  rate: number = DEFAULT_USD_TO_JPY_RATE,
): number {
  return usd * rate;
}
