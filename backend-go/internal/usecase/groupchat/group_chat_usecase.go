package groupchat

import (
	"context"
	"errors"
	"fmt"

	"backend-go/internal/domain/groupchat"

	"github.com/google/uuid"
)

// S3Client S3操作のインターフェース
type S3Client interface {
	DeleteAvatar(ctx context.Context, avatarURL string) error
}

// GroupChatUsecase はグループチャットのユースケース
type GroupChatUsecase struct {
	groupChatRepo groupchat.GroupChatRepository
	memberRepo    groupchat.GroupMemberRepository
	s3Client      S3Client
}

// NewGroupChatUsecase はグループチャットユースケースを作成
func NewGroupChatUsecase(
	groupChatRepo groupchat.GroupChatRepository,
	memberRepo groupchat.GroupMemberRepository,
	s3Client S3Client,
) *GroupChatUsecase {
	return &GroupChatUsecase{
		groupChatRepo: groupChatRepo,
		memberRepo:    memberRepo,
		s3Client:      s3Client,
	}
}

// CreateGroupChatInput はグループチャット作成の入力
type CreateGroupChatInput struct {
	UserID      uuid.UUID
	Name        string
	Description string
	IconURL     string
	MemberIDs   []uuid.UUID // AI Agent IDs
}

// CreateGroupChat はグループチャットを作成
func (uc *GroupChatUsecase) CreateGroupChat(ctx context.Context, input CreateGroupChatInput) (*groupchat.GroupChat, error) {
	// バリデーション
	if len(input.MemberIDs) == 0 {
		return nil, errors.New("at least one member is required")
	}

	// グループチャットを作成
	gc, err := groupchat.NewGroupChat(input.UserID, input.Name, input.Description)
	if err != nil {
		return nil, fmt.Errorf("failed to create group chat: %w", err)
	}

	// アイコンURLを設定（ある場合）
	if input.IconURL != "" {
		gc.IconURL = input.IconURL
	}

	// メンバーを作成
	members := make([]*groupchat.GroupMember, 0, len(input.MemberIDs))
	for i, agentID := range input.MemberIDs {
		member, err := groupchat.NewGroupMember(gc.ID, agentID, i)
		if err != nil {
			return nil, fmt.Errorf("failed to create group member: %w", err)
		}
		members = append(members, member)
	}

	// グループチャットを保存
	if err := uc.groupChatRepo.Save(ctx, gc); err != nil {
		return nil, fmt.Errorf("failed to save group chat: %w", err)
	}

	// メンバーを保存
	for _, member := range members {
		if err := uc.memberRepo.Save(ctx, member); err != nil {
			return nil, fmt.Errorf("failed to save member: %w", err)
		}
	}

	gc.Members = members
	return gc, nil
}

// GetGroupChat はグループチャットを取得
func (uc *GroupChatUsecase) GetGroupChat(ctx context.Context, userID, groupChatID uuid.UUID) (*groupchat.GroupChat, error) {
	gc, err := uc.groupChatRepo.FindByID(ctx, groupChatID)
	if err != nil {
		return nil, fmt.Errorf("failed to find group chat: %w", err)
	}

	// ユーザーが所有者か確認
	if gc.UserID != userID {
		return nil, errors.New("unauthorized: user does not own this group chat")
	}

	// メンバーを取得
	members, err := uc.memberRepo.FindByGroupChatID(ctx, groupChatID)
	if err != nil {
		return nil, fmt.Errorf("failed to find members: %w", err)
	}

	gc.Members = members
	return gc, nil
}

// GetGroupChats はユーザーのグループチャットリストを取得
func (uc *GroupChatUsecase) GetGroupChats(ctx context.Context, userID uuid.UUID) ([]*groupchat.GroupChat, error) {
	groupChats, err := uc.groupChatRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to find group chats: %w", err)
	}

	// 各グループチャットのメンバーを取得
	for _, gc := range groupChats {
		members, err := uc.memberRepo.FindByGroupChatID(ctx, gc.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to find members: %w", err)
		}
		gc.Members = members
	}

	return groupChats, nil
}

// UpdateGroupChatInput はグループチャット更新の入力
type UpdateGroupChatInput struct {
	UserID       uuid.UUID
	GroupChatID  uuid.UUID
	Name         string
	Description  string
	IconURL      string
	SystemPrompt string
}

// UpdateGroupChat はグループチャットを更新
func (uc *GroupChatUsecase) UpdateGroupChat(ctx context.Context, input UpdateGroupChatInput) (*groupchat.GroupChat, error) {
	gc, err := uc.groupChatRepo.FindByID(ctx, input.GroupChatID)
	if err != nil {
		return nil, fmt.Errorf("failed to find group chat: %w", err)
	}

	// ユーザーが所有者か確認
	if gc.UserID != input.UserID {
		return nil, errors.New("unauthorized: user does not own this group chat")
	}

	// 更新
	if err := gc.Update(input.Name, input.Description, input.IconURL, input.SystemPrompt); err != nil {
		return nil, fmt.Errorf("failed to update group chat: %w", err)
	}

	if err := uc.groupChatRepo.Update(ctx, gc); err != nil {
		return nil, fmt.Errorf("failed to save group chat: %w", err)
	}

	return gc, nil
}

