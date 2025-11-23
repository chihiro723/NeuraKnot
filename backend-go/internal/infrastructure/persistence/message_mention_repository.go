package persistence

import (
	"context"
	"database/sql"
	"errors"

	"backend-go/internal/domain/groupchat"

	"github.com/google/uuid"
)

// MessageMentionRepositoryImpl はメッセージメンションのリポジトリ実装
type MessageMentionRepositoryImpl struct {
	db *sql.DB
}

// NewMessageMentionRepository はメッセージメンションリポジトリを作成
func NewMessageMentionRepository(db *sql.DB) groupchat.MessageMentionRepository {
	return &MessageMentionRepositoryImpl{db: db}
}

// Save はメンションを保存
func (r *MessageMentionRepositoryImpl) Save(ctx context.Context, mention *groupchat.MessageMention) error {
	query := `
		INSERT INTO message_mentions (
			id, message_id, ai_agent_id, mention_order, status, response_message_id, error_message, created_at, started_at, completed_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
		)
	`

	_, err := r.db.ExecContext(
		ctx, query,
		mention.ID, mention.MessageID, mention.AIAgentID, mention.MentionOrder, mention.Status, mention.ResponseMessageID, mention.ErrorMessage, mention.CreatedAt, mention.StartedAt, mention.CompletedAt,
	)
	return err
}

// FindByMessageID はメッセージIDでメンションリストを取得（順序順）
func (r *MessageMentionRepositoryImpl) FindByMessageID(ctx context.Context, messageID uuid.UUID) ([]*groupchat.MessageMention, error) {
	query := `
		SELECT
			mm.id, mm.message_id, mm.ai_agent_id, mm.mention_order, mm.status, mm.response_message_id, mm.error_message, mm.created_at, mm.started_at, mm.completed_at,
			aa.name, aa.avatar_url, aa.model
		FROM message_mentions mm
		INNER JOIN ai_agents aa ON mm.ai_agent_id = aa.id
		WHERE mm.message_id = $1
		ORDER BY mm.mention_order ASC
	`

	rows, err := r.db.QueryContext(ctx, query, messageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mentions []*groupchat.MessageMention
	for rows.Next() {
		mention := &groupchat.MessageMention{}
		var avatarURL sql.NullString
		err := rows.Scan(
			&mention.ID, &mention.MessageID, &mention.AIAgentID, &mention.MentionOrder, &mention.Status, &mention.ResponseMessageID, &mention.ErrorMessage, &mention.CreatedAt, &mention.StartedAt, &mention.CompletedAt,
			&mention.AIAgentName, &avatarURL, &mention.AIAgentModel,
		)
		if err != nil {
			return nil, err
		}
		if avatarURL.Valid {
			mention.AIAgentIcon = avatarURL.String
		}
		mentions = append(mentions, mention)
	}

	return mentions, nil
}

// FindByID はIDでメンションを取得
func (r *MessageMentionRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*groupchat.MessageMention, error) {
	query := `
		SELECT
			mm.id, mm.message_id, mm.ai_agent_id, mm.mention_order, mm.status, mm.response_message_id, mm.error_message, mm.created_at, mm.started_at, mm.completed_at,
			aa.name, aa.avatar_url, aa.model
		FROM message_mentions mm
		INNER JOIN ai_agents aa ON mm.ai_agent_id = aa.id
		WHERE mm.id = $1
	`

	mention := &groupchat.MessageMention{}
	var avatarURL sql.NullString
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&mention.ID, &mention.MessageID, &mention.AIAgentID, &mention.MentionOrder, &mention.Status, &mention.ResponseMessageID, &mention.ErrorMessage, &mention.CreatedAt, &mention.StartedAt, &mention.CompletedAt,
		&mention.AIAgentName, &avatarURL, &mention.AIAgentModel,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("message mention not found")
	}
	if err != nil {
		return nil, err
	}

	if avatarURL.Valid {
		mention.AIAgentIcon = avatarURL.String
	}

	return mention, nil
}

// Update はメンションを更新
func (r *MessageMentionRepositoryImpl) Update(ctx context.Context, mention *groupchat.MessageMention) error {
	query := `
		UPDATE message_mentions
		SET status = $2, response_message_id = $3, error_message = $4, started_at = $5, completed_at = $6
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query, mention.ID, mention.Status, mention.ResponseMessageID, mention.ErrorMessage, mention.StartedAt, mention.CompletedAt)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.New("message mention not found")
	}

	return nil
}

// CancelPendingMentions は指定メッセージの未処理メンションをキャンセル
func (r *MessageMentionRepositoryImpl) CancelPendingMentions(ctx context.Context, messageID uuid.UUID) error {
	query := `
		UPDATE message_mentions
		SET status = $1, completed_at = NOW()
		WHERE message_id = $2 AND status IN ($3, $4)
	`

	_, err := r.db.ExecContext(ctx, query, groupchat.MentionStatusCancelled, messageID, groupchat.MentionStatusPending, groupchat.MentionStatusProcessing)
	return err
}
