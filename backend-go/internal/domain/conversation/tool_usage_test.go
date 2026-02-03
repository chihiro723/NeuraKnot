package conversation

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

// ToolUsageエンティティの仕様
// ============================================
// 【目的】
// - AIが使用したツール（外部API、計算など）の履歴を記録
// - 1対1チャットとグループチャットの両方に対応
//
// 【必須項目】
// 1. MessageID (*uuid.UUID): メッセージID（1対1の場合）
// 2. GroupMessageID (*uuid.UUID): グループメッセージID（グループの場合）
// 3. ToolName (string): ツール名（例: "brave_search", "calculator"）
// 4. ToolCategory (string): ツールカテゴリ（例: "search", "calculation"）
// 5. InputData (json.RawMessage): ツールへの入力データ（JSON形式）
//
// 【オプション項目】
// - SessionID (*uuid.UUID): AI処理セッションID
// - OutputData (*string): ツールからの出力データ
// - Status (string): ステータス（"completed" or "failed"）
// - ErrorMessage (*string): エラーメッセージ（失敗時）
// - ExecutionTimeMs (*int): 実行時間（ミリ秒）
// - InsertPosition (*int): メッセージ内での挿入位置（文字数）
//
// 【作成方法】
// - NewToolUsage(): 1対1チャット用（MessageID設定）
// - NewGroupToolUsage(): グループチャット用（GroupMessageID設定）
//
// 【状態管理】
// - SetOutput(output): 出力データを設定
// - SetError(errorMsg): エラーを設定（Statusを"failed"に）
// - SetExecutionTime(ms): 実行時間を設定
// - SetInsertPosition(position): 挿入位置を設定
//
// 【使用箇所】
// - AIがツールを呼び出した際の記録
// - ツール使用統計の集計
// - デバッグ・エラー追跡
// - ユーザーへのツール使用状況表示
// ============================================

func TestNewToolUsage(t *testing.T) {
	messageID := uuid.New()
	inputData := json.RawMessage(`{"query": "weather in Tokyo"}`)

	toolUsage, err := NewToolUsage(messageID, "openweather", "weather", inputData)

	if err != nil {
		t.Fatalf("NewToolUsage() unexpected error: %v", err)
	}

	if toolUsage == nil {
		t.Fatal("NewToolUsage() returned nil")
	}

	// 入力値の確認
	if toolUsage.MessageID == nil || *toolUsage.MessageID != messageID {
		t.Errorf("MessageID = %v, want %v", toolUsage.MessageID, messageID)
	}
	if toolUsage.GroupMessageID != nil {
		t.Error("GroupMessageID should be nil for 1-on-1 chat")
	}
	if toolUsage.ToolName != "openweather" {
		t.Errorf("ToolName = %q, want %q", toolUsage.ToolName, "openweather")
	}
	if toolUsage.ToolCategory != "weather" {
		t.Errorf("ToolCategory = %q, want %q", toolUsage.ToolCategory, "weather")
	}
	if string(toolUsage.InputData) != string(inputData) {
		t.Errorf("InputData = %s, want %s", toolUsage.InputData, inputData)
	}

	// デフォルト値の確認
	if toolUsage.Status != "completed" {
		t.Errorf("Status = %q, want %q", toolUsage.Status, "completed")
	}
	if toolUsage.OutputData != nil {
		t.Error("OutputData should be nil initially")
	}
	if toolUsage.ErrorMessage != nil {
		t.Error("ErrorMessage should be nil initially")
	}
	if toolUsage.ExecutionTimeMs != nil {
		t.Error("ExecutionTimeMs should be nil initially")
	}
	if toolUsage.InsertPosition != nil {
		t.Error("InsertPosition should be nil initially")
	}
}

func TestNewGroupToolUsage(t *testing.T) {
	groupMessageID := uuid.New()
	inputData := json.RawMessage(`{"expression": "2 + 2"}`)

	toolUsage, err := NewGroupToolUsage(groupMessageID, "calculator", "calculation", inputData)

	if err != nil {
		t.Fatalf("NewGroupToolUsage() unexpected error: %v", err)
	}

	if toolUsage == nil {
		t.Fatal("NewGroupToolUsage() returned nil")
	}

	// 入力値の確認
	if toolUsage.MessageID != nil {
		t.Error("MessageID should be nil for group chat")
	}
	if toolUsage.GroupMessageID == nil || *toolUsage.GroupMessageID != groupMessageID {
		t.Errorf("GroupMessageID = %v, want %v", toolUsage.GroupMessageID, groupMessageID)
	}
	if toolUsage.ToolName != "calculator" {
		t.Errorf("ToolName = %q, want %q", toolUsage.ToolName, "calculator")
	}
	if toolUsage.ToolCategory != "calculation" {
		t.Errorf("ToolCategory = %q, want %q", toolUsage.ToolCategory, "calculation")
	}
	if string(toolUsage.InputData) != string(inputData) {
		t.Errorf("InputData = %s, want %s", toolUsage.InputData, inputData)
	}

	// デフォルト値の確認
	if toolUsage.Status != "completed" {
		t.Errorf("Status = %q, want %q", toolUsage.Status, "completed")
	}
}

