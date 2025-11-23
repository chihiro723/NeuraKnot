package persistence

import (
	"context"
	"database/sql"
	"errors"

	"backend-go/internal/domain/groupchat"

	"github.com/google/uuid"
)

// GroupMemberRepositoryImpl はグループメンバーのリポジトリ実装
type GroupMemberRepositoryImpl struct {
	db *sql.DB
}

// NewGroupMemberRepository はグループメンバーリポジトリを作成
func NewGroupMemberRepository(db *sql.DB) groupchat.GroupMemberRepository {
	return &GroupMemberRepositoryImpl{db: db}
}

// Save はグループメンバーを保存
func (r *GroupMemberRepositoryImpl) Save(ctx context.Context, member *groupchat.GroupMember) error {
	query := `
		INSERT INTO group_chat_members (
			id, group_chat_id, ai_agent_id, display_order, joined_at
		) VALUES (
			$1, $2, $3, $4, $5
		)
	`

	_, err := r.db.ExecContext(
		ctx, query,
		member.ID, member.GroupChatID, member.AIAgentID, member.DisplayOrder, member.JoinedAt,
	)
	return err
}

// FindByGroupChatID はグループチャットIDでメンバーリストを取得
func (r *GroupMemberRepositoryImpl) FindByGroupChatID(ctx context.Context, groupChatID uuid.UUID) ([]*groupchat.GroupMember, error) {
	query := `
		SELECT
			gcm.id, gcm.group_chat_id, gcm.ai_agent_id, gcm.display_order, gcm.joined_at,
			aa.name, aa.avatar_url, aa.model
		FROM group_chat_members gcm
		INNER JOIN ai_agents aa ON gcm.ai_agent_id = aa.id
		WHERE gcm.group_chat_id = $1
		ORDER BY gcm.display_order ASC
	`

	rows, err := r.db.QueryContext(ctx, query, groupChatID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*groupchat.GroupMember
	for rows.Next() {
		member := &groupchat.GroupMember{}
		var avatarURL sql.NullString
		err := rows.Scan(
			&member.ID, &member.GroupChatID, &member.AIAgentID, &member.DisplayOrder, &member.JoinedAt,
			&member.AIAgentName, &avatarURL, &member.AIAgentModel,
		)
		if err != nil {
			return nil, err
		}
		if avatarURL.Valid {
			member.AIAgentIcon = avatarURL.String
		}
		members = append(members, member)
	}

	return members, nil
}

// FindByID はIDでメンバーを取得
func (r *GroupMemberRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*groupchat.GroupMember, error) {
	query := `
		SELECT
			gcm.id, gcm.group_chat_id, gcm.ai_agent_id, gcm.display_order, gcm.joined_at,
			aa.name, aa.avatar_url, aa.model
		FROM group_chat_members gcm
		INNER JOIN ai_agents aa ON gcm.ai_agent_id = aa.id
		WHERE gcm.id = $1
	`

	member := &groupchat.GroupMember{}
	var avatarURL sql.NullString
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&member.ID, &member.GroupChatID, &member.AIAgentID, &member.DisplayOrder, &member.JoinedAt,
		&member.AIAgentName, &avatarURL, &member.AIAgentModel,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("group member not found")
	}
	if err != nil {
		return nil, err
	}

	if avatarURL.Valid {
		member.AIAgentIcon = avatarURL.String
	}

	return member, nil
}

// Delete はメンバーを削除
func (r *GroupMemberRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM group_chat_members WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.New("group member not found")
	}

	return nil
}

// UpdateDisplayOrders はメンバーの表示順序を一括更新
func (r *GroupMemberRepositoryImpl) UpdateDisplayOrders(ctx context.Context, orders map[uuid.UUID]int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `UPDATE group_chat_members SET display_order = $1 WHERE id = $2`

	for memberID, order := range orders {
		_, err := tx.ExecContext(ctx, query, order, memberID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// ExistsByGroupChatAndAgent はグループチャットとエージェントの組み合わせでメンバーが存在するかチェック
func (r *GroupMemberRepositoryImpl) ExistsByGroupChatAndAgent(ctx context.Context, groupChatID, aiAgentID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM group_chat_members WHERE group_chat_id = $1 AND ai_agent_id = $2)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, groupChatID, aiAgentID).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}
