package billing

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

// TokenUsageエンティティの仕様
// ============================================
// 【目的】
// - ユーザーのトークン使用量を期間ごとに記録・集計
// - 予算制限やトークン制限のチェックに使用
//
// 【必須項目】
// 1. UserID (uuid.UUID): ユーザーID
// 2. PeriodStart (time.Time): 集計期間の開始日時
// 3. PeriodEnd (time.Time): 集計期間の終了日時（PeriodStartより後）
//
// 【集計データ】
// - TokensPrompt: プロンプトトークンの合計
// - TokensCompletion: 補完トークンの合計
// - TokensTotal: 全トークンの合計
// - CostUSD: コストの合計（USD）
// - RequestCount: リクエスト回数
// - ProviderBreakdown: プロバイダー別の内訳（map）
//
// 【使用量追加】
// - AddUsage(provider, promptTokens, completionTokens, cost)
// - プロバイダー別の内訳も自動更新
// - 負の値は不可
//
// 【制限チェック】
// - GetRemainingTokens(limit): 残りトークン数（0=無制限で-1を返す）
// - GetOverageTokens(limit): 超過トークン数
// - IsWithinLimit(limit): 制限内かどうか
// - GetRemainingBudget(budgetLimit): 残り予算（USD）
// - IsWithinBudget(budgetLimit): 予算内かどうか
//
// 【JSON変換】
// - MarshallProviderBreakdown(): プロバイダー内訳をJSON文字列に
// - UnmarshallProviderBreakdown(json): JSON文字列からプロバイダー内訳を復元
// - DB保存時に使用（PostgreSQLのJSONB型）
//
// 【使用箇所】
// - AI API呼び出し後のトークン記録
// - ユーザーの月間使用量表示
// - 制限超過チェック（API呼び出し前）
// - 課金計算（使用量ベース課金の場合）
// ============================================

func TestNewTokenUsage(t *testing.T) {
	userID := uuid.New()
	now := time.Now()
	periodStart := now
	periodEnd := now.Add(24 * time.Hour)

	tests := []struct {
		name        string
		userID      uuid.UUID
		periodStart time.Time
		periodEnd   time.Time
		wantErr     bool
	}{
		{
			name:        "Valid token usage",
			userID:      userID,
			periodStart: periodStart,
			periodEnd:   periodEnd,
			wantErr:     false,
		},
		{
			name:        "Period end equals period start",
			userID:      userID,
			periodStart: periodStart,
			periodEnd:   periodStart,
			wantErr:     true,
		},
		{
			name:        "Period end before period start",
			userID:      userID,
			periodStart: periodStart,
			periodEnd:   periodStart.Add(-1 * time.Hour),
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			usage, err := NewTokenUsage(tt.userID, tt.periodStart, tt.periodEnd)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewTokenUsage() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if usage == nil {
					t.Fatal("Expected non-nil usage for valid input")
				}

				// デフォルト値の確認
				if usage.TokensPrompt != 0 {
					t.Errorf("TokensPrompt = %d, want 0", usage.TokensPrompt)
				}
				if usage.TokensCompletion != 0 {
					t.Errorf("TokensCompletion = %d, want 0", usage.TokensCompletion)
				}
				if usage.TokensTotal != 0 {
					t.Errorf("TokensTotal = %d, want 0", usage.TokensTotal)
				}
				if usage.CostUSD != 0 {
					t.Errorf("CostUSD = %f, want 0", usage.CostUSD)
				}
				if usage.RequestCount != 0 {
					t.Errorf("RequestCount = %d, want 0", usage.RequestCount)
				}
				if usage.ProviderBreakdown == nil {
					t.Error("ProviderBreakdown should be initialized")
				}
			}
		})
	}
}

