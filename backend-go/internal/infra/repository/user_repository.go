package repository

import (
	"database/sql"
	"fmt"
	"time"

	"go-backend/internal/domain"
)

// userRepository ユーザーリポジトリの実装
type userRepository struct {
	db *sql.DB
}

// NewUserRepository 新しいユーザーリポジトリを作成
func NewUserRepository(db *sql.DB) domain.UserRepository {
	return &userRepository{db: db}
}

// GetAll すべてのユーザーを取得
func (r *userRepository) GetAll() ([]*domain.User, error) {
	query := `SELECT id, email, name, created_at, updated_at FROM users ORDER BY created_at DESC`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		user := &domain.User{}
		err := rows.Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt, &user.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}

	return users, nil
}

// GetByID IDでユーザーを取得
func (r *userRepository) GetByID(id int) (*domain.User, error) {
	query := `SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1`
	user := &domain.User{}
	err := r.db.QueryRow(query, id).Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return user, nil
}

// Create 新しいユーザーを作成
func (r *userRepository) Create(user *domain.User) error {
	query := `INSERT INTO users (email, name, created_at, updated_at) VALUES ($1, $2, $3, $4) RETURNING id`
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now
	
	err := r.db.QueryRow(query, user.Email, user.Name, user.CreatedAt, user.UpdatedAt).Scan(&user.ID)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

// Update ユーザーを更新
func (r *userRepository) Update(user *domain.User) error {
	query := `UPDATE users SET email = $1, name = $2, updated_at = $3 WHERE id = $4`
	user.UpdatedAt = time.Now()
	
	result, err := r.db.Exec(query, user.Email, user.Name, user.UpdatedAt, user.ID)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}
	
	return nil
}

// Delete ユーザーを削除
func (r *userRepository) Delete(id int) error {
	query := `DELETE FROM users WHERE id = $1`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}
	
	return nil
}

