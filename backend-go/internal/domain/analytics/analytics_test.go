package analytics

import (
	"testing"
	"time"
)

// TimeRangeの仕様
// ============================================
// 【目的】
// - 統計データの期間フィルタリング
// - 日本時間（JST）を基準にした期間計算
//
// 【TimeRange種類】
// 1. "today" (TimeRangeToday): 今日（日本時間0時〜）
// 2. "week" (TimeRangeWeek): 過去7日間
// 3. "month" (TimeRangeMonth): 過去30日間
// 4. "all" (TimeRangeAll): 全期間（開始時刻なし）
//
// 【タイムゾーン】
// - 日本時間（JST = UTC+9）を基準
// - GetStartTime()の戻り値はUTC時刻
// - 例: 日本時間2024-01-15 00:00:00 → UTC 2024-01-14 15:00:00
//
// 【デフォルト動作】
// - 不明な文字列 → TimeRangeAll（全期間）
// - TimeRangeAll → GetStartTime()はnilを返す
//
// 【使用箇所】
// - ダッシュボードの統計データフィルタリング
// - AnalyticsRepository の各種取得メソッド
// - ユーザー別・エージェント別の統計集計
// ============================================

func TestParseTimeRange(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  TimeRange
	}{
		{
			name:  "Parse today",
			input: "today",
			want:  TimeRangeToday,
		},
		{
			name:  "Parse week",
			input: "week",
			want:  TimeRangeWeek,
		},
		{
			name:  "Parse month",
			input: "month",
			want:  TimeRangeMonth,
		},
		{
			name:  "Parse all",
			input: "all",
			want:  TimeRangeAll,
		},
		{
			name:  "Unknown string defaults to all",
			input: "unknown",
			want:  TimeRangeAll,
		},
		{
			name:  "Empty string defaults to all",
			input: "",
			want:  TimeRangeAll,
		},
		{
			name:  "Invalid string defaults to all",
			input: "invalid_range",
			want:  TimeRangeAll,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseTimeRange(tt.input)

			if got != tt.want {
				t.Errorf("ParseTimeRange(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

func TestTimeRangeGetStartTime(t *testing.T) {
	// 日本時間（JST）
	jst := time.FixedZone("Asia/Tokyo", 9*60*60)
	now := time.Now().In(jst)

	// 期待される開始時刻（日本時間の0時をUTCに変換）
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jst).UTC()
	weekStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jst).AddDate(0, 0, -7).UTC()
	monthStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jst).AddDate(0, 0, -30).UTC()

	tests := []struct {
		name      string
		timeRange TimeRange
		wantNil   bool
		validator func(*time.Time) bool
	}{
		{
			name:      "Today returns today's start time (JST 0:00 in UTC)",
			timeRange: TimeRangeToday,
			wantNil:   false,
			validator: func(t *time.Time) bool {
				if t == nil {
					return false
				}
				// 今日の日本時間0時（UTC変換後）との差が1秒以内であることを確認
				diff := t.Sub(todayStart)
				return diff >= -time.Second && diff <= time.Second
			},
		},
		{
			name:      "Week returns 7 days ago start time",
			timeRange: TimeRangeWeek,
			wantNil:   false,
			validator: func(t *time.Time) bool {
				if t == nil {
					return false
				}
				// 7日前の日本時間0時（UTC変換後）との差が1秒以内
				diff := t.Sub(weekStart)
				return diff >= -time.Second && diff <= time.Second
			},
		},
		{
			name:      "Month returns 30 days ago start time",
			timeRange: TimeRangeMonth,
			wantNil:   false,
			validator: func(t *time.Time) bool {
				if t == nil {
					return false
				}
				// 30日前の日本時間0時（UTC変換後）との差が1秒以内
				diff := t.Sub(monthStart)
				return diff >= -time.Second && diff <= time.Second
			},
		},
		{
			name:      "All returns nil (no start time)",
			timeRange: TimeRangeAll,
			wantNil:   true,
			validator: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.timeRange.GetStartTime()

			if tt.wantNil {
				if got != nil {
					t.Errorf("GetStartTime() = %v, want nil", got)
				}
				return
			}

			if got == nil {
				t.Fatal("GetStartTime() returned nil, want non-nil time")
			}

			if tt.validator != nil && !tt.validator(got) {
				t.Errorf("GetStartTime() returned unexpected time: %v", got)
			}
		})
	}
}

