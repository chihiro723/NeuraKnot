package usecase

import (
	"fmt"

	"go-backend/internal/domain"
)

// userUsecase ユーザーユースケースの実装
type userUsecase struct {
	userRepo domain.UserRepository
}

// NewUserUsecase 新しいユーザーユースケースを作成
func NewUserUsecase(userRepo domain.UserRepository) domain.UserUsecase {
	return &userUsecase{
		userRepo: userRepo,
	}
}

// GetUsers すべてのユーザーを取得
func (u *userUsecase) GetUsers() ([]*domain.User, error) {
	users, err := u.userRepo.GetAll()
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}
	return users, nil
}

// GetUserByID IDでユーザーを取得
func (u *userUsecase) GetUserByID(id int) (*domain.User, error) {
	if id <= 0 {
		return nil, fmt.Errorf("invalid user ID")
	}
	
	user, err := u.userRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return user, nil
}

// CreateUser 新しいユーザーを作成
func (u *userUsecase) CreateUser(email, name string) (*domain.User, error) {
	// 入力値の検証
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	
	// ユーザーエンティティを作成
	user := &domain.User{
		Email: email,
		Name:  name,
	}
	
	// リポジトリでユーザーを作成
	if err := u.userRepo.Create(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	
	return user, nil
}

// UpdateUser ユーザーを更新
func (u *userUsecase) UpdateUser(id int, email, name string) (*domain.User, error) {
	if id <= 0 {
		return nil, fmt.Errorf("invalid user ID")
	}
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	
	// 既存のユーザーを取得
	user, err := u.userRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	
	// ユーザー情報を更新
	user.Email = email
	user.Name = name
	
	// リポジトリでユーザーを更新
	if err := u.userRepo.Update(user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	
	return user, nil
}

// DeleteUser ユーザーを削除
func (u *userUsecase) DeleteUser(id int) error {
	if id <= 0 {
		return fmt.Errorf("invalid user ID")
	}
	
	if err := u.userRepo.Delete(id); err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	
	return nil
}

