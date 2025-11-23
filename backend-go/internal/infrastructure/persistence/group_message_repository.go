package persistence

import (
	"context"
	"database/sql"
	"errors"

	"backend-go/internal/domain/groupchat"

	"github.com/google/uuid"
)

// GroupMessageRepositoryImpl はグループメッセージのリポジトリ実装
type GroupMessageRepositoryImpl struct {
	db              *sql.DB
	toolUsageRepo   *ToolUsageRepository
}

// NewGroupMessageRepository はグループメッセージリポジトリを作成
func NewGroupMessageRepository(db *sql.DB, toolUsageRepo *ToolUsageRepository) groupchat.GroupMessageRepository {
	return &GroupMessageRepositoryImpl{
		db:            db,
		toolUsageRepo: toolUsageRepo,
	}
}

// Save はメッセージを保存
func (r *GroupMessageRepositoryImpl) Save(ctx context.Context, message *groupchat.GroupMessage) error {
	query := `
		INSERT INTO group_messages (
			id, group_chat_id, sender_type, sender_id, content, parent_message_id, ai_session_id, processing_status, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9
		)
	`

	_, err := r.db.ExecContext(
		ctx, query,
		message.ID, message.GroupChatID, message.SenderType, message.SenderID, message.Content, message.ParentMessageID, message.AISessionID, message.ProcessingStatus, message.CreatedAt,
	)
	return err
}

// FindByID はIDでメッセージを取得
func (r *GroupMessageRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*groupchat.GroupMessage, error) {
	query := `
		SELECT
			gm.id, gm.group_chat_id, gm.sender_type, gm.sender_id, gm.content, gm.parent_message_id, gm.ai_session_id, gm.processing_status, gm.created_at,
			CASE
				WHEN gm.sender_type = 'user' THEN u.display_name
				WHEN gm.sender_type = 'ai' THEN aa.name
			END as sender_name,
			CASE
				WHEN gm.sender_type = 'user' THEN u.avatar_url
				WHEN gm.sender_type = 'ai' THEN aa.avatar_url
			END as sender_icon
		FROM group_messages gm
		LEFT JOIN users u ON gm.sender_type = 'user' AND gm.sender_id = u.id
		LEFT JOIN ai_agents aa ON gm.sender_type = 'ai' AND gm.sender_id = aa.id
		WHERE gm.id = $1
	`

	message := &groupchat.GroupMessage{}
	var senderName, senderIcon sql.NullString
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&message.ID, &message.GroupChatID, &message.SenderType, &message.SenderID, &message.Content, &message.ParentMessageID, &message.AISessionID, &message.ProcessingStatus, &message.CreatedAt,
		&senderName, &senderIcon,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("group message not found")
	}
	if err != nil {
		return nil, err
	}

	if senderName.Valid {
		message.SenderName = senderName.String
	}
	if senderIcon.Valid {
		message.SenderIcon = senderIcon.String
	}

	return message, nil
}