func TestTokenUsageAddUsage(t *testing.T) {
	userID := uuid.New()
	now := time.Now()

	tests := []struct {
		name             string
		provider         string
		promptTokens     int64
		completionTokens int64
		cost             float64
		wantErr          bool
	}{
		{
			name:             "Valid usage",
			provider:         "openai",
			promptTokens:     1000,
			completionTokens: 2000,
			cost:             0.05,
			wantErr:          false,
		},
		{
			name:             "Zero tokens",
			provider:         "openai",
			promptTokens:     0,
			completionTokens: 0,
			cost:             0,
			wantErr:          false,
		},
		{
			name:             "Negative prompt tokens",
			provider:         "openai",
			promptTokens:     -100,
			completionTokens: 1000,
			cost:             0.01,
			wantErr:          true,
		},
		{
			name:             "Negative completion tokens",
			provider:         "openai",
			promptTokens:     1000,
			completionTokens: -100,
			cost:             0.01,
			wantErr:          true,
		},
		{
			name:             "Negative cost",
			provider:         "openai",
			promptTokens:     1000,
			completionTokens: 1000,
			cost:             -0.01,
			wantErr:          true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// テスト用に新しいusageを作成
			testUsage, _ := NewTokenUsage(userID, now, now.Add(24*time.Hour))

			err := testUsage.AddUsage(tt.provider, tt.promptTokens, tt.completionTokens, tt.cost)

			if (err != nil) != tt.wantErr {
				t.Errorf("AddUsage() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// 使用量が正しく加算されているか確認
				if testUsage.TokensPrompt != tt.promptTokens {
					t.Errorf("TokensPrompt = %d, want %d", testUsage.TokensPrompt, tt.promptTokens)
				}
				if testUsage.TokensCompletion != tt.completionTokens {
					t.Errorf("TokensCompletion = %d, want %d", testUsage.TokensCompletion, tt.completionTokens)
				}
				expectedTotal := tt.promptTokens + tt.completionTokens
				if testUsage.TokensTotal != expectedTotal {
					t.Errorf("TokensTotal = %d, want %d", testUsage.TokensTotal, expectedTotal)
				}
				if testUsage.CostUSD != tt.cost {
					t.Errorf("CostUSD = %f, want %f", testUsage.CostUSD, tt.cost)
				}
				if testUsage.RequestCount != 1 {
					t.Errorf("RequestCount = %d, want 1", testUsage.RequestCount)
				}

				// プロバイダー別内訳が記録されているか確認
				if providerUsage, ok := testUsage.ProviderBreakdown[tt.provider]; !ok {
					t.Errorf("ProviderBreakdown[%s] not found", tt.provider)
				} else {
					if providerUsage.Tokens != expectedTotal {
						t.Errorf("ProviderBreakdown[%s].Tokens = %d, want %d", tt.provider, providerUsage.Tokens, expectedTotal)
					}
					if providerUsage.Cost != tt.cost {
						t.Errorf("ProviderBreakdown[%s].Cost = %f, want %f", tt.provider, providerUsage.Cost, tt.cost)
					}
				}
			}
		})
	}
}

func TestTokenUsageAddUsageMultiple(t *testing.T) {
	userID := uuid.New()
	now := time.Now()
	usage, _ := NewTokenUsage(userID, now, now.Add(24*time.Hour))

	// 複数回追加
	usage.AddUsage("openai", 1000, 2000, 0.05)
	usage.AddUsage("openai", 500, 1000, 0.025)
	usage.AddUsage("anthropic", 2000, 3000, 0.10)

	// 合計が正しいか確認
	expectedPrompt := int64(1000 + 500 + 2000)
	expectedCompletion := int64(2000 + 1000 + 3000)
	expectedTotal := expectedPrompt + expectedCompletion
	expectedCost := 0.05 + 0.025 + 0.10

	if usage.TokensPrompt != expectedPrompt {
		t.Errorf("TokensPrompt = %d, want %d", usage.TokensPrompt, expectedPrompt)
	}
	if usage.TokensCompletion != expectedCompletion {
		t.Errorf("TokensCompletion = %d, want %d", usage.TokensCompletion, expectedCompletion)
	}
	if usage.TokensTotal != expectedTotal {
		t.Errorf("TokensTotal = %d, want %d", usage.TokensTotal, expectedTotal)
	}

	const epsilon = 0.0001
	if diff := usage.CostUSD - expectedCost; diff > epsilon || diff < -epsilon {
		t.Errorf("CostUSD = %f, want %f", usage.CostUSD, expectedCost)
	}

	if usage.RequestCount != 3 {
		t.Errorf("RequestCount = %d, want 3", usage.RequestCount)
	}

	// プロバイダー別内訳が正しいか確認
	if openaiUsage, ok := usage.ProviderBreakdown["openai"]; !ok {
		t.Error("ProviderBreakdown[openai] not found")
	} else {
		expectedOpenAITokens := int64(1000 + 2000 + 500 + 1000)
		if openaiUsage.Tokens != expectedOpenAITokens {
			t.Errorf("ProviderBreakdown[openai].Tokens = %d, want %d", openaiUsage.Tokens, expectedOpenAITokens)
		}
	}

	if anthropicUsage, ok := usage.ProviderBreakdown["anthropic"]; !ok {
		t.Error("ProviderBreakdown[anthropic] not found")
	} else {
		expectedAnthropicTokens := int64(2000 + 3000)
		if anthropicUsage.Tokens != expectedAnthropicTokens {
			t.Errorf("ProviderBreakdown[anthropic].Tokens = %d, want %d", anthropicUsage.Tokens, expectedAnthropicTokens)
		}
	}
}

