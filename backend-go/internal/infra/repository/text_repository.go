package repository

import (
	"database/sql"
	"fmt"

	"go-backend/internal/domain"
)

// textRepository テキストリポジトリの実装
// DDDのインフラ層：ドメイン層のインターフェースを実装
type textRepository struct {
	db *sql.DB
}

// NewTextRepository テキストリポジトリの新しいインスタンスを作成
func NewTextRepository(db *sql.DB) domain.TextRepository {
	return &textRepository{db: db}
}

// GetAll すべてのテキストを取得
func (r *textRepository) GetAll() ([]*domain.Text, error) {
	query := `
		SELECT id, content, title, created_at, updated_at 
		FROM texts 
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query texts: %w", err)
	}
	defer rows.Close()

	var texts []*domain.Text
	for rows.Next() {
		text := &domain.Text{}
		err := rows.Scan(
			&text.ID,
			&text.Content,
			&text.Title,
			&text.CreatedAt,
			&text.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan text: %w", err)
		}
		texts = append(texts, text)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over texts: %w", err)
	}

	return texts, nil
}

// GetByID IDでテキストを取得
func (r *textRepository) GetByID(id int) (*domain.Text, error) {
	query := `
		SELECT id, content, title, created_at, updated_at 
		FROM texts 
		WHERE id = $1
	`

	text := &domain.Text{}
	err := r.db.QueryRow(query, id).Scan(
		&text.ID,
		&text.Content,
		&text.Title,
		&text.CreatedAt,
		&text.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("text with id %d not found", id)
		}
		return nil, fmt.Errorf("failed to get text by id: %w", err)
	}

	return text, nil
}

// Create テキストを作成
func (r *textRepository) Create(text *domain.Text) error {
	query := `
		INSERT INTO texts (content, title, created_at, updated_at) 
		VALUES ($1, $2, $3, $4) 
		RETURNING id
	`

	err := r.db.QueryRow(
		query,
		text.Content,
		text.Title,
		text.CreatedAt,
		text.UpdatedAt,
	).Scan(&text.ID)

	if err != nil {
		return fmt.Errorf("failed to create text: %w", err)
	}

	return nil
}

// Update テキストを更新
func (r *textRepository) Update(text *domain.Text) error {
	query := `
		UPDATE texts 
		SET content = $1, title = $2, updated_at = $3 
		WHERE id = $4
	`

	result, err := r.db.Exec(query, text.Content, text.Title, text.UpdatedAt, text.ID)
	if err != nil {
		return fmt.Errorf("failed to update text: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("text with id %d not found", text.ID)
	}

	return nil
}

// Delete テキストを削除
func (r *textRepository) Delete(id int) error {
	query := `DELETE FROM texts WHERE id = $1`

	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete text: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("text with id %d not found", id)
	}

	return nil
}
