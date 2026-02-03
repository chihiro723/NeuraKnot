package conversation

import (
	"testing"

	"github.com/google/uuid"
)

// ChatSessionエンティティの仕様
// ============================================
// 【目的】
// - AI処理セッションの記録（トークン使用量、処理時間など）
// - 1対1チャットとグループチャットの両方に対応
//
// 【必須項目】
// 1. UserID (uuid.UUID): ユーザーID
// 2. ConversationID (*uuid.UUID): 会話ID（1対1の場合のみ、グループチャットではnil）
// 3. GroupChatID (*uuid.UUID): グループチャットID（グループの場合のみ、1対1ではnil）
// 4. AIAgentID (uuid.UUID): AI AgentのID
// 5. Provider (string): LLMプロバイダー（"openai", "anthropic", etc.）
// 6. Model (string): モデル名
// 7. Persona (string): ペルソナ
//
// 【記録データ】
// - Temperature: 温度パラメータ
// - TokensPrompt/Completion/Total: トークン使用量
// - ProcessingTimeMs: 処理時間（ミリ秒）
// - ToolsUsed: 使用したツール数
// - Status: ステータス（"completed" or "failed"）
// - ErrorMessage: エラーメッセージ（失敗時）
//
// 【作成方法】
// - NewChatSession(): 1対1チャット用（ConversationID設定、GroupChatIDはnil）
// - NewGroupChatSession(): グループチャット用（GroupChatID設定、ConversationIDはnil）
//
// 【失敗処理】
// - MarkAsFailed(errorMessage): ステータスを"failed"に、CompletedAtを設定
//
// 【使用箇所】
// - AI API呼び出し後のセッション記録
// - トークン使用量の集計
// - エラー追跡・デバッグ
// - 分析ダッシュボード
// ============================================

func TestNewChatSession(t *testing.T) {
	userID := uuid.New()
	conversationID := uuid.New()
	aiAgentID := uuid.New()
	messageID := uuid.New()

	session := NewChatSession(
		userID,
		conversationID,
		aiAgentID,
		&messageID,
		"openai",
		"gpt-4o",
		"assistant",
		0.7,
		1000,
		2000,
		3000,
		500,
		2,
	)

	if session == nil {
		t.Fatal("NewChatSession() returned nil")
	}

	// 入力値の確認
	if session.UserID != userID {
		t.Errorf("UserID = %v, want %v", session.UserID, userID)
	}
	if session.ConversationID == nil || *session.ConversationID != conversationID {
		t.Errorf("ConversationID = %v, want %v", session.ConversationID, conversationID)
	}
	if session.GroupChatID != nil {
		t.Error("GroupChatID should be nil for 1-on-1 chat")
	}
	if session.AIAgentID != aiAgentID {
		t.Errorf("AIAgentID = %v, want %v", session.AIAgentID, aiAgentID)
	}
	if session.MessageID == nil || *session.MessageID != messageID {
		t.Errorf("MessageID = %v, want %v", session.MessageID, messageID)
	}
	if session.Provider != "openai" {
		t.Errorf("Provider = %q, want %q", session.Provider, "openai")
	}
	if session.Model != "gpt-4o" {
		t.Errorf("Model = %q, want %q", session.Model, "gpt-4o")
	}
	if session.Persona != "assistant" {
		t.Errorf("Persona = %q, want %q", session.Persona, "assistant")
	}
	if session.Temperature != 0.7 {
		t.Errorf("Temperature = %f, want 0.7", session.Temperature)
	}
	if session.TokensPrompt != 1000 {
		t.Errorf("TokensPrompt = %d, want 1000", session.TokensPrompt)
	}
	if session.TokensCompletion != 2000 {
		t.Errorf("TokensCompletion = %d, want 2000", session.TokensCompletion)
	}
	if session.TokensTotal != 3000 {
		t.Errorf("TokensTotal = %d, want 3000", session.TokensTotal)
	}
	if session.ProcessingTimeMs != 500 {
		t.Errorf("ProcessingTimeMs = %d, want 500", session.ProcessingTimeMs)
	}
	if session.ToolsUsed != 2 {
		t.Errorf("ToolsUsed = %d, want 2", session.ToolsUsed)
	}

	// デフォルト値の確認
	if session.Status != "completed" {
		t.Errorf("Status = %q, want %q", session.Status, "completed")
	}
	if session.ErrorMessage != nil {
		t.Error("ErrorMessage should be nil for completed session")
	}
	if session.CompletedAt == nil {
		t.Error("CompletedAt should be set")
	}
}