func TestTokenUsageGetRemainingTokens(t *testing.T) {
	userID := uuid.New()
	now := time.Now()
	usage, _ := NewTokenUsage(userID, now, now.Add(24*time.Hour))
	usage.AddUsage("openai", 3000, 2000, 0.05) // Total: 5000

	tests := []struct {
		name  string
		limit int64
		want  int64
	}{
		{
			name:  "Within limit",
			limit: 10000,
			want:  5000, // 10000 - 5000
		},
		{
			name:  "Exactly at limit",
			limit: 5000,
			want:  0,
		},
		{
			name:  "Over limit",
			limit: 3000,
			want:  0,
		},
		{
			name:  "Unlimited (0)",
			limit: 0,
			want:  -1, // 無制限
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			remaining := usage.GetRemainingTokens(tt.limit)
			if remaining != tt.want {
				t.Errorf("GetRemainingTokens(%d) = %d, want %d", tt.limit, remaining, tt.want)
			}
		})
	}
}

func TestTokenUsageGetOverageTokens(t *testing.T) {
	userID := uuid.New()
	now := time.Now()
	usage, _ := NewTokenUsage(userID, now, now.Add(24*time.Hour))
	usage.AddUsage("openai", 3000, 2000, 0.05) // Total: 5000

	tests := []struct {
		name  string
		limit int64
		want  int64
	}{
		{
			name:  "Within limit (no overage)",
			limit: 10000,
			want:  0,
		},
		{
			name:  "Exactly at limit (no overage)",
			limit: 5000,
			want:  0,
		},
		{
			name:  "Over limit",
			limit: 3000,
			want:  2000, // 5000 - 3000
		},
		{
			name:  "Unlimited (0)",
			limit: 0,
			want:  0, // 無制限なので超過なし
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			overage := usage.GetOverageTokens(tt.limit)
			if overage != tt.want {
				t.Errorf("GetOverageTokens(%d) = %d, want %d", tt.limit, overage, tt.want)
			}
		})
	}
}

func TestTokenUsageIsWithinLimit(t *testing.T) {
	userID := uuid.New()
	now := time.Now()
	usage, _ := NewTokenUsage(userID, now, now.Add(24*time.Hour))
	usage.AddUsage("openai", 3000, 2000, 0.05) // Total: 5000

	tests := []struct {
		name  string
		limit int64
		want  bool
	}{
		{
			name:  "Within limit",
			limit: 10000,
			want:  true,
		},
		{
			name:  "Exactly at limit",
			limit: 5000,
			want:  true,
		},
		{
			name:  "Over limit",
			limit: 3000,
			want:  false,
		},
		{
			name:  "Unlimited (0)",
			limit: 0,
			want:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			withinLimit := usage.IsWithinLimit(tt.limit)
			if withinLimit != tt.want {
				t.Errorf("IsWithinLimit(%d) = %v, want %v", tt.limit, withinLimit, tt.want)
			}
		})
	}
}

func TestTokenUsageGetRemainingBudget(t *testing.T) {
	userID := uuid.New()
	now := time.Now()
	usage, _ := NewTokenUsage(userID, now, now.Add(24*time.Hour))
	usage.AddUsage("openai", 3000, 2000, 1.50) // Cost: $1.50

	tests := []struct {
		name        string
		budgetLimit float64
		want        float64
	}{
		{
			name:        "Within budget",
			budgetLimit: 5.00,
			want:        3.50, // 5.00 - 1.50
		},
		{
			name:        "Exactly at budget",
			budgetLimit: 1.50,
			want:        0,
		},
		{
			name:        "Over budget",
			budgetLimit: 1.00,
			want:        0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			remaining := usage.GetRemainingBudget(tt.budgetLimit)
			const epsilon = 0.0001
			if diff := remaining - tt.want; diff > epsilon || diff < -epsilon {
				t.Errorf("GetRemainingBudget(%f) = %f, want %f", tt.budgetLimit, remaining, tt.want)
			}
		})
	}
}

func TestTokenUsageIsWithinBudget(t *testing.T) {
	userID := uuid.New()
	now := time.Now()
	usage, _ := NewTokenUsage(userID, now, now.Add(24*time.Hour))
	usage.AddUsage("openai", 3000, 2000, 1.50) // Cost: $1.50

	tests := []struct {
		name        string
		budgetLimit float64
		want        bool
	}{
		{
			name:        "Within budget",
			budgetLimit: 5.00,
			want:        true,
		},
		{
			name:        "Exactly at budget",
			budgetLimit: 1.50,
			want:        true,
		},
		{
			name:        "Over budget",
			budgetLimit: 1.00,
			want:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			withinBudget := usage.IsWithinBudget(tt.budgetLimit)
			if withinBudget != tt.want {
				t.Errorf("IsWithinBudget(%f) = %v, want %v", tt.budgetLimit, withinBudget, tt.want)
			}
		})
	}
}

