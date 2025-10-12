package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"backend-go/internal/domain/mcp"
	mcpUsecase "backend-go/internal/usecase/mcp"
)

// MCPHandler はMCP関連のHTTPハンドラー
type MCPHandler struct {
	serverUsecase *mcpUsecase.MCPServerUsecase
	toolUsecase   *mcpUsecase.MCPToolUsecase
}

// NewMCPHandler はMCPHandlerを作成
func NewMCPHandler(
	serverUsecase *mcpUsecase.MCPServerUsecase,
	toolUsecase *mcpUsecase.MCPToolUsecase,
) *MCPHandler {
	return &MCPHandler{
		serverUsecase: serverUsecase,
		toolUsecase:   toolUsecase,
	}
}

// RegisterServer godoc
// @Summary MCPサーバーを登録
// @Description ユーザーが外部MCPサーバーを登録します。APIキーは暗号化されてDBに保存されます。
// @Tags MCP
// @Accept json
// @Produce json
// @Param input body mcp.RegisterMCPServerInput true "登録情報"
// @Success 201 {object} mcp.MCPServer
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/mcp-servers [post]
// @Security BearerAuth
func (h *MCPHandler) RegisterServer(c *gin.Context) {
	// 認証ミドルウェアからユーザーIDを取得
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	// リクエストボディをパース
	var input mcp.RegisterMCPServerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid request body"})
		return
	}

	// サーバー登録
	server, err := h.serverUsecase.RegisterServer(c.Request.Context(), userID, input)
	if err != nil {
		if err == mcp.ErrServerAlreadyExists {
			c.JSON(http.StatusConflict, ErrorResponse{Error: "server with this name already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to register server"})
		return
	}

	c.JSON(http.StatusCreated, server)
}

// ListServers godoc
// @Summary MCPサーバー一覧を取得
// @Description ユーザーがアクセス可能なMCPサーバー一覧を取得します（システム共通 + ユーザー登録）
// @Tags MCP
// @Produce json
// @Success 200 {array} mcp.MCPServer
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/mcp-servers [get]
// @Security BearerAuth
func (h *MCPHandler) ListServers(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	servers, err := h.serverUsecase.GetServers(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to fetch servers"})
		return
	}

	// APIキーは含まれていないので安全にレスポンス
	c.JSON(http.StatusOK, servers)
}

// GetServer godoc
// @Summary MCPサーバーを取得
// @Description 指定されたIDのMCPサーバーを取得します
// @Tags MCP
// @Produce json
// @Param id path string true "Server ID" format(uuid)
// @Success 200 {object} mcp.MCPServer
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/mcp-servers/{id} [get]
// @Security BearerAuth
func (h *MCPHandler) GetServer(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid server id"})
		return
	}

	server, err := h.serverUsecase.GetServerByID(c.Request.Context(), serverID, userID)
	if err != nil {
		if err == mcp.ErrServerNotFound {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "server not found"})
			return
		}
		if err == mcp.ErrUnauthorized {
			c.JSON(http.StatusForbidden, ErrorResponse{Error: "access denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to fetch server"})
		return
	}

	c.JSON(http.StatusOK, server)
}

// UpdateServer godoc
// @Summary MCPサーバーを更新
// @Description MCPサーバーの情報を更新します
// @Tags MCP
// @Accept json
// @Produce json
// @Param id path string true "Server ID" format(uuid)
// @Param input body mcp.UpdateMCPServerInput true "更新情報"
// @Success 200 {object} mcp.MCPServer
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/mcp-servers/{id} [put]
// @Security BearerAuth
func (h *MCPHandler) UpdateServer(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid server id"})
		return
	}

	var input mcp.UpdateMCPServerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid request body"})
		return
	}

	server, err := h.serverUsecase.UpdateServer(c.Request.Context(), serverID, userID, input)
	if err != nil {
		if err == mcp.ErrServerNotFound {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "server not found"})
			return
		}
		if err == mcp.ErrUnauthorized {
			c.JSON(http.StatusForbidden, ErrorResponse{Error: "access denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to update server"})
		return
	}

	c.JSON(http.StatusOK, server)
}

