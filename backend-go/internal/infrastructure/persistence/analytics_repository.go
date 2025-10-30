package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"backend-go/internal/domain/analytics"

	"github.com/google/uuid"
)

// AnalyticsRepository 統計データ取得のリポジトリ実装
type AnalyticsRepository struct {
	db *sql.DB
}

// NewAnalyticsRepository 統計データリポジトリを作成
func NewAnalyticsRepository(db *sql.DB) analytics.Repository {
	return &AnalyticsRepository{db: db}
}

// GetTokenStats トークン使用量とコスト統計を取得
func (r *AnalyticsRepository) GetTokenStats(ctx context.Context, userID uuid.UUID, timeRange analytics.TimeRange) (*analytics.TokenStats, error) {
	startTime := timeRange.GetStartTime()

	// 総トークン数を取得
	var totalTokens, promptTokens, completionTokens sql.NullInt64
	totalQuery := `
		SELECT 
			COALESCE(SUM(tokens_total), 0) as total,
			COALESCE(SUM(tokens_prompt), 0) as prompt,
			COALESCE(SUM(tokens_completion), 0) as completion
		FROM ai_chat_sessions
		WHERE user_id = $1 AND status = 'completed'
	`
	args := []interface{}{userID}
	if startTime != nil {
		totalQuery += ` AND started_at >= $2`
		args = append(args, *startTime)
	}

	err := r.db.QueryRowContext(ctx, totalQuery, args...).Scan(&totalTokens, &promptTokens, &completionTokens)
	if err != nil {
		return nil, fmt.Errorf("failed to get total tokens: %w", err)
	}

	// プロバイダー別の統計を取得
	providerQuery := `
		SELECT 
			provider,
			COALESCE(SUM(tokens_total), 0) as total
		FROM ai_chat_sessions
		WHERE user_id = $1 AND status = 'completed'
	`
	if startTime != nil {
		providerQuery += ` AND started_at >= $2`
	}
	providerQuery += ` GROUP BY provider ORDER BY total DESC`

	providerRows, err := r.db.QueryContext(ctx, providerQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get provider stats: %w", err)
	}
	defer providerRows.Close()

	byProvider := []*analytics.TokensByProvider{}
	for providerRows.Next() {
		var provider string
		var total int64
		if err := providerRows.Scan(&provider, &total); err != nil {
			return nil, fmt.Errorf("failed to scan provider stats: %w", err)
		}

		// プロバイダー別のコストを計算（各モデルのコストを合計）
		costQuery := `
			SELECT 
				model,
				COALESCE(SUM(tokens_prompt), 0) as prompt,
				COALESCE(SUM(tokens_completion), 0) as completion
			FROM ai_chat_sessions
			WHERE user_id = $1 AND provider = $2 AND status = 'completed'
		`
		costArgs := []interface{}{userID, provider}
		if startTime != nil {
			costQuery += ` AND started_at >= $3`
			costArgs = append(costArgs, *startTime)
		}
		costQuery += ` GROUP BY model`

		costRows, err := r.db.QueryContext(ctx, costQuery, costArgs...)
		if err != nil {
			return nil, fmt.Errorf("failed to get model costs: %w", err)
		}

		var providerCost float64
		for costRows.Next() {
			var model string
			var prompt, completion int64
			if err := costRows.Scan(&model, &prompt, &completion); err != nil {
				costRows.Close()
				return nil, fmt.Errorf("failed to scan model costs: %w", err)
			}
			providerCost += analytics.CalculateCost(provider, model, prompt, completion)
		}
		costRows.Close()

		byProvider = append(byProvider, &analytics.TokensByProvider{
			Provider:         provider,
			TotalTokens:      total,
			EstimatedCostUSD: providerCost,
		})
	}

	// モデル別の統計を取得
	modelQuery := `
		SELECT 
			provider,
			model,
			COALESCE(SUM(tokens_total), 0) as total,
			COALESCE(SUM(tokens_prompt), 0) as prompt,
			COALESCE(SUM(tokens_completion), 0) as completion
		FROM ai_chat_sessions
		WHERE user_id = $1 AND status = 'completed'
	`
	if startTime != nil {
		modelQuery += ` AND started_at >= $2`
	}
	modelQuery += ` GROUP BY provider, model ORDER BY total DESC`

	modelRows, err := r.db.QueryContext(ctx, modelQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get model stats: %w", err)
	}
	defer modelRows.Close()

	byModel := []*analytics.TokensByModel{}
	var totalCostUSD float64
	for modelRows.Next() {
		var provider, model string
		var total, prompt, completion int64
		if err := modelRows.Scan(&provider, &model, &total, &prompt, &completion); err != nil {
			return nil, fmt.Errorf("failed to scan model stats: %w", err)
		}

		cost := analytics.CalculateCost(provider, model, prompt, completion)
		totalCostUSD += cost

		byModel = append(byModel, &analytics.TokensByModel{
			Provider:         provider,
			Model:            model,
			TotalTokens:      total,
			PromptTokens:     prompt,
			CompletionTokens: completion,
			EstimatedCostUSD: cost,
		})
	}

	return &analytics.TokenStats{
		TotalTokens:      totalTokens.Int64,
		PromptTokens:     promptTokens.Int64,
		CompletionTokens: completionTokens.Int64,
		EstimatedCostUSD: totalCostUSD,
		EstimatedCostJPY: analytics.ConvertUSDToJPY(totalCostUSD),
		ByProvider:       byProvider,
		ByModel:          byModel,
	}, nil
}