// FindByGroupChatID はグループチャットIDでメッセージリストを取得
func (r *GroupMessageRepositoryImpl) FindByGroupChatID(ctx context.Context, groupChatID uuid.UUID, limit int, before *uuid.UUID) ([]*groupchat.GroupMessage, error) {
	var query string
	var args []interface{}

	if before != nil {
		// 指定メッセージより前のメッセージを取得
		query = `
			SELECT
				gm.id, gm.group_chat_id, gm.sender_type, gm.sender_id, gm.content, gm.parent_message_id, gm.ai_session_id, gm.processing_status, gm.created_at,
				CASE
					WHEN gm.sender_type = 'user' THEN u.display_name
					WHEN gm.sender_type = 'ai' THEN aa.name
				END as sender_name,
				CASE
					WHEN gm.sender_type = 'user' THEN u.avatar_url
					WHEN gm.sender_type = 'ai' THEN aa.avatar_url
				END as sender_icon
			FROM group_messages gm
			LEFT JOIN users u ON gm.sender_type = 'user' AND gm.sender_id = u.id
			LEFT JOIN ai_agents aa ON gm.sender_type = 'ai' AND gm.sender_id = aa.id
			WHERE gm.group_chat_id = $1 AND gm.created_at < (SELECT created_at FROM group_messages WHERE id = $2)
			ORDER BY gm.created_at DESC
			LIMIT $3
		`
		args = []interface{}{groupChatID, *before, limit}
	} else {
		query = `
			SELECT
				gm.id, gm.group_chat_id, gm.sender_type, gm.sender_id, gm.content, gm.parent_message_id, gm.ai_session_id, gm.processing_status, gm.created_at,
				CASE
					WHEN gm.sender_type = 'user' THEN u.display_name
					WHEN gm.sender_type = 'ai' THEN aa.name
				END as sender_name,
				CASE
					WHEN gm.sender_type = 'user' THEN u.avatar_url
					WHEN gm.sender_type = 'ai' THEN aa.avatar_url
				END as sender_icon
			FROM group_messages gm
			LEFT JOIN users u ON gm.sender_type = 'user' AND gm.sender_id = u.id
			LEFT JOIN ai_agents aa ON gm.sender_type = 'ai' AND gm.sender_id = aa.id
			WHERE gm.group_chat_id = $1
			ORDER BY gm.created_at DESC
			LIMIT $2
		`
		args = []interface{}{groupChatID, limit}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*groupchat.GroupMessage
	for rows.Next() {
		message := &groupchat.GroupMessage{}
		var senderName sql.NullString
		var senderIcon sql.NullString
		err := rows.Scan(
			&message.ID, &message.GroupChatID, &message.SenderType, &message.SenderID, &message.Content, &message.ParentMessageID, &message.AISessionID, &message.ProcessingStatus, &message.CreatedAt,
			&senderName, &senderIcon,
		)
		if err != nil {
			return nil, err
		}
		if senderName.Valid {
			message.SenderName = senderName.String
		}
		if senderIcon.Valid {
			message.SenderIcon = senderIcon.String
		}
		messages = append(messages, message)
	}

	// 古い順に並び替え
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	// 各メッセージのツール使用を取得
	for _, message := range messages {
		if message.SenderType == groupchat.SenderTypeAI {
			toolUsages, err := r.toolUsageRepo.FindByGroupMessageID(message.ID)
			if err == nil {
				message.ToolUsages = toolUsages
			}
		}
	}

	return messages, nil
}

// FindHistoryBeforeMessage は指定メッセージより前の会話履歴を取得
func (r *GroupMessageRepositoryImpl) FindHistoryBeforeMessage(ctx context.Context, groupChatID uuid.UUID, messageID uuid.UUID) ([]*groupchat.GroupMessage, error) {
	query := `
		SELECT
			gm.id, gm.group_chat_id, gm.sender_type, gm.sender_id, gm.content, gm.parent_message_id, gm.ai_session_id, gm.processing_status, gm.created_at,
			CASE
				WHEN gm.sender_type = 'user' THEN u.display_name
				WHEN gm.sender_type = 'ai' THEN aa.name
			END as sender_name,
			CASE
				WHEN gm.sender_type = 'user' THEN u.avatar_url
				WHEN gm.sender_type = 'ai' THEN aa.avatar_url
			END as sender_icon
		FROM group_messages gm
		LEFT JOIN users u ON gm.sender_type = 'user' AND gm.sender_id = u.id
		LEFT JOIN ai_agents aa ON gm.sender_type = 'ai' AND gm.sender_id = aa.id
		WHERE gm.group_chat_id = $1 AND gm.created_at < (SELECT created_at FROM group_messages WHERE id = $2)
		ORDER BY gm.created_at ASC
	`

	rows, err := r.db.QueryContext(ctx, query, groupChatID, messageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*groupchat.GroupMessage
	for rows.Next() {
		message := &groupchat.GroupMessage{}
		var senderName sql.NullString
		var senderIcon sql.NullString
		err := rows.Scan(
			&message.ID, &message.GroupChatID, &message.SenderType, &message.SenderID, &message.Content, &message.ParentMessageID, &message.AISessionID, &message.ProcessingStatus, &message.CreatedAt,
			&senderName, &senderIcon,
		)
		if err != nil {
			return nil, err
		}
		if senderName.Valid {
			message.SenderName = senderName.String
		}
		if senderIcon.Valid {
			message.SenderIcon = senderIcon.String
		}
		messages = append(messages, message)
	}

	return messages, nil
}

// Update はメッセージを更新
func (r *GroupMessageRepositoryImpl) Update(ctx context.Context, message *groupchat.GroupMessage) error {
	query := `
		UPDATE group_messages
		SET content = $2, processing_status = $3
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query, message.ID, message.Content, message.ProcessingStatus)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.New("group message not found")
	}

	return nil
}
