package domain

import (
	"errors"
	"time"
)

// Text テキストエンティティ
// DDDのエンティティ：一意のIDを持ち、ライフサイクルを通じて識別される
type Text struct {
	ID        int       `json:"id"`
	Content   string    `json:"content"`
	Title     string    `json:"title,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TextContent テキストコンテンツの値オブジェクト
// DDDの値オブジェクト：不変で、等価性によって比較される
type TextContent struct {
	value string
}

// NewTextContent テキストコンテンツの値オブジェクトを作成
func NewTextContent(content string) (*TextContent, error) {
	if content == "" {
		return nil, errors.New("テキストコンテンツは空にできません")
	}
	if len(content) > 10000 {
		return nil, errors.New("テキストコンテンツは10000文字以内である必要があります")
	}
	return &TextContent{value: content}, nil
}

// Value テキストコンテンツの値を取得
func (tc *TextContent) Value() string {
	return tc.value
}

// Equals テキストコンテンツの等価性を比較
func (tc *TextContent) Equals(other *TextContent) bool {
	if other == nil {
		return false
	}
	return tc.value == other.value
}

// TextTitle テキストタイトルの値オブジェクト
type TextTitle struct {
	value string
}

// NewTextTitle テキストタイトルの値オブジェクトを作成
func NewTextTitle(title string) (*TextTitle, error) {
	if len(title) > 255 {
		return nil, errors.New("タイトルは255文字以内である必要があります")
	}
	return &TextTitle{value: title}, nil
}

// Value テキストタイトルの値を取得
func (tt *TextTitle) Value() string {
	return tt.value
}

// Equals テキストタイトルの等価性を比較
func (tt *TextTitle) Equals(other *TextTitle) bool {
	if other == nil {
		return false
	}
	return tt.value == other.value
}

// NewText 新しいテキストエンティティを作成
// ドメインロジック：テキストの作成時のビジネスルールを適用
func NewText(content, title string) (*Text, error) {
	textContent, err := NewTextContent(content)
	if err != nil {
		return nil, err
	}

	var textTitle *TextTitle
	if title != "" {
		textTitle, err = NewTextTitle(title)
		if err != nil {
			return nil, err
		}
	}

	now := time.Now()
	text := &Text{
		Content:   textContent.Value(),
		Title:     textTitle.Value(),
		CreatedAt: now,
		UpdatedAt: now,
	}

	return text, nil
}

// UpdateContent テキストコンテンツを更新
// ドメインロジック：更新時のビジネスルールを適用
func (t *Text) UpdateContent(content string) error {
	textContent, err := NewTextContent(content)
	if err != nil {
		return err
	}
	t.Content = textContent.Value()
	t.UpdatedAt = time.Now()
	return nil
}

// UpdateTitle テキストタイトルを更新
func (t *Text) UpdateTitle(title string) error {
	if title == "" {
		t.Title = ""
		return nil
	}
	textTitle, err := NewTextTitle(title)
	if err != nil {
		return err
	}
	t.Title = textTitle.Value()
	t.UpdatedAt = time.Now()
	return nil
}

// TextRepository テキストリポジトリのインターフェース
// DDDのリポジトリパターン：ドメインオブジェクトの永続化を抽象化
type TextRepository interface {
	GetAll() ([]*Text, error)
	GetByID(id int) (*Text, error)
	Create(text *Text) error
	Update(text *Text) error
	Delete(id int) error
}

// TextUsecase テキストユースケースのインターフェース
// DDDのアプリケーションサービス：ユースケースを表現
type TextUsecase interface {
	GetTexts() ([]*Text, error)
	GetTextByID(id int) (*Text, error)
	CreateText(content, title string) (*Text, error)
	UpdateText(id int, content, title string) (*Text, error)
	DeleteText(id int) error
}
