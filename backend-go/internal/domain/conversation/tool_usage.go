package conversation

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ToolUsage はツール使用履歴
type ToolUsage struct {
	ID              uuid.UUID
	SessionID       *uuid.UUID // NULLable
	MessageID       *uuid.UUID // NULLable
	ToolName        string
	ToolCategory    string
	InputData       json.RawMessage
	OutputData      *string
	Status          string
	ErrorMessage    *string
	ExecutionTimeMs *int
	ExecutedAt      time.Time
}

// NewToolUsage はツール使用履歴を作成
func NewToolUsage(
	messageID uuid.UUID,
	toolName string,
	toolCategory string,
	inputData json.RawMessage,
) (*ToolUsage, error) {
	return &ToolUsage{
		ID:           uuid.New(),
		MessageID:    &messageID,
		ToolName:     toolName,
		ToolCategory: toolCategory,
		InputData:    inputData,
		Status:       "completed",
		ExecutedAt:   time.Now(),
	}, nil
}

// SetOutput は出力データを設定
func (t *ToolUsage) SetOutput(output string) {
	t.OutputData = &output
}

// SetError はエラーを設定
func (t *ToolUsage) SetError(errMsg string) {
	t.Status = "failed"
	t.ErrorMessage = &errMsg
}

// SetExecutionTime は実行時間を設定
func (t *ToolUsage) SetExecutionTime(ms int) {
	t.ExecutionTimeMs = &ms
}

// ToolUsageRepository はツール使用履歴のリポジトリインターフェース
type ToolUsageRepository interface {
	// Save はツール使用履歴を保存
	Save(toolUsage *ToolUsage) error

	// FindByMessageID はメッセージIDでツール使用履歴を取得
	FindByMessageID(messageID uuid.UUID) ([]*ToolUsage, error)

	// FindBySessionID はセッションIDでツール使用履歴を取得
	FindBySessionID(sessionID uuid.UUID) ([]*ToolUsage, error)
}
