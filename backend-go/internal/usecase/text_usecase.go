package usecase

import (
	"fmt"

	"go-backend/internal/domain"
)

// textUsecase テキストユースケースの実装
// DDDのアプリケーションサービス：ユースケースを実装し、ドメインロジックを調整
type textUsecase struct {
	textRepo domain.TextRepository
}

// NewTextUsecase テキストユースケースの新しいインスタンスを作成
func NewTextUsecase(textRepo domain.TextRepository) domain.TextUsecase {
	return &textUsecase{
		textRepo: textRepo,
	}
}

// GetTexts すべてのテキストを取得
func (u *textUsecase) GetTexts() ([]*domain.Text, error) {
	texts, err := u.textRepo.GetAll()
	if err != nil {
		return nil, fmt.Errorf("failed to get texts: %w", err)
	}
	return texts, nil
}

// GetTextByID IDでテキストを取得
func (u *textUsecase) GetTextByID(id int) (*domain.Text, error) {
	if id <= 0 {
		return nil, fmt.Errorf("invalid text id: %d", id)
	}

	text, err := u.textRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get text by id: %w", err)
	}
	return text, nil
}

// CreateText 新しいテキストを作成
// アプリケーションサービス：ドメインオブジェクトの作成と永続化を調整
func (u *textUsecase) CreateText(content, title string) (*domain.Text, error) {
	// ドメインオブジェクトの作成（ビジネスルールの適用）
	text, err := domain.NewText(content, title)
	if err != nil {
		return nil, fmt.Errorf("failed to create text domain object: %w", err)
	}

	// 永続化
	err = u.textRepo.Create(text)
	if err != nil {
		return nil, fmt.Errorf("failed to save text: %w", err)
	}

	return text, nil
}

// UpdateText テキストを更新
func (u *textUsecase) UpdateText(id int, content, title string) (*domain.Text, error) {
	if id <= 0 {
		return nil, fmt.Errorf("invalid text id: %d", id)
	}

	// 既存のテキストを取得
	text, err := u.textRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get text for update: %w", err)
	}

	// ドメインオブジェクトの更新（ビジネスルールの適用）
	if content != "" {
		err = text.UpdateContent(content)
		if err != nil {
			return nil, fmt.Errorf("failed to update content: %w", err)
		}
	}

	if title != "" || title == "" {
		err = text.UpdateTitle(title)
		if err != nil {
			return nil, fmt.Errorf("failed to update title: %w", err)
		}
	}

	// 永続化
	err = u.textRepo.Update(text)
	if err != nil {
		return nil, fmt.Errorf("failed to update text: %w", err)
	}

	return text, nil
}

// DeleteText テキストを削除
func (u *textUsecase) DeleteText(id int) error {
	if id <= 0 {
		return fmt.Errorf("invalid text id: %d", id)
	}

	err := u.textRepo.Delete(id)
	if err != nil {
		return fmt.Errorf("failed to delete text: %w", err)
	}

	return nil
}
