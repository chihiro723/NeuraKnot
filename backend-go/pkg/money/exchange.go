// Package money は通貨換算に関する共通定数・ユーティリティを提供する。
//
// USD→JPY の換算レートはアプリ全体で単一の値を参照する必要があるため、
// ここを唯一の正本とする（Analytics / Billing / フロントエンドが同じ値を使う）。
package money

// USDToJPYRate は USD から JPY への換算レート（固定）。
// 実際の為替レートではなく、表示用の概算値として運用する。
const USDToJPYRate = 150.0

// ConvertUSDToJPY は USD 金額を JPY に換算する。
func ConvertUSDToJPY(usd float64) float64 {
	return usd * USDToJPYRate
}