func TestNewGroupChatSession(t *testing.T) {
	userID := uuid.New()
	groupChatID := uuid.New()
	aiAgentID := uuid.New()
	messageID := uuid.New()

	session := NewGroupChatSession(
		userID,
		groupChatID,
		aiAgentID,
		&messageID,
		"anthropic",
		"claude-3-5-sonnet",
		"creative",
		0.9,
		500,
		1500,
		2000,
		800,
		1,
	)

	if session == nil {
		t.Fatal("NewGroupChatSession() returned nil")
	}

	// 入力値の確認
	if session.UserID != userID {
		t.Errorf("UserID = %v, want %v", session.UserID, userID)
	}
	if session.ConversationID != nil {
		t.Error("ConversationID should be nil for group chat")
	}
	if session.GroupChatID == nil || *session.GroupChatID != groupChatID {
		t.Errorf("GroupChatID = %v, want %v", session.GroupChatID, groupChatID)
	}
	if session.AIAgentID != aiAgentID {
		t.Errorf("AIAgentID = %v, want %v", session.AIAgentID, aiAgentID)
	}
	if session.MessageID == nil || *session.MessageID != messageID {
		t.Errorf("MessageID = %v, want %v", session.MessageID, messageID)
	}
	if session.Provider != "anthropic" {
		t.Errorf("Provider = %q, want %q", session.Provider, "anthropic")
	}
	if session.Model != "claude-3-5-sonnet" {
		t.Errorf("Model = %q, want %q", session.Model, "claude-3-5-sonnet")
	}
	if session.Persona != "creative" {
		t.Errorf("Persona = %q, want %q", session.Persona, "creative")
	}
	if session.Temperature != 0.9 {
		t.Errorf("Temperature = %f, want 0.9", session.Temperature)
	}
	if session.TokensPrompt != 500 {
		t.Errorf("TokensPrompt = %d, want 500", session.TokensPrompt)
	}
	if session.TokensCompletion != 1500 {
		t.Errorf("TokensCompletion = %d, want 1500", session.TokensCompletion)
	}
	if session.TokensTotal != 2000 {
		t.Errorf("TokensTotal = %d, want 2000", session.TokensTotal)
	}
	if session.ProcessingTimeMs != 800 {
		t.Errorf("ProcessingTimeMs = %d, want 800", session.ProcessingTimeMs)
	}
	if session.ToolsUsed != 1 {
		t.Errorf("ToolsUsed = %d, want 1", session.ToolsUsed)
	}

	// デフォルト値の確認
	if session.Status != "completed" {
		t.Errorf("Status = %q, want %q", session.Status, "completed")
	}
	if session.ErrorMessage != nil {
		t.Error("ErrorMessage should be nil for completed session")
	}
	if session.CompletedAt == nil {
		t.Error("CompletedAt should be set")
	}
}

func TestChatSessionMarkAsFailed(t *testing.T) {
	userID := uuid.New()
	conversationID := uuid.New()
	aiAgentID := uuid.New()

	session := NewChatSession(
		userID,
		conversationID,
		aiAgentID,
		nil,
		"openai",
		"gpt-4o",
		"assistant",
		0.7,
		0,
		0,
		0,
		0,
		0,
	)

	// 初期状態は"completed"
	if session.Status != "completed" {
		t.Errorf("Initial Status = %q, want %q", session.Status, "completed")
	}
	if session.ErrorMessage != nil {
		t.Error("Initial ErrorMessage should be nil")
	}

	// 失敗としてマーク
	errorMsg := "API rate limit exceeded"
	session.MarkAsFailed(errorMsg)

	// ステータスが"failed"に変更されているか
	if session.Status != "failed" {
		t.Errorf("Status = %q, want %q after MarkAsFailed", session.Status, "failed")
	}

	// エラーメッセージが設定されているか
	if session.ErrorMessage == nil {
		t.Fatal("ErrorMessage should be set after MarkAsFailed")
	}
	if *session.ErrorMessage != errorMsg {
		t.Errorf("ErrorMessage = %q, want %q", *session.ErrorMessage, errorMsg)
	}

	// CompletedAtが設定されているか
	if session.CompletedAt == nil {
		t.Error("CompletedAt should be set after MarkAsFailed")
	}
}

func TestChatSessionWithNilMessageID(t *testing.T) {
	userID := uuid.New()
	conversationID := uuid.New()
	aiAgentID := uuid.New()

	// MessageIDがnilの場合（ストリーミング中など）
	session := NewChatSession(
		userID,
		conversationID,
		aiAgentID,
		nil, // nil MessageID
		"openai",
		"gpt-4o",
		"assistant",
		0.7,
		1000,
		2000,
		3000,
		500,
		0,
	)

	if session == nil {
		t.Fatal("NewChatSession() returned nil")
	}

	if session.MessageID != nil {
		t.Error("MessageID should be nil when passed as nil")
	}
}