// DeleteGroupChat はグループチャットを削除
func (uc *GroupChatUsecase) DeleteGroupChat(ctx context.Context, userID, groupChatID uuid.UUID) error {
	gc, err := uc.groupChatRepo.FindByID(ctx, groupChatID)
	if err != nil {
		return fmt.Errorf("failed to find group chat: %w", err)
	}

	// ユーザーが所有者か確認
	if gc.UserID != userID {
		return errors.New("unauthorized: user does not own this group chat")
	}

	// アイコンがあればS3から削除
	if gc.IconURL != "" {
		if err := uc.s3Client.DeleteAvatar(ctx, gc.IconURL); err != nil {
			// S3削除失敗してもログだけ出して続行
			fmt.Printf("failed to delete group chat icon from S3: %v\n", err)
		}
	}

	// 削除
	if err := uc.groupChatRepo.Delete(ctx, groupChatID); err != nil {
		return fmt.Errorf("failed to delete group chat: %w", err)
	}

	return nil
}

// AddMember はメンバーを追加
func (uc *GroupChatUsecase) AddMember(ctx context.Context, userID, groupChatID, aiAgentID uuid.UUID) (*groupchat.GroupMember, error) {
	gc, err := uc.groupChatRepo.FindByID(ctx, groupChatID)
	if err != nil {
		return nil, fmt.Errorf("failed to find group chat: %w", err)
	}

	// ユーザーが所有者か確認
	if gc.UserID != userID {
		return nil, errors.New("unauthorized: user does not own this group chat")
	}

	// 既に存在するかチェック
	exists, err := uc.memberRepo.ExistsByGroupChatAndAgent(ctx, groupChatID, aiAgentID)
	if err != nil {
		return nil, fmt.Errorf("failed to check member existence: %w", err)
	}
	if exists {
		return nil, errors.New("member already exists")
	}

	// 現在のメンバー数を取得して順序を決定
	members, err := uc.memberRepo.FindByGroupChatID(ctx, groupChatID)
	if err != nil {
		return nil, fmt.Errorf("failed to find members: %w", err)
	}

	// 新しいメンバーを作成
	member, err := groupchat.NewGroupMember(groupChatID, aiAgentID, len(members))
	if err != nil {
		return nil, fmt.Errorf("failed to create member: %w", err)
	}

	if err := uc.memberRepo.Save(ctx, member); err != nil {
		return nil, fmt.Errorf("failed to save member: %w", err)
	}

	return member, nil
}

// RemoveMember はメンバーを削除
func (uc *GroupChatUsecase) RemoveMember(ctx context.Context, userID, groupChatID, memberID uuid.UUID) error {
	gc, err := uc.groupChatRepo.FindByID(ctx, groupChatID)
	if err != nil {
		return fmt.Errorf("failed to find group chat: %w", err)
	}

	// ユーザーが所有者か確認
	if gc.UserID != userID {
		return errors.New("unauthorized: user does not own this group chat")
	}

	// メンバーを取得
	member, err := uc.memberRepo.FindByID(ctx, memberID)
	if err != nil {
		return fmt.Errorf("failed to find member: %w", err)
	}

	// グループチャットのメンバーか確認
	if member.GroupChatID != groupChatID {
		return errors.New("member does not belong to this group chat")
	}

	// 最後の1人かチェック
	members, err := uc.memberRepo.FindByGroupChatID(ctx, groupChatID)
	if err != nil {
		return fmt.Errorf("failed to find members: %w", err)
	}
	if len(members) == 1 {
		return errors.New("cannot remove the last member")
	}

	// 削除
	if err := uc.memberRepo.Delete(ctx, memberID); err != nil {
		return fmt.Errorf("failed to delete member: %w", err)
	}

	return nil
}

// ReorderMembersInput はメンバー順序変更の入力
type ReorderMembersInput struct {
	UserID      uuid.UUID
	GroupChatID uuid.UUID
	Orders      map[uuid.UUID]int // memberID -> order
}

// ReorderMembers はメンバーの順序を変更
func (uc *GroupChatUsecase) ReorderMembers(ctx context.Context, input ReorderMembersInput) error {
	gc, err := uc.groupChatRepo.FindByID(ctx, input.GroupChatID)
	if err != nil {
		return fmt.Errorf("failed to find group chat: %w", err)
	}

	// ユーザーが所有者か確認
	if gc.UserID != input.UserID {
		return errors.New("unauthorized: user does not own this group chat")
	}

	// 順序を更新
	if err := uc.memberRepo.UpdateDisplayOrders(ctx, input.Orders); err != nil {
		return fmt.Errorf("failed to update display orders: %w", err)
	}

	return nil
}
