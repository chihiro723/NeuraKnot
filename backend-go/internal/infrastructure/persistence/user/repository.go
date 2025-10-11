package user

import (
	"backend-go/internal/domain/user"
	"context"
	"database/sql"
	"fmt"
	"time"
)

// Repository PostgreSQLユーザーリポジトリ実装
type Repository struct {
	db *sql.DB
}

// NewRepository リポジトリを作成
func NewRepository(db *sql.DB) user.UserRepository {
	return &Repository{
		db: db,
	}
}

// Save ユーザーを保存
func (r *Repository) Save(ctx context.Context, user *user.User) error {
	query := `
		INSERT INTO users (id, cognito_user_id, email, display_name, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id) 
		DO UPDATE SET 
			cognito_user_id = EXCLUDED.cognito_user_id,
			email = EXCLUDED.email,
			display_name = EXCLUDED.display_name,
			status = EXCLUDED.status,
			updated_at = EXCLUDED.updated_at
	`

	_, err := r.db.ExecContext(ctx, query,
		user.ID.String(),
		user.CognitoUserID,
		user.Email.String(),
		user.DisplayName,
		user.Status.String(),
		user.CreatedAt,
		user.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to save user: %w", err)
	}

	return nil
}

// GetByID IDでユーザーを取得
func (r *Repository) GetByID(ctx context.Context, id user.UserID) (*user.User, error) {
	query := `
		SELECT id, cognito_user_id, email, display_name, status, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var u user.User
	var userID, email, status string
	var createdAt, updatedAt time.Time

	err := r.db.QueryRowContext(ctx, query, id.String()).Scan(
		&userID,
		&u.CognitoUserID,
		&email,
		&u.DisplayName,
		&status,
		&createdAt,
		&updatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// 値オブジェクトを作成
	parsedUserID, err := user.ParseUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	parsedEmail, err := user.NewEmail(email)
	if err != nil {
		return nil, fmt.Errorf("invalid email: %w", err)
	}

	parsedStatus, err := user.ParseUserStatus(status)
	if err != nil {
		return nil, fmt.Errorf("invalid status: %w", err)
	}

	u.ID = parsedUserID
	u.Email = parsedEmail
	u.Status = parsedStatus
	u.CreatedAt = createdAt
	u.UpdatedAt = updatedAt

	return &u, nil
}

// GetByCognitoUserID CognitoユーザーIDでユーザーを取得
func (r *Repository) GetByCognitoUserID(ctx context.Context, cognitoUserID string) (*user.User, error) {
	query := `
		SELECT id, cognito_user_id, email, display_name, status, created_at, updated_at
		FROM users
		WHERE cognito_user_id = $1
	`

	var u user.User
	var userID, email, status string
	var createdAt, updatedAt time.Time

	err := r.db.QueryRowContext(ctx, query, cognitoUserID).Scan(
		&userID,
		&u.CognitoUserID,
		&email,
		&u.DisplayName,
		&status,
		&createdAt,
		&updatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// 値オブジェクトを作成
	parsedUserID, err := user.ParseUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	parsedEmail, err := user.NewEmail(email)
	if err != nil {
		return nil, fmt.Errorf("invalid email: %w", err)
	}

	parsedStatus, err := user.ParseUserStatus(status)
	if err != nil {
		return nil, fmt.Errorf("invalid status: %w", err)
	}

	u.ID = parsedUserID
	u.Email = parsedEmail
	u.Status = parsedStatus
	u.CreatedAt = createdAt
	u.UpdatedAt = updatedAt

	return &u, nil
}

// GetByEmail メールアドレスでユーザーを取得
func (r *Repository) GetByEmail(ctx context.Context, email user.Email) (*user.User, error) {
	query := `
		SELECT id, cognito_user_id, email, display_name, status, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var u user.User
	var userID, emailStr, status string
	var createdAt, updatedAt time.Time

	err := r.db.QueryRowContext(ctx, query, email.String()).Scan(
		&userID,
		&u.CognitoUserID,
		&emailStr,
		&u.DisplayName,
		&status,
		&createdAt,
		&updatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// 値オブジェクトを作成
	parsedUserID, err := user.ParseUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	parsedEmail, err := user.NewEmail(emailStr)
	if err != nil {
		return nil, fmt.Errorf("invalid email: %w", err)
	}

	parsedStatus, err := user.ParseUserStatus(status)
	if err != nil {
		return nil, fmt.Errorf("invalid status: %w", err)
	}

	u.ID = parsedUserID
	u.Email = parsedEmail
	u.Status = parsedStatus
	u.CreatedAt = createdAt
	u.UpdatedAt = updatedAt

	return &u, nil
}

// GetByUsername は削除されました
// メールアドレスがusernameとして機能するため、GetByEmailを使用してください

// Delete ユーザーを削除
func (r *Repository) Delete(ctx context.Context, id user.UserID) error {
	query := `DELETE FROM users WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id.String())
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

// List ユーザー一覧を取得
func (r *Repository) List(ctx context.Context, limit, offset int) ([]*user.User, error) {
	query := `
		SELECT id, cognito_user_id, email, display_name, status, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	var users []*user.User
	for rows.Next() {
		var u user.User
		var userID, email, status string
		var createdAt, updatedAt time.Time

		err := rows.Scan(
			&userID,
			&u.CognitoUserID,
			&email,
			&u.DisplayName,
			&status,
			&createdAt,
			&updatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}

		// 値オブジェクトを作成
		parsedUserID, err := user.ParseUserID(userID)
		if err != nil {
			return nil, fmt.Errorf("invalid user ID: %w", err)
		}

		parsedEmail, err := user.NewEmail(email)
		if err != nil {
			return nil, fmt.Errorf("invalid email: %w", err)
		}

		parsedStatus, err := user.ParseUserStatus(status)
		if err != nil {
			return nil, fmt.Errorf("invalid status: %w", err)
		}

		u.ID = parsedUserID
		u.Email = parsedEmail
		u.Status = parsedStatus
		u.CreatedAt = createdAt
		u.UpdatedAt = updatedAt

		users = append(users, &u)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating users: %w", err)
	}

	return users, nil
}

// Update ユーザーを更新
func (r *Repository) Update(ctx context.Context, user *user.User) error {
	query := `
		UPDATE users 
		SET cognito_user_id = $2, email = $3, display_name = $4, status = $5, updated_at = $6
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query,
		user.ID.String(),
		user.CognitoUserID,
		user.Email.String(),
		user.DisplayName,
		user.Status.String(),
		user.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}
