package mcp

import "fmt"

// ドメインエラー
var (
	ErrServerNotFound      = fmt.Errorf("mcp server not found")
	ErrToolNotFound        = fmt.Errorf("mcp tool not found")
	ErrUnauthorized        = fmt.Errorf("unauthorized to access this server")
	ErrServerAlreadyExists = fmt.Errorf("mcp server with this name already exists")
	ErrInvalidServerType   = fmt.Errorf("invalid server type")
)

// ErrInvalidInput は不正な入力エラーを返す
func ErrInvalidInput(message string) error {
	return fmt.Errorf("invalid input: %s", message)
}