// DeleteServer godoc
// @Summary MCPサーバーを削除
// @Description MCPサーバーを削除します
// @Tags MCP
// @Produce json
// @Param id path string true "Server ID" format(uuid)
// @Success 204 "No Content"
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/mcp-servers/{id} [delete]
// @Security BearerAuth
func (h *MCPHandler) DeleteServer(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid server id"})
		return
	}

	err = h.serverUsecase.DeleteServer(c.Request.Context(), serverID, userID)
	if err != nil {
		if err == mcp.ErrServerNotFound {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "server not found"})
			return
		}
		if err == mcp.ErrUnauthorized {
			c.JSON(http.StatusForbidden, ErrorResponse{Error: "access denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to delete server"})
		return
	}

	c.Status(http.StatusNoContent)
}

// SyncToolCatalog godoc
// @Summary ツールカタログを同期
// @Description MCPサーバーからツールカタログを取得して同期します
// @Tags MCP
// @Produce json
// @Param id path string true "Server ID" format(uuid)
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/mcp-servers/{id}/sync [post]
// @Security BearerAuth
func (h *MCPHandler) SyncToolCatalog(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid server id"})
		return
	}

	// アクセス権限のチェック
	_, err = h.serverUsecase.GetServerByID(c.Request.Context(), serverID, userID)
	if err != nil {
		if err == mcp.ErrServerNotFound {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "server not found"})
			return
		}
		if err == mcp.ErrUnauthorized {
			c.JSON(http.StatusForbidden, ErrorResponse{Error: "access denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to fetch server"})
		return
	}

	// ツールカタログを同期
	err = h.serverUsecase.SyncToolCatalog(c.Request.Context(), serverID, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to sync tool catalog"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "tool catalog synced successfully"})
}

// ListTools godoc
// @Summary サーバーのツール一覧を取得
// @Description 指定されたMCPサーバーのツール一覧を取得します
// @Tags MCP
// @Produce json
// @Param id path string true "Server ID" format(uuid)
// @Success 200 {array} mcp.MCPTool
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/mcp-servers/{id}/tools [get]
// @Security BearerAuth
func (h *MCPHandler) ListTools(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid server id"})
		return
	}

	tools, err := h.toolUsecase.ListToolsByServer(c.Request.Context(), serverID, userID)
	if err != nil {
		if err == mcp.ErrServerNotFound {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "server not found"})
			return
		}
		if err == mcp.ErrUnauthorized {
			c.JSON(http.StatusForbidden, ErrorResponse{Error: "access denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to fetch tools"})
		return
	}

	c.JSON(http.StatusOK, tools)
}

// SearchTools godoc
// @Summary ツールを検索
// @Description カテゴリ、タグ、キーワードでツールを検索します
// @Tags MCP
// @Produce json
// @Param category query string false "Category"
// @Param tags query []string false "Tags (comma-separated)"
// @Param q query string false "Search query"
// @Success 200 {array} mcp.MCPTool
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/mcp-tools/search [get]
// @Security BearerAuth
func (h *MCPHandler) SearchTools(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	var category *string
	if c.Query("category") != "" {
		cat := c.Query("category")
		category = &cat
	}

	var tags []string
	if c.Query("tags") != "" {
		tags = c.QueryArray("tags")
	}

	var searchQuery *string
	if c.Query("q") != "" {
		q := c.Query("q")
		searchQuery = &q
	}

	tools, err := h.toolUsecase.SearchTools(c.Request.Context(), userID, category, tags, searchQuery)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to search tools"})
		return
	}

	c.JSON(http.StatusOK, tools)
}

// getUserIDFromContext はコンテキストからユーザーIDを取得
func getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, mcp.ErrUnauthorized
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		return uuid.Nil, err
	}

	return userID, nil
}

// ErrorResponse はエラーレスポンスの構造
type ErrorResponse struct {
	Error string `json:"error"`
}
