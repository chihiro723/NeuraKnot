package persistence

import (
	"context"
	"database/sql"
	"errors"
	"log"

	"backend-go/internal/domain/groupchat"

	"github.com/google/uuid"
)

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// GroupChatRepositoryImpl はグループチャットのリポジトリ実装
type GroupChatRepositoryImpl struct {
	db *sql.DB
}

// NewGroupChatRepository はグループチャットリポジトリを作成
func NewGroupChatRepository(db *sql.DB) groupchat.GroupChatRepository {
	return &GroupChatRepositoryImpl{db: db}
}

// Save はグループチャットを保存
func (r *GroupChatRepositoryImpl) Save(ctx context.Context, gc *groupchat.GroupChat) error {
	query := `
		INSERT INTO group_chats (
			id, user_id, name, description, icon_url, system_prompt, message_count, last_message_at, is_active, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
	`

	_, err := r.db.ExecContext(
		ctx, query,
		gc.ID, gc.UserID, gc.Name, gc.Description, gc.IconURL, gc.SystemPrompt, gc.MessageCount, gc.LastMessageAt, gc.IsActive, gc.CreatedAt, gc.UpdatedAt,
	)
	return err
}

// FindByID はIDでグループチャットを取得
func (r *GroupChatRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*groupchat.GroupChat, error) {
	query := `
		SELECT
			id, user_id, name, description, icon_url, system_prompt, message_count, last_message_at, is_active, created_at, updated_at
		FROM group_chats
		WHERE id = $1
	`

	gc := &groupchat.GroupChat{}
	var systemPrompt sql.NullString
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&gc.ID, &gc.UserID, &gc.Name, &gc.Description, &gc.IconURL, &systemPrompt, &gc.MessageCount, &gc.LastMessageAt, &gc.IsActive, &gc.CreatedAt, &gc.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("group chat not found")
	}
	if err != nil {
		return nil, err
	}

	if systemPrompt.Valid {
		gc.SystemPrompt = systemPrompt.String
	}

	return gc, nil
}

// FindByUserID はユーザーIDでグループチャットリストを取得
func (r *GroupChatRepositoryImpl) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*groupchat.GroupChat, error) {
	query := `
		WITH latest_messages AS (
			SELECT DISTINCT ON (gm.group_chat_id)
				gm.group_chat_id,
				gm.content,
				gm.sender_type,
				CASE
					WHEN gm.sender_type = 'user' THEN u.display_name
					WHEN gm.sender_type = 'ai' THEN aa.name
					ELSE ''
				END as sender_name,
				gm.created_at
			FROM group_messages gm
			LEFT JOIN users u ON gm.sender_type = 'user' AND gm.sender_id = u.id
			LEFT JOIN ai_agents aa ON gm.sender_type = 'ai' AND gm.sender_id = aa.id
			ORDER BY gm.group_chat_id, gm.created_at DESC
		)
		SELECT
			gc.id, gc.user_id, gc.name, gc.description, gc.icon_url, gc.system_prompt,
			gc.message_count, gc.last_message_at, gc.is_active, gc.created_at, gc.updated_at,
			lm.content, lm.sender_type, lm.sender_name
		FROM group_chats gc
		LEFT JOIN latest_messages lm ON gc.id = lm.group_chat_id
		WHERE gc.user_id = $1 AND gc.is_active = true
		ORDER BY gc.last_message_at DESC NULLS LAST, gc.created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groupChats []*groupchat.GroupChat
	for rows.Next() {
		gc := &groupchat.GroupChat{}
		var systemPrompt, lastMessageContent, lastMessageSenderType, lastMessageSenderName sql.NullString
		
		err := rows.Scan(
			&gc.ID, &gc.UserID, &gc.Name, &gc.Description, &gc.IconURL, &systemPrompt,
			&gc.MessageCount, &gc.LastMessageAt, &gc.IsActive, &gc.CreatedAt, &gc.UpdatedAt,
			&lastMessageContent, &lastMessageSenderType, &lastMessageSenderName,
		)
		if err != nil {
			return nil, err
		}

		// システムプロンプトを設定
		if systemPrompt.Valid {
			gc.SystemPrompt = systemPrompt.String
		}

		// 最後のメッセージがある場合は設定
		if lastMessageContent.Valid {
			senderType, _ := groupchat.ParseSenderType(lastMessageSenderType.String)
			gc.LastMessage = &groupchat.GroupMessage{
				Content:    lastMessageContent.String,
				SenderType: senderType,
				SenderName: lastMessageSenderName.String,
			}
			// デバッグログ
			log.Printf("DEBUG REPO: GroupChat %s has LastMessage: content=%s, sender_type=%s, sender_name=%s",
				gc.Name, lastMessageContent.String[:min(50, len(lastMessageContent.String))], senderType, lastMessageSenderName.String)
		} else {
			log.Printf("DEBUG REPO: GroupChat %s has NO LastMessage (Valid=%v)", gc.Name, lastMessageContent.Valid)
		}

		groupChats = append(groupChats, gc)
	}

	return groupChats, nil
}

// Update はグループチャットを更新
func (r *GroupChatRepositoryImpl) Update(ctx context.Context, gc *groupchat.GroupChat) error {
	query := `
		UPDATE group_chats
		SET name = $2, description = $3, icon_url = $4, system_prompt = $5, message_count = $6, last_message_at = $7, is_active = $8, updated_at = $9
		WHERE id = $1
	`

	result, err := r.db.ExecContext(
		ctx, query,
		gc.ID, gc.Name, gc.Description, gc.IconURL, gc.SystemPrompt, gc.MessageCount, gc.LastMessageAt, gc.IsActive, gc.UpdatedAt,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.New("group chat not found")
	}

	return nil
}

// Delete はグループチャットを削除
func (r *GroupChatRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM group_chats WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.New("group chat not found")
	}

	return nil
}
