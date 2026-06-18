package chatpin

import (
	"context"

	"github.com/google/uuid"
)

// Repository はチャットピンのリポジトリインターフェース
// 単一テーブル user_chat_pins に対する CRUD を提供する
type Repository interface {
	// Add はピンを追加（冪等: 既に存在する場合は何もしない）
	Add(ctx context.Context, pin *Pin) error

	// Remove はピンを削除（存在しなくてもエラーにしない）
	Remove(ctx context.Context, userID uuid.UUID, chatType ChatType, targetID uuid.UUID) error

	// ListByUserID はユーザーのピン一覧を pinned_at DESC で取得
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]*Pin, error)

	// DeleteByTarget は指定種別×targetID の全ユーザー分のピンを削除
	// エージェント／グループ削除時に孤児レコードを掃除するために使用する
	DeleteByTarget(ctx context.Context, chatType ChatType, targetID uuid.UUID) error
}
