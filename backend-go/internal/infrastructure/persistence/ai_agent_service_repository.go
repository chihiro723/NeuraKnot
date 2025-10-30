package persistence

import (
	"database/sql"
	"errors"
	"time"

	"backend-go/internal/domain/service"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type aiAgentServiceRepository struct {
	db *sql.DB
}

// NewAIAgentServiceRepository AI Agentサービスリポジトリを作成
func NewAIAgentServiceRepository(db *sql.DB) service.AIAgentServiceRepository {
	return &aiAgentServiceRepository{
		db: db,
	}
}

// Create AI Agentとサービスの紐付けを作成
func (r *aiAgentServiceRepository) Create(agentService *service.AIAgentService) error {
	agentService.ID = uuid.New()
	agentService.CreatedAt = time.Now()

	query := `
		INSERT INTO ai_agent_services (
			id, ai_agent_id, service_class, tool_selection_mode,
			selected_tools, enabled, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.db.Exec(
		query,
		agentService.ID, agentService.AIAgentID, agentService.ServiceClass,
		agentService.ToolSelectionMode, pq.Array(agentService.SelectedTools),
		agentService.Enabled, agentService.CreatedAt,
	)

	return err
}

// FindByAgentID AI Agent IDで紐付け一覧を取得
func (r *aiAgentServiceRepository) FindByAgentID(agentID uuid.UUID) ([]service.AIAgentService, error) {
	query := `
		SELECT id, ai_agent_id, service_class, tool_selection_mode,
		       selected_tools, enabled, created_at
		FROM ai_agent_services
		WHERE ai_agent_id = $1
		ORDER BY created_at ASC
	`

	rows, err := r.db.Query(query, agentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var agentServices []service.AIAgentService

	for rows.Next() {
		var as service.AIAgentService

		err := rows.Scan(
			&as.ID, &as.AIAgentID, &as.ServiceClass, &as.ToolSelectionMode,
			pq.Array(&as.SelectedTools), &as.Enabled, &as.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		agentServices = append(agentServices, as)
	}

	return agentServices, rows.Err()
}

// FindByAgentAndClass AI Agent IDとサービスクラスで紐付けを取得
func (r *aiAgentServiceRepository) FindByAgentAndClass(agentID uuid.UUID, serviceClass string) (*service.AIAgentService, error) {
	query := `
		SELECT id, ai_agent_id, service_class, tool_selection_mode,
		       selected_tools, enabled, created_at
		FROM ai_agent_services
		WHERE ai_agent_id = $1 AND service_class = $2
	`

	var as service.AIAgentService

	err := r.db.QueryRow(query, agentID, serviceClass).Scan(
		&as.ID, &as.AIAgentID, &as.ServiceClass, &as.ToolSelectionMode,
		pq.Array(&as.SelectedTools), &as.Enabled, &as.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("ai agent service not found")
	}
	if err != nil {
		return nil, err
	}

	return &as, nil
}

// Update AI Agentとサービスの紐付けを更新
func (r *aiAgentServiceRepository) Update(agentService *service.AIAgentService) error {
	query := `
		UPDATE ai_agent_services
		SET tool_selection_mode = $1, selected_tools = $2, enabled = $3
		WHERE id = $4
	`

	var err error

	result, err := r.db.Exec(
		query,
		agentService.ToolSelectionMode, pq.Array(agentService.SelectedTools),
		agentService.Enabled, agentService.ID,
	)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("ai agent service not found")
	}

	return nil
}

// Delete AI Agentとサービスの紐付けを削除
func (r *aiAgentServiceRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM ai_agent_services WHERE id = $1`

	var err error

	result, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("ai agent service not found")
	}

	return nil
}

// DeleteByAgentID AI Agent IDで紐付けを全て削除
func (r *aiAgentServiceRepository) DeleteByAgentID(agentID uuid.UUID) error {
	query := `DELETE FROM ai_agent_services WHERE ai_agent_id = $1`
	_, err := r.db.Exec(query, agentID)
	return err
}
