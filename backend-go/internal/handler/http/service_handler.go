package http

import (
	"net/http"

	"backend-go/internal/domain/service"
	"backend-go/internal/handler/http/middleware"
	serviceUsecase "backend-go/internal/usecase/service"
	"backend-go/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ServiceHandler サービスハンドラー
type ServiceHandler struct {
	serviceUsecase *serviceUsecase.ServiceUsecase
	logger         logger.Logger
}

// NewServiceHandler サービスハンドラーを作成
func NewServiceHandler(serviceUsecase *serviceUsecase.ServiceUsecase) *ServiceHandler {
	return &ServiceHandler{
		serviceUsecase: serviceUsecase,
		logger:         logger.NewSimpleLogger(),
	}
}

// ListServices 全サービス一覧を取得（Pythonプロキシ）
// @Summary サービス一覧取得
// @Description Pythonから全サービスの一覧を取得
// @Tags Services
// @Accept json
// @Produce json
// @Success 200 {array} map[string]interface{}
// @Router /api/v1/services [get]
func (h *ServiceHandler) ListServices(c *gin.Context) {
	services, err := h.serviceUsecase.ListServices()
	if err != nil {
		h.logger.Error("Failed to list services", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, services)
}

// GetServiceTools サービスのツール一覧を取得（Pythonプロキシ）
// @Summary サービスツール一覧取得
// @Description 指定したサービスのツール一覧を取得
// @Tags Services
// @Accept json
// @Produce json
// @Param service_class path string true "サービスクラス名"
// @Success 200 {array} map[string]interface{}
// @Router /api/v1/services/{service_class}/tools [get]
func (h *ServiceHandler) GetServiceTools(c *gin.Context) {
	serviceClass := c.Param("service_class")

	tools, err := h.serviceUsecase.GetServiceTools(serviceClass)
	if err != nil {
		h.logger.Error("Failed to get service tools", "error", err, "service_class", serviceClass)
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tools)
}

// CreateServiceConfig サービス設定を作成
// @Summary サービス設定作成
// @Description ユーザーのサービス設定を作成
// @Tags Services
// @Accept json
// @Produce json
// @Param input body service.CreateServiceConfigInput true "サービス設定"
// @Success 201 {object} service.ServiceConfig
// @Router /api/v1/services/config [post]
func (h *ServiceHandler) CreateServiceConfig(c *gin.Context) {
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	var input service.CreateServiceConfigInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "入力が不正です", "details": err.Error()})
		return
	}

	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		h.logger.Error("Failed to parse user ID", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "無効なユーザーIDです"})
		return
	}

	config, err := h.serviceUsecase.CreateServiceConfig(userID, &input)
	if err != nil {
		h.logger.Error("Failed to create service config", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, config)
}

// GetUserServiceConfigs ユーザーのサービス設定一覧を取得
// @Summary サービス設定一覧取得
// @Description ユーザーのサービス設定一覧を取得
// @Tags Services
// @Accept json
// @Produce json
// @Success 200 {array} service.ServiceConfig
// @Router /api/v1/services/config [get]
func (h *ServiceHandler) GetUserServiceConfigs(c *gin.Context) {
	user, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	userID, err := uuid.Parse(string(user.ID))
	if err != nil {
		h.logger.Error("Failed to parse user ID", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "無効なユーザーIDです"})
		return
	}

	configs, err := h.serviceUsecase.GetUserServiceConfigs(userID)
	if err != nil {
		h.logger.Error("Failed to get user service configs", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, configs)
}

// GetServiceConfigByID サービス設定を取得
// @Summary サービス設定取得
// @Description 指定したIDのサービス設定を取得
// @Tags Services
// @Accept json
// @Produce json
// @Param id path string true "サービス設定ID"
// @Success 200 {object} service.ServiceConfig
// @Router /api/v1/services/config/{id} [get]
func (h *ServiceHandler) GetServiceConfigByID(c *gin.Context) {
	configID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なIDです"})
		return
	}

	config, err := h.serviceUsecase.GetServiceConfigByID(configID)
	if err != nil {
		h.logger.Error("Failed to get service config", "error", err, "config_id", configID)
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

// UpdateServiceConfig サービス設定を更新
// @Summary サービス設定更新
// @Description サービス設定を更新
// @Tags Services
// @Accept json
// @Produce json
// @Param id path string true "サービス設定ID"
// @Param input body service.UpdateServiceConfigInput true "更新内容"
// @Success 200 {object} service.ServiceConfig
// @Router /api/v1/services/config/{id} [put]
func (h *ServiceHandler) UpdateServiceConfig(c *gin.Context) {
	configID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なIDです"})
		return
	}

	var input service.UpdateServiceConfigInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "入力が不正です", "details": err.Error()})
		return
	}

	config, err := h.serviceUsecase.UpdateServiceConfig(configID, &input)
	if err != nil {
		h.logger.Error("Failed to update service config", "error", err, "config_id", configID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

// DeleteServiceConfig サービス設定を削除
// @Summary サービス設定削除
// @Description サービス設定を削除
// @Tags Services
// @Accept json
// @Produce json
// @Param id path string true "サービス設定ID"
// @Success 204
// @Router /api/v1/services/config/{id} [delete]
func (h *ServiceHandler) DeleteServiceConfig(c *gin.Context) {
	configID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なIDです"})
		return
	}

	if err := h.serviceUsecase.DeleteServiceConfig(configID); err != nil {
		h.logger.Error("Failed to delete service config", "error", err, "config_id", configID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// ValidateServiceAuth サービスの認証情報を検証
// @Summary サービス認証情報検証
// @Description サービスの認証情報が正しいか検証
// @Tags Services
// @Accept json
// @Produce json
// @Param input body service.ValidateServiceAuthInput true "検証情報"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/services/validate [post]
func (h *ServiceHandler) ValidateServiceAuth(c *gin.Context) {
	var input service.ValidateServiceAuthInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "入力が不正です", "details": err.Error()})
		return
	}

	if err := h.serviceUsecase.ValidateServiceAuth(input.ServiceClass, input.Auth); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"valid": false,
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"valid": true})
}
