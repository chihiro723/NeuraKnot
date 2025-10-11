package persistence

import (
	"context"
	"database/sql"
	"errors"

	"backend-go/internal/domain/conversation"

	"github.com/google/uuid"
)

// MessageRepositoryImpl はメッセージのリポジトリ実装
type MessageRepositoryImpl struct {
	db *sql.DB
}

// NewMessageRepository はメッセージリポジトリを作成
func NewMessageRepository(db *sql.DB) conversation.MessageRepository {
	return &MessageRepositoryImpl{db: db}
}

// Save はメッセージを保存
func (r *MessageRepositoryImpl) Save(ctx context.Context, message *conversation.Message) error {
	query := `
		INSERT INTO messages (
			id, conversation_id, sender_type, sender_id, content, ai_session_id, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7
		)
	`

	_, err := r.db.ExecContext(
		ctx, query,
		message.ID, message.ConversationID, message.SenderType.String(), message.SenderID, message.Content, message.AISessionID, message.CreatedAt,
	)
	return err
}

// FindByID はIDでメッセージを取得
func (r *MessageRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*conversation.Message, error) {
	query := `
		SELECT 
			id, conversation_id, sender_type, sender_id, content, ai_session_id, created_at
		FROM messages
		WHERE id = $1
	`

	message := &conversation.Message{}
	var senderTypeStr string

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&message.ID, &message.ConversationID, &senderTypeStr, &message.SenderID, &message.Content, &message.AISessionID, &message.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("message not found")
	}
	if err != nil {
		return nil, err
	}

	// Parse sender type
	senderType, err := conversation.ParseSenderType(senderTypeStr)
	if err != nil {
		return nil, err
	}
	message.SenderType = senderType

	return message, nil
}

// FindByConversationID は会話IDでメッセージリストを取得
func (r *MessageRepositoryImpl) FindByConversationID(ctx context.Context, conversationID uuid.UUID, limit int) ([]*conversation.Message, error) {
	query := `
		SELECT 
			id, conversation_id, sender_type, sender_id, content, ai_session_id, created_at
		FROM messages
		WHERE conversation_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, conversationID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := []*conversation.Message{}
	for rows.Next() {
		message := &conversation.Message{}
		var senderTypeStr string

		err := rows.Scan(
			&message.ID, &message.ConversationID, &senderTypeStr, &message.SenderID, &message.Content, &message.AISessionID, &message.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Parse sender type
		senderType, err := conversation.ParseSenderType(senderTypeStr)
		if err != nil {
			return nil, err
		}
		message.SenderType = senderType

		messages = append(messages, message)
	}

	return messages, rows.Err()
}