func TestTokenUsageMarshallProviderBreakdown(t *testing.T) {
	userID := uuid.New()
	now := time.Now()
	usage, _ := NewTokenUsage(userID, now, now.Add(24*time.Hour))
	usage.AddUsage("openai", 1000, 2000, 0.05)
	usage.AddUsage("anthropic", 500, 1000, 0.03)

	jsonStr, err := usage.MarshallProviderBreakdown()
	if err != nil {
		t.Fatalf("MarshallProviderBreakdown() unexpected error: %v", err)
	}

	if jsonStr == "" {
		t.Error("MarshallProviderBreakdown() returned empty string")
	}

	// JSON文字列に期待されるプロバイダー名が含まれているか確認
	if !contains(jsonStr, "openai") {
		t.Errorf("MarshallProviderBreakdown() does not contain 'openai': %s", jsonStr)
	}
	if !contains(jsonStr, "anthropic") {
		t.Errorf("MarshallProviderBreakdown() does not contain 'anthropic': %s", jsonStr)
	}
}

func TestTokenUsageUnmarshallProviderBreakdown(t *testing.T) {
	userID := uuid.New()
	now := time.Now()

	tests := []struct {
		name    string
		jsonStr string
		wantErr bool
	}{
		{
			name:    "Valid JSON",
			jsonStr: `{"openai":{"tokens":3000,"cost":0.05},"anthropic":{"tokens":1500,"cost":0.03}}`,
			wantErr: false,
		},
		{
			name:    "Empty JSON object",
			jsonStr: "{}",
			wantErr: false,
		},
		{
			name:    "Empty string",
			jsonStr: "",
			wantErr: false,
		},
		{
			name:    "Invalid JSON",
			jsonStr: "invalid json",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			usage, _ := NewTokenUsage(userID, now, now.Add(24*time.Hour))

			err := usage.UnmarshallProviderBreakdown(tt.jsonStr)

			if (err != nil) != tt.wantErr {
				t.Errorf("UnmarshallProviderBreakdown() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && usage.ProviderBreakdown == nil {
				t.Error("ProviderBreakdown should not be nil after unmarshalling")
			}
		})
	}
}

func TestTokenUsageValidate(t *testing.T) {
	userID := uuid.New()
	now := time.Now()

	tests := []struct {
		name    string
		usage   *TokenUsage
		wantErr bool
	}{
		{
			name: "Valid token usage",
			usage: &TokenUsage{
				UserID:           userID,
				PeriodStart:      now,
				PeriodEnd:        now.Add(24 * time.Hour),
				TokensPrompt:     1000,
				TokensCompletion: 2000,
				TokensTotal:      3000,
				CostUSD:          0.05,
				RequestCount:     1,
			},
			wantErr: false,
		},
		{
			name: "Period end equals period start",
			usage: &TokenUsage{
				UserID:      userID,
				PeriodStart: now,
				PeriodEnd:   now,
			},
			wantErr: true,
		},
		{
			name: "Period end before period start",
			usage: &TokenUsage{
				UserID:      userID,
				PeriodStart: now,
				PeriodEnd:   now.Add(-1 * time.Hour),
			},
			wantErr: true,
		},
		{
			name: "Negative tokens prompt",
			usage: &TokenUsage{
				UserID:       userID,
				PeriodStart:  now,
				PeriodEnd:    now.Add(24 * time.Hour),
				TokensPrompt: -100,
			},
			wantErr: true,
		},
		{
			name: "Negative tokens completion",
			usage: &TokenUsage{
				UserID:           userID,
				PeriodStart:      now,
				PeriodEnd:        now.Add(24 * time.Hour),
				TokensCompletion: -100,
			},
			wantErr: true,
		},
		{
			name: "Negative cost",
			usage: &TokenUsage{
				UserID:      userID,
				PeriodStart: now,
				PeriodEnd:   now.Add(24 * time.Hour),
				CostUSD:     -0.01,
			},
			wantErr: true,
		},
		{
			name: "Negative request count",
			usage: &TokenUsage{
				UserID:       userID,
				PeriodStart:  now,
				PeriodEnd:    now.Add(24 * time.Hour),
				RequestCount: -1,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.usage.Validate()

			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// ヘルパー関数
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && containsCheck(s, substr))
}

func containsCheck(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