// GetActivityStats 活動量統計を取得
func (r *AnalyticsRepository) GetActivityStats(ctx context.Context, userID uuid.UUID, timeRange analytics.TimeRange) (*analytics.ActivityStats, error) {
	startTime := timeRange.GetStartTime()

	// 総メッセージ数を取得
	var totalMessages, userMessages, aiMessages sql.NullInt64
	messageQuery := `
		SELECT 
			COUNT(*) as total,
			COALESCE(SUM(CASE WHEN sender_type = 'user' THEN 1 ELSE 0 END), 0) as user_msgs,
			COALESCE(SUM(CASE WHEN sender_type = 'ai' THEN 1 ELSE 0 END), 0) as ai_msgs
		FROM messages m
		JOIN conversations c ON m.conversation_id = c.id
		WHERE c.user_id = $1
	`
	args := []interface{}{userID}
	if startTime != nil {
		messageQuery += ` AND m.created_at >= $2`
		args = append(args, *startTime)
	}

	err := r.db.QueryRowContext(ctx, messageQuery, args...).Scan(&totalMessages, &userMessages, &aiMessages)
	if err != nil {
		return nil, fmt.Errorf("failed to get message stats: %w", err)
	}

	// 会話数を取得
	var totalConversations, activeConversations sql.NullInt64
	convQuery := `
		SELECT 
			COUNT(*) as total,
			COALESCE(SUM(CASE WHEN message_count > 0 THEN 1 ELSE 0 END), 0) as active
		FROM conversations
		WHERE user_id = $1
	`
	convArgs := []interface{}{userID}
	if startTime != nil {
		convQuery += ` AND created_at >= $2`
		convArgs = append(convArgs, *startTime)
	}

	err = r.db.QueryRowContext(ctx, convQuery, convArgs...).Scan(&totalConversations, &activeConversations)
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation stats: %w", err)
	}

	// 日別の活動量を取得
	dailyQuery := `
		SELECT 
			DATE(m.created_at) as date,
			COUNT(*) as total,
			COALESCE(SUM(CASE WHEN m.sender_type = 'user' THEN 1 ELSE 0 END), 0) as user_msgs,
			COALESCE(SUM(CASE WHEN m.sender_type = 'ai' THEN 1 ELSE 0 END), 0) as ai_msgs
		FROM messages m
		JOIN conversations c ON m.conversation_id = c.id
		WHERE c.user_id = $1
	`
	if startTime != nil {
		dailyQuery += ` AND m.created_at >= $2`
	}
	dailyQuery += ` GROUP BY DATE(m.created_at) ORDER BY date DESC LIMIT 30`

	dailyRows, err := r.db.QueryContext(ctx, dailyQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get daily activity: %w", err)
	}
	defer dailyRows.Close()

	dailyActivity := []*analytics.DailyActivityPoint{}
	for dailyRows.Next() {
		var date time.Time
		var total, userMsgs, aiMsgs int64
		if err := dailyRows.Scan(&date, &total, &userMsgs, &aiMsgs); err != nil {
			return nil, fmt.Errorf("failed to scan daily activity: %w", err)
		}

		dailyActivity = append(dailyActivity, &analytics.DailyActivityPoint{
			Date:         date.Format("2006-01-02"),
			MessageCount: total,
			UserMessages: userMsgs,
			AIMessages:   aiMsgs,
		})
	}

	// 平均応答時間を取得
	var avgResponseTime sql.NullFloat64
	responseQuery := `
		SELECT COALESCE(AVG(processing_time_ms), 0)
		FROM ai_chat_sessions
		WHERE user_id = $1 AND status = 'completed'
	`
	responseArgs := []interface{}{userID}
	if startTime != nil {
		responseQuery += ` AND started_at >= $2`
		responseArgs = append(responseArgs, *startTime)
	}

	err = r.db.QueryRowContext(ctx, responseQuery, responseArgs...).Scan(&avgResponseTime)
	if err != nil {
		return nil, fmt.Errorf("failed to get average response time: %w", err)
	}

	return &analytics.ActivityStats{
		TotalMessages:       totalMessages.Int64,
		UserMessages:        userMessages.Int64,
		AIMessages:          aiMessages.Int64,
		TotalConversations:  totalConversations.Int64,
		ActiveConversations: activeConversations.Int64,
		DailyActivity:       dailyActivity,
		AverageResponseTime: avgResponseTime.Float64,
	}, nil
}

