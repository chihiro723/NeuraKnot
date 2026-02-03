package user

import (
	"testing"
	"time"
)

func TestNewUser(t *testing.T) {
	userID, _ := NewUserID("test-user-123")
	email, _ := NewEmail("test@example.com")

	tests := []struct {
		name          string
		id            UserID
		cognitoUserID string
		email         Email
		displayName   string
		wantErr       bool
	}{
		{
			name:          "Valid user",
			id:            userID,
			cognitoUserID: "cognito-user-123",
			email:         email,
			displayName:   "Test User",
			wantErr:       false,
		},
		{
			name:          "Empty Cognito ID",
			id:            userID,
			cognitoUserID: "",
			email:         email,
			displayName:   "Test User",
			wantErr:       true,
		},
		{
			name:          "Empty display name",
			id:            userID,
			cognitoUserID: "cognito-user-123",
			email:         email,
			displayName:   "",
			wantErr:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user, err := NewUser(tt.id, tt.cognitoUserID, tt.email, tt.displayName)

			// エラーチェック
			if (err != nil) != tt.wantErr {
				t.Errorf("NewUser() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			// 正常系の検証
			if !tt.wantErr {
				if user == nil {
					t.Fatal("Expected non-nil user for valid input")
				}

				// デフォルト値の確認
				if user.Status != UserStatusActive {
					t.Errorf("Status = %v, want %v", user.Status, UserStatusActive)
				}
				if user.SubscriptionTier != "free" {
					t.Errorf("SubscriptionTier = %q, want %q", user.SubscriptionTier, "free")
				}
				if user.SubscriptionStatus != "active" {
					t.Errorf("SubscriptionStatus = %q, want %q", user.SubscriptionStatus, "active")
				}
				if user.StripeCustomerID != nil {
					t.Error("StripeCustomerID should be nil for new user")
				}
				if user.StripeSubscriptionID != nil {
					t.Error("StripeSubscriptionID should be nil for new user")
				}
				if user.CurrentPeriodStart != nil {
					t.Error("CurrentPeriodStart should be nil for new user")
				}
				if user.CurrentPeriodEnd != nil {
					t.Error("CurrentPeriodEnd should be nil for new user")
				}

				// 入力値の確認
				if user.ID != tt.id {
					t.Errorf("ID = %v, want %v", user.ID, tt.id)
				}
				if user.CognitoUserID != tt.cognitoUserID {
					t.Errorf("CognitoUserID = %q, want %q", user.CognitoUserID, tt.cognitoUserID)
				}
				if !user.Email.Equals(tt.email) {
					t.Errorf("Email = %v, want %v", user.Email, tt.email)
				}
				if user.DisplayName != tt.displayName {
					t.Errorf("DisplayName = %q, want %q", user.DisplayName, tt.displayName)
				}
			}
		})
	}
}

func TestChangeEmail(t *testing.T) {
	userID, _ := NewUserID("test-user-123")
	originalEmail, _ := NewEmail("original@example.com")
	user, _ := NewUser(userID, "cognito-123", originalEmail, "Test User")

	originalUpdatedAt := user.UpdatedAt
	time.Sleep(10 * time.Millisecond) // 時間差を確保

	tests := []struct {
		name     string
		newEmail string
		wantErr  bool
	}{
		{
			name:     "Valid email change",
			newEmail: "new@example.com",
			wantErr:  false,
		},
		{
			name:     "Same email (no change)",
			newEmail: "original@example.com",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// テスト用にユーザーを再作成
			testUser, _ := NewUser(userID, "cognito-123", originalEmail, "Test User")
			testUser.UpdatedAt = originalUpdatedAt

			newEmail, err := NewEmail(tt.newEmail)
			if err != nil {
				t.Fatalf("NewEmail() unexpected error: %v", err)
			}

			err = testUser.ChangeEmail(newEmail)

			if (err != nil) != tt.wantErr {
				t.Errorf("ChangeEmail() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// メールが変更されたか確認
				if !testUser.Email.Equals(newEmail) {
					t.Errorf("Email = %v, want %v", testUser.Email, newEmail)
				}

				// 異なるメールの場合、UpdatedAtが更新されているか確認
				if !originalEmail.Equals(newEmail) {
					if !testUser.UpdatedAt.After(originalUpdatedAt) {
						t.Error("UpdatedAt should be updated when email changes")
					}
				}
			}
		})
	}
}

func TestChangeDisplayName(t *testing.T) {
	userID, _ := NewUserID("test-user-123")
	email, _ := NewEmail("test@example.com")
	user, _ := NewUser(userID, "cognito-123", email, "Original Name")

	originalUpdatedAt := user.UpdatedAt
	time.Sleep(10 * time.Millisecond)

	tests := []struct {
		name        string
		newName     string
		wantErr     bool
	}{
		{
			name:    "Valid name change",
			newName: "New Name",
			wantErr: false,
		},
		{
			name:    "Same name (no change)",
			newName: "Original Name",
			wantErr: false,
		},
		{
			name:    "Empty name",
			newName: "",
			wantErr: true,
		},
		{
			name:    "Name with special characters",
			newName: "山田 太郎",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// テスト用にユーザーを再作成
			testUser, _ := NewUser(userID, "cognito-123", email, "Original Name")
			testUser.UpdatedAt = originalUpdatedAt

			err := testUser.ChangeDisplayName(tt.newName)

			if (err != nil) != tt.wantErr {
				t.Errorf("ChangeDisplayName() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// 名前が変更されたか確認
				if testUser.DisplayName != tt.newName {
					t.Errorf("DisplayName = %q, want %q", testUser.DisplayName, tt.newName)
				}

				// 異なる名前の場合、UpdatedAtが更新されているか確認
				if tt.newName != "Original Name" {
					if !testUser.UpdatedAt.After(originalUpdatedAt) {
						t.Error("UpdatedAt should be updated when display name changes")
					}
				}
			}
		})
	}
}

func TestChangeAvatarURL(t *testing.T) {
	userID, _ := NewUserID("test-user-123")
	email, _ := NewEmail("test@example.com")
	user, _ := NewUser(userID, "cognito-123", email, "Test User")

	tests := []struct {
		name      string
		avatarURL *string
	}{
		{
			name:      "Set avatar URL",
			avatarURL: stringPtr("https://example.com/avatar.jpg"),
		},
		{
			name:      "Set nil avatar URL",
			avatarURL: nil,
		},
		{
			name:      "Set empty string avatar URL",
			avatarURL: stringPtr(""),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			originalUpdatedAt := user.UpdatedAt
			time.Sleep(10 * time.Millisecond)

			err := user.ChangeAvatarURL(tt.avatarURL)

			if err != nil {
				t.Errorf("ChangeAvatarURL() unexpected error: %v", err)
				return
			}

			// アバターURLが設定されたか確認
			if tt.avatarURL == nil {
				if user.AvatarURL != nil {
					t.Error("AvatarURL should be nil")
				}
			} else {
				if user.AvatarURL == nil || *user.AvatarURL != *tt.avatarURL {
					t.Errorf("AvatarURL = %v, want %v", user.AvatarURL, tt.avatarURL)
				}
			}

			// UpdatedAtが更新されているか確認
			if !user.UpdatedAt.After(originalUpdatedAt) {
				t.Error("UpdatedAt should be updated when avatar URL changes")
			}
		})
	}
}

