package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"github.com/yourusername/bridgespeak/backend-go/internal/crypto"
	"github.com/yourusername/bridgespeak/backend-go/internal/infrastructure/config"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run cmd/decrypt-key/main.go <server_id>")
		fmt.Println()
		fmt.Println("Description:")
		fmt.Println("  This tool decrypts and displays an API key for debugging purposes.")
		fmt.Println("  ⚠️  Use with caution! Only use in secure environments.")
		fmt.Println()
		fmt.Println("Example:")
		fmt.Println("  go run cmd/decrypt-key/main.go 123e4567-e89b-12d3-a456-426614174000")
		os.Exit(1)
	}

	serverID, err := uuid.Parse(os.Args[1])
	if err != nil {
		fmt.Printf("❌ Invalid server ID: %v\n", err)
		os.Exit(1)
	}

	// .envファイルを読み込み（開発環境）
	_ = godotenv.Load()

	// 設定読み込み
	cfg := config.Load()

	if cfg.Security.EncryptionMasterKey == "" {
		fmt.Println("❌ ENCRYPTION_MASTER_KEY is not set")
		fmt.Println("Please set it in .env file or environment variable")
		os.Exit(1)
	}

	// 暗号化サービス初期化
	encService, err := crypto.NewEncryptionService(cfg.Security.EncryptionMasterKey)
	if err != nil {
		fmt.Printf("❌ Failed to create encryption service: %v\n", err)
		os.Exit(1)
	}

	// データベース接続文字列を構築
	dbURL := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
		cfg.Database.SSLMode,
	)

	// DB接続
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		fmt.Printf("❌ Failed to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	// 接続テスト
	if err := db.Ping(); err != nil {
		fmt.Printf("❌ Failed to ping database: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("🔍 Fetching encrypted API key from database...")

	// 暗号化されたキーを取得
	var encryptedKey []byte
	var nonce []byte
	var serverName string
	var baseURL string

	query := `
		SELECT name, base_url, encrypted_api_key, key_nonce
		FROM mcp_servers
		WHERE id = $1
	`

	err = db.QueryRowContext(context.Background(), query, serverID).Scan(
		&serverName, &baseURL, &encryptedKey, &nonce,
	)

	if err == sql.ErrNoRows {
		fmt.Printf("❌ MCP server not found with ID: %s\n", serverID)
		os.Exit(1)
	}

	if err != nil {
		fmt.Printf("❌ Failed to get encrypted key: %v\n", err)
		os.Exit(1)
	}

	if len(encryptedKey) == 0 || len(nonce) == 0 {
		fmt.Println("❌ No API key is set for this server")
		os.Exit(1)
	}

	fmt.Println("✅ Found encrypted API key")
	fmt.Println()
	fmt.Println("Server Information:")
	fmt.Println("═══════════════════════════════════════")
	fmt.Printf("ID:       %s\n", serverID)
	fmt.Printf("Name:     %s\n", serverName)
	fmt.Printf("Base URL: %s\n", baseURL)
	fmt.Println()

	// 復号化
	fmt.Println("🔓 Decrypting API key...")
	apiKey, err := encService.Decrypt(encryptedKey, nonce)
	if err != nil {
		fmt.Printf("❌ Failed to decrypt: %v\n", err)
		fmt.Println()
		fmt.Println("Possible causes:")
		fmt.Println("  - Wrong ENCRYPTION_MASTER_KEY")
		fmt.Println("  - Corrupted data in database")
		fmt.Println("  - Key was encrypted with different master key")
		os.Exit(1)
	}

	fmt.Println("✅ Successfully decrypted")
	fmt.Println()
	fmt.Println("Decrypted API Key:")
	fmt.Println("═══════════════════════════════════════")
	fmt.Println(apiKey)
	fmt.Println("═══════════════════════════════════════")
	fmt.Println()
	fmt.Println("⚠️  Keep this key secure and do not share it!")
}