// GetAgentPerformanceStats エージェント別パフォーマンスを取得
func (r *AnalyticsRepository) GetAgentPerformanceStats(ctx context.Context, userID uuid.UUID, timeRange analytics.TimeRange) ([]*analytics.AgentPerformance, error) {
	startTime := timeRange.GetStartTime()

	query := `
		SELECT 
			a.id,
			a.name,
			COALESCE(COUNT(DISTINCT s.id), 0) as message_count,
			COALESCE(SUM(s.tokens_total), 0) as total_tokens,
			COALESCE(AVG(s.processing_time_ms), 0) as avg_response_time,
			COALESCE(SUM(s.tools_used), 0) as tools_used
		FROM ai_agents a
		LEFT JOIN ai_chat_sessions s ON a.id = s.ai_agent_id AND s.status = 'completed'
		WHERE a.user_id = $1 AND a.is_active = true
	`
	args := []interface{}{userID}
	if startTime != nil {
		query += ` AND s.started_at >= $2`
		args = append(args, *startTime)
	}
	query += ` GROUP BY a.id, a.name ORDER BY message_count DESC LIMIT 10`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get agent performance: %w", err)
	}
	defer rows.Close()

	performances := []*analytics.AgentPerformance{}
	for rows.Next() {
		var agentID uuid.UUID
		var agentName string
		var messageCount, totalTokens, toolsUsed int64
		var avgResponseTime float64

		if err := rows.Scan(&agentID, &agentName, &messageCount, &totalTokens, &avgResponseTime, &toolsUsed); err != nil {
			return nil, fmt.Errorf("failed to scan agent performance: %w", err)
		}

		performances = append(performances, &analytics.AgentPerformance{
			AgentID:             agentID,
			AgentName:           agentName,
			MessageCount:        messageCount,
			TotalTokens:         totalTokens,
			AverageResponseTime: avgResponseTime,
			ToolsUsed:           toolsUsed,
		})
	}

	return performances, nil
}

