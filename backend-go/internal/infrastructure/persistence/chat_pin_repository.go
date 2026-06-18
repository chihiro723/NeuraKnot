package persistence

import (
	"context"
	"database/sql"

	"backend-go/internal/domain/chatpin"

	"github.com/google/uuid"
)

// ChatPinRepositoryImpl はチャットピンのリポジトリ実装
type ChatPinRepositoryImpl struct {
	db *sql.DB
}

// NewChatPinRepository はチャットピンリポジトリを作成
func NewChatPinRepository(db *sql.DB) chatpin.Repository {
	return &ChatPinRepositoryImpl{db: db}
}

// Add はピンを追加（冪等）
// 自然キー (user_id, chat_type, target_id) の重複時は何もしない
func (r *ChatPinRepositoryImpl) Add(ctx context.Context, pin *chatpin.Pin) error {
	query := `
		INSERT INTO user_chat_pins (
			id, user_id, chat_type, target_id, pinned_at
		) VALUES (
			$1, $2, $3, $4, $5
		)
		ON CONFLICT ON CONSTRAINT unique_user_chat_pin DO NOTHING
	`
	_, err := r.db.ExecContext(ctx, query, pin.ID, pin.UserID, string(pin.ChatType), pin.TargetID, pin.PinnedAt)
	return err
}

// Remove はピンを削除（存在しない場合もエラーにしない）
func (r *ChatPinRepositoryImpl) Remove(ctx context.Context, userID uuid.UUID, chatType chatpin.ChatType, targetID uuid.UUID) error {
	query := `
		DELETE FROM user_chat_pins
		WHERE user_id = $1 AND chat_type = $2 AND target_id = $3
	`
	_, err := r.db.ExecContext(ctx, query, userID, string(chatType), targetID)
	return err
}

// ListByUserID はユーザーのピン一覧を取得（pinned_at DESC）
func (r *ChatPinRepositoryImpl) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*chatpin.Pin, error) {
	query := `
		SELECT id, user_id, chat_type, target_id, pinned_at
		FROM user_chat_pins
		WHERE user_id = $1
		ORDER BY pinned_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pins []*chatpin.Pin
	for rows.Next() {
		pin := &chatpin.Pin{}
		var chatTypeStr string
		if err := rows.Scan(&pin.ID, &pin.UserID, &chatTypeStr, &pin.TargetID, &pin.PinnedAt); err != nil {
			return nil, err
		}
		pin.ChatType = chatpin.ChatType(chatTypeStr)
		pins = append(pins, pin)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return pins, nil
}

// DeleteByTarget は指定種別×targetID の全ピンを削除する
// エージェントやグループ削除時に、全ユーザーの該当ピンをまとめて掃除するために使う
func (r *ChatPinRepositoryImpl) DeleteByTarget(ctx context.Context, chatType chatpin.ChatType, targetID uuid.UUID) error {
	query := `
		DELETE FROM user_chat_pins
		WHERE chat_type = $1 AND target_id = $2
	`
	_, err := r.db.ExecContext(ctx, query, string(chatType), targetID)
	return err
}
