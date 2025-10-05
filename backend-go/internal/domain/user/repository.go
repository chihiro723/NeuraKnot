package user

import (
	"context"
)

// UserRepository ユーザーリポジトリインターフェース
type UserRepository interface {
	// Save ユーザーを保存
	Save(ctx context.Context, user *User) error

	// GetByID IDでユーザーを取得
	GetByID(ctx context.Context, id UserID) (*User, error)

	// GetByCognitoUserID CognitoユーザーIDでユーザーを取得
	GetByCognitoUserID(ctx context.Context, cognitoUserID string) (*User, error)

	// GetByEmail メールアドレスでユーザーを取得
	GetByEmail(ctx context.Context, email Email) (*User, error)

	// GetByUsername ユーザー名でユーザーを取得
	// GetByUsername は削除されました - GetByEmailを使用してください

	// Delete ユーザーを削除
	Delete(ctx context.Context, id UserID) error

	// List ユーザー一覧を取得
	List(ctx context.Context, limit, offset int) ([]*User, error)

	// Update ユーザーを更新
	Update(ctx context.Context, user *User) error
}