func TestChangeStatus(t *testing.T) {
	userID, _ := NewUserID("test-user-123")
	email, _ := NewEmail("test@example.com")

	tests := []struct {
		name      string
		newStatus UserStatus
	}{
		{
			name:      "Change to inactive",
			newStatus: UserStatusInactive,
		},
		{
			name:      "Change to suspended",
			newStatus: UserStatusSuspended,
		},
		{
			name:      "Change back to active",
			newStatus: UserStatusActive,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user, _ := NewUser(userID, "cognito-123", email, "Test User")
			originalUpdatedAt := user.UpdatedAt
			time.Sleep(10 * time.Millisecond)

			err := user.ChangeStatus(tt.newStatus)

			if err != nil {
				t.Errorf("ChangeStatus() unexpected error: %v", err)
				return
			}

			// ステータスが変更されたか確認
			if user.Status != tt.newStatus {
				t.Errorf("Status = %v, want %v", user.Status, tt.newStatus)
			}

			// 異なるステータスの場合、UpdatedAtが更新されているか確認
			if tt.newStatus != UserStatusActive {
				if !user.UpdatedAt.After(originalUpdatedAt) {
					t.Error("UpdatedAt should be updated when status changes")
				}
			}
		})
	}
}

func TestIsActive(t *testing.T) {
	userID, _ := NewUserID("test-user-123")
	email, _ := NewEmail("test@example.com")
	user, _ := NewUser(userID, "cognito-123", email, "Test User")

	tests := []struct {
		name   string
		status UserStatus
		want   bool
	}{
		{
			name:   "Active status",
			status: UserStatusActive,
			want:   true,
		},
		{
			name:   "Inactive status",
			status: UserStatusInactive,
			want:   false,
		},
		{
			name:   "Suspended status",
			status: UserStatusSuspended,
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user.Status = tt.status

			if got := user.IsActive(); got != tt.want {
				t.Errorf("IsActive() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestValidate(t *testing.T) {
	userID, _ := NewUserID("test-user-123")
	email, _ := NewEmail("test@example.com")

	tests := []struct {
		name    string
		user    *User
		wantErr bool
	}{
		{
			name: "Valid user",
			user: &User{
				ID:            userID,
				CognitoUserID: "cognito-123",
				Email:         email,
				DisplayName:   "Test User",
			},
			wantErr: false,
		},
		{
			name: "Empty Cognito ID",
			user: &User{
				ID:            userID,
				CognitoUserID: "",
				Email:         email,
				DisplayName:   "Test User",
			},
			wantErr: true,
		},
		{
			name: "Empty display name",
			user: &User{
				ID:            userID,
				CognitoUserID: "cognito-123",
				Email:         email,
				DisplayName:   "",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.user.Validate()

			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// ヘルパー関数
func stringPtr(s string) *string {
	return &s
}