func TestToolUsageSetOutput(t *testing.T) {
	messageID := uuid.New()
	inputData := json.RawMessage(`{"query": "test"}`)
	toolUsage, _ := NewToolUsage(messageID, "test_tool", "test", inputData)

	// 初期状態ではnil
	if toolUsage.OutputData != nil {
		t.Error("OutputData should be nil initially")
	}

	// 出力データを設定
	output := "Test output data"
	toolUsage.SetOutput(output)

	// 設定されたか確認
	if toolUsage.OutputData == nil {
		t.Fatal("OutputData should not be nil after SetOutput")
	}
	if *toolUsage.OutputData != output {
		t.Errorf("OutputData = %q, want %q", *toolUsage.OutputData, output)
	}
}

func TestToolUsageSetError(t *testing.T) {
	messageID := uuid.New()
	inputData := json.RawMessage(`{"query": "test"}`)
	toolUsage, _ := NewToolUsage(messageID, "test_tool", "test", inputData)

	// 初期状態
	if toolUsage.Status != "completed" {
		t.Errorf("Initial Status = %q, want %q", toolUsage.Status, "completed")
	}
	if toolUsage.ErrorMessage != nil {
		t.Error("ErrorMessage should be nil initially")
	}

	// エラーを設定
	errorMsg := "API timeout"
	toolUsage.SetError(errorMsg)

	// ステータスが"failed"に変更されているか
	if toolUsage.Status != "failed" {
		t.Errorf("Status = %q, want %q after SetError", toolUsage.Status, "failed")
	}

	// エラーメッセージが設定されているか
	if toolUsage.ErrorMessage == nil {
		t.Fatal("ErrorMessage should not be nil after SetError")
	}
	if *toolUsage.ErrorMessage != errorMsg {
		t.Errorf("ErrorMessage = %q, want %q", *toolUsage.ErrorMessage, errorMsg)
	}
}

func TestToolUsageSetExecutionTime(t *testing.T) {
	messageID := uuid.New()
	inputData := json.RawMessage(`{"query": "test"}`)
	toolUsage, _ := NewToolUsage(messageID, "test_tool", "test", inputData)

	// 初期状態ではnil
	if toolUsage.ExecutionTimeMs != nil {
		t.Error("ExecutionTimeMs should be nil initially")
	}

	// 実行時間を設定
	executionTime := 250
	toolUsage.SetExecutionTime(executionTime)

	// 設定されたか確認
	if toolUsage.ExecutionTimeMs == nil {
		t.Fatal("ExecutionTimeMs should not be nil after SetExecutionTime")
	}
	if *toolUsage.ExecutionTimeMs != executionTime {
		t.Errorf("ExecutionTimeMs = %d, want %d", *toolUsage.ExecutionTimeMs, executionTime)
	}
}

func TestToolUsageSetInsertPosition(t *testing.T) {
	messageID := uuid.New()
	inputData := json.RawMessage(`{"query": "test"}`)
	toolUsage, _ := NewToolUsage(messageID, "test_tool", "test", inputData)

	// 初期状態ではnil
	if toolUsage.InsertPosition != nil {
		t.Error("InsertPosition should be nil initially")
	}

	// 挿入位置を設定
	position := 150
	toolUsage.SetInsertPosition(position)

	// 設定されたか確認
	if toolUsage.InsertPosition == nil {
		t.Fatal("InsertPosition should not be nil after SetInsertPosition")
	}
	if *toolUsage.InsertPosition != position {
		t.Errorf("InsertPosition = %d, want %d", *toolUsage.InsertPosition, position)
	}
}

func TestToolUsageCompleteWorkflow(t *testing.T) {
	messageID := uuid.New()
	inputData := json.RawMessage(`{"city": "Tokyo"}`)

	// ツール使用履歴を作成
	toolUsage, _ := NewToolUsage(messageID, "weather_api", "weather", inputData)

	// 出力データを設定
	toolUsage.SetOutput(`{"temperature": 25, "condition": "sunny"}`)

	// 実行時間を設定
	toolUsage.SetExecutionTime(180)

	// 挿入位置を設定
	toolUsage.SetInsertPosition(50)

	// 全ての値が設定されているか確認
	if toolUsage.OutputData == nil {
		t.Error("OutputData should be set")
	}
	if toolUsage.ExecutionTimeMs == nil {
		t.Error("ExecutionTimeMs should be set")
	}
	if toolUsage.InsertPosition == nil {
		t.Error("InsertPosition should be set")
	}
	if toolUsage.Status != "completed" {
		t.Errorf("Status should be %q", "completed")
	}
	if toolUsage.ErrorMessage != nil {
		t.Error("ErrorMessage should be nil for successful execution")
	}
}

func TestToolUsageErrorWorkflow(t *testing.T) {
	messageID := uuid.New()
	inputData := json.RawMessage(`{"query": "invalid"}`)

	// ツール使用履歴を作成
	toolUsage, _ := NewToolUsage(messageID, "search_api", "search", inputData)

	// エラーを設定
	toolUsage.SetError("Invalid API key")

	// 実行時間を設定（エラーでも記録）
	toolUsage.SetExecutionTime(50)

	// ステータスが"failed"になっているか
	if toolUsage.Status != "failed" {
		t.Errorf("Status = %q, want %q", toolUsage.Status, "failed")
	}

	// エラーメッセージが設定されているか
	if toolUsage.ErrorMessage == nil {
		t.Error("ErrorMessage should be set for failed execution")
	}

	// 出力データは設定されていないはず
	if toolUsage.OutputData != nil {
		t.Error("OutputData should be nil for failed execution")
	}
}