func TestTimeRangeGetStartTimeReturnsUTC(t *testing.T) {
	// GetStartTime()の戻り値がUTC時刻であることを確認
	tests := []struct {
		name      string
		timeRange TimeRange
	}{
		{
			name:      "Today returns UTC time",
			timeRange: TimeRangeToday,
		},
		{
			name:      "Week returns UTC time",
			timeRange: TimeRangeWeek,
		},
		{
			name:      "Month returns UTC time",
			timeRange: TimeRangeMonth,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			startTime := tt.timeRange.GetStartTime()

			if startTime == nil {
				t.Fatal("GetStartTime() returned nil")
			}

			// タイムゾーンがUTCであることを確認
			if startTime.Location() != time.UTC {
				t.Errorf("GetStartTime() returned non-UTC time: %v", startTime.Location())
			}
		})
	}
}

func TestTimeRangeGetStartTimeJSTMidnight(t *testing.T) {
	// 日本時間の0時を正しく扱っているか確認
	jst := time.FixedZone("Asia/Tokyo", 9*60*60)

	startTime := TimeRangeToday.GetStartTime()
	if startTime == nil {
		t.Fatal("GetStartTime() returned nil")
	}

	// UTC時刻を日本時間に変換
	jstTime := startTime.In(jst)

	// 時刻が0時であることを確認（UTC+9なので日本時間で0時になるはず）
	// ただし、テスト実行時刻によっては前日の0時になる可能性があるため、
	// 0時であることのみを確認
	if jstTime.Hour() != 0 || jstTime.Minute() != 0 || jstTime.Second() != 0 {
		t.Errorf("Start time in JST is not midnight: %v (hour=%d, minute=%d, second=%d)",
			jstTime, jstTime.Hour(), jstTime.Minute(), jstTime.Second())
	}
}

func TestTimeRangeConstants(t *testing.T) {
	// 定数が期待される値を持っているか確認
	tests := []struct {
		name      string
		timeRange TimeRange
		expected  string
	}{
		{
			name:      "TimeRangeToday constant",
			timeRange: TimeRangeToday,
			expected:  "today",
		},
		{
			name:      "TimeRangeWeek constant",
			timeRange: TimeRangeWeek,
			expected:  "week",
		},
		{
			name:      "TimeRangeMonth constant",
			timeRange: TimeRangeMonth,
			expected:  "month",
		},
		{
			name:      "TimeRangeAll constant",
			timeRange: TimeRangeAll,
			expected:  "all",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.timeRange) != tt.expected {
				t.Errorf("Constant value = %q, want %q", string(tt.timeRange), tt.expected)
			}
		})
	}
}

func TestTimeRangeRoundTrip(t *testing.T) {
	// ParseTimeRange → string → ParseTimeRange のラウンドトリップ
	tests := []struct {
		name      string
		timeRange TimeRange
	}{
		{
			name:      "Today round trip",
			timeRange: TimeRangeToday,
		},
		{
			name:      "Week round trip",
			timeRange: TimeRangeWeek,
		},
		{
			name:      "Month round trip",
			timeRange: TimeRangeMonth,
		},
		{
			name:      "All round trip",
			timeRange: TimeRangeAll,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// TimeRange → string → TimeRange
			str := string(tt.timeRange)
			parsed := ParseTimeRange(str)

			if parsed != tt.timeRange {
				t.Errorf("Round trip failed: %v → %q → %v", tt.timeRange, str, parsed)
			}
		})
	}
}