// GetToolUsageStats ツール使用統計を取得
func (r *AnalyticsRepository) GetToolUsageStats(ctx context.Context, userID uuid.UUID, timeRange analytics.TimeRange) (*analytics.ToolUsageStats, error) {
	startTime := timeRange.GetStartTime()

	// 総ツール使用回数を取得
	var totalCalls, successfulCalls, failedCalls sql.NullInt64
	totalQuery := `
		SELECT 
			COUNT(*) as total,
			COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0) as successful,
			COALESCE(SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END), 0) as failed
		FROM ai_tool_usage t
		LEFT JOIN ai_chat_sessions s ON t.session_id = s.id
		WHERE (s.user_id = $1 OR t.session_id IS NULL)
	`
	args := []interface{}{userID}
	if startTime != nil {
		totalQuery += ` AND t.executed_at >= $2`
		args = append(args, *startTime)
	}

	err := r.db.QueryRowContext(ctx, totalQuery, args...).Scan(&totalCalls, &successfulCalls, &failedCalls)
	if err != nil {
		return nil, fmt.Errorf("failed to get tool usage stats: %w", err)
	}

	successRate := 0.0
	if totalCalls.Int64 > 0 {
		successRate = float64(successfulCalls.Int64) / float64(totalCalls.Int64) * 100.0
	}

	// カテゴリ別の統計を取得
	categoryQuery := `
		SELECT 
			tool_category,
			COUNT(*) as total,
			COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0) as successful
		FROM ai_tool_usage t
		LEFT JOIN ai_chat_sessions s ON t.session_id = s.id
		WHERE (s.user_id = $1 OR t.session_id IS NULL)
	`
	if startTime != nil {
		categoryQuery += ` AND t.executed_at >= $2`
	}
	categoryQuery += ` GROUP BY tool_category ORDER BY total DESC`

	categoryRows, err := r.db.QueryContext(ctx, categoryQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get category stats: %w", err)
	}
	defer categoryRows.Close()

	byCategory := []*analytics.ToolsByCategory{}
	for categoryRows.Next() {
		var category string
		var total, successful int64
		if err := categoryRows.Scan(&category, &total, &successful); err != nil {
			return nil, fmt.Errorf("failed to scan category stats: %w", err)
		}

		categorySuccessRate := 0.0
		if total > 0 {
			categorySuccessRate = float64(successful) / float64(total) * 100.0
		}

		byCategory = append(byCategory, &analytics.ToolsByCategory{
			Category:    category,
			CallCount:   total,
			SuccessRate: categorySuccessRate,
		})
	}

	// ツール別の統計を取得
	toolQuery := `
		SELECT 
			tool_name,
			tool_category,
			COUNT(*) as total,
			COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0) as successful,
			COALESCE(SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END), 0) as failed,
			COALESCE(AVG(execution_time_ms), 0) as avg_execution_time
		FROM ai_tool_usage t
		LEFT JOIN ai_chat_sessions s ON t.session_id = s.id
		WHERE (s.user_id = $1 OR t.session_id IS NULL)
	`
	if startTime != nil {
		toolQuery += ` AND t.executed_at >= $2`
	}
	toolQuery += ` GROUP BY tool_name, tool_category ORDER BY total DESC LIMIT 20`

	toolRows, err := r.db.QueryContext(ctx, toolQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get tool stats: %w", err)
	}
	defer toolRows.Close()

	byTool := []*analytics.ToolStats{}
	for toolRows.Next() {
		var toolName, category string
		var total, successful, failed int64
		var avgExecutionTime float64
		if err := toolRows.Scan(&toolName, &category, &total, &successful, &failed, &avgExecutionTime); err != nil {
			return nil, fmt.Errorf("failed to scan tool stats: %w", err)
		}

		toolSuccessRate := 0.0
		if total > 0 {
			toolSuccessRate = float64(successful) / float64(total) * 100.0
		}

		byTool = append(byTool, &analytics.ToolStats{
			ToolName:             toolName,
			Category:             category,
			CallCount:            total,
			SuccessCount:         successful,
			FailureCount:         failed,
			SuccessRate:          toolSuccessRate,
			AverageExecutionTime: avgExecutionTime,
		})
	}

	return &analytics.ToolUsageStats{
		TotalToolCalls:  totalCalls.Int64,
		SuccessfulCalls: successfulCalls.Int64,
		FailedCalls:     failedCalls.Int64,
		SuccessRate:     successRate,
		ByCategory:      byCategory,
		ByTool:          byTool,
	}, nil
}

// GetServiceStats サービス連携統計を取得
func (r *AnalyticsRepository) GetServiceStats(ctx context.Context, userID uuid.UUID) (*analytics.ServiceStats, error) {
	// 総サービス数を取得
	var totalServices, enabledServices, disabledServices sql.NullInt64
	totalQuery := `
		SELECT 
			COUNT(*) as total,
			COALESCE(SUM(CASE WHEN is_enabled = true THEN 1 ELSE 0 END), 0) as enabled,
			COALESCE(SUM(CASE WHEN is_enabled = false THEN 1 ELSE 0 END), 0) as disabled
		FROM user_service_configs
		WHERE user_id = $1
	`

	err := r.db.QueryRowContext(ctx, totalQuery, userID).Scan(&totalServices, &enabledServices, &disabledServices)
	if err != nil {
		return nil, fmt.Errorf("failed to get service stats: %w", err)
	}

	// サービス別の統計を取得
	serviceQuery := `
		SELECT 
			usc.service_class,
			usc.is_enabled,
			COALESCE(COUNT(DISTINCT aas.ai_agent_id), 0) as agent_count
		FROM user_service_configs usc
		LEFT JOIN ai_agent_services aas ON usc.service_class = aas.service_class
		LEFT JOIN ai_agents a ON aas.ai_agent_id = a.id AND a.user_id = $1 AND a.is_active = true
		WHERE usc.user_id = $1
		GROUP BY usc.service_class, usc.is_enabled
		ORDER BY agent_count DESC
	`

	rows, err := r.db.QueryContext(ctx, serviceQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get service usage stats: %w", err)
	}
	defer rows.Close()

	byService := []*analytics.ServiceUsageStats{}
	for rows.Next() {
		var serviceClass string
		var isEnabled bool
		var agentCount int64
		if err := rows.Scan(&serviceClass, &isEnabled, &agentCount); err != nil {
			return nil, fmt.Errorf("failed to scan service usage stats: %w", err)
		}

		byService = append(byService, &analytics.ServiceUsageStats{
			ServiceClass: serviceClass,
			IsEnabled:    isEnabled,
			AgentCount:   agentCount,
		})
	}

	return &analytics.ServiceStats{
		TotalServices:    totalServices.Int64,
		EnabledServices:  enabledServices.Int64,
		DisabledServices: disabledServices.Int64,
		ByService:        byService,
	}, nil
}
