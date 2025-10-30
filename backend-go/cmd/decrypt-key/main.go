package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"backend-go/internal/crypto"
	"backend-go/internal/infrastructure/config"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run cmd/decrypt-key/main.go <service_config_id>")
		fmt.Println()
		fmt.Println("Description:")
		fmt.Println("  This tool decrypts and displays service authentication credentials for debugging purposes.")
		fmt.Println("  ⚠️  Use with caution! Only use in secure environments.")
		fmt.Println()
		fmt.Println("Example:")
		fmt.Println("  go run cmd/decrypt-key/main.go 123e4567-e89b-12d3-a456-426614174000")
		os.Exit(1)
	}

	var err error

	configID, err := uuid.Parse(os.Args[1])
	if err != nil {
		fmt.Printf("❌ Invalid service config ID: %v\n", err)
		os.Exit(1)
	}

	// .envファイルを読み込み（開発環境）
	// エラーは無視（.envファイルがない場合は環境変数を使用）
	if err = godotenv.Load(); err != nil {
		fmt.Printf("Warning: .env file not found, using environment variables\n")
	}

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
	if err = db.Ping(); err != nil {
		fmt.Printf("❌ Failed to ping database: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("🔍 Fetching encrypted service credentials from database...")

	// 暗号化された認証情報を取得
	var encryptedAuth []byte
	var authNonce []byte
	var serviceClass string
	var userID string

	query := `
		SELECT user_id, service_class, encrypted_auth, auth_nonce
		FROM user_service_configs
		WHERE id = $1
	`

	err = db.QueryRowContext(context.Background(), query, configID).Scan(
		&userID, &serviceClass, &encryptedAuth, &authNonce,
	)

	if err == sql.ErrNoRows {
		fmt.Printf("❌ Service config not found with ID: %s\n", configID)
		os.Exit(1)
	}

	if err != nil {
		fmt.Printf("❌ Failed to get encrypted credentials: %v\n", err)
		os.Exit(1)
	}

	if len(encryptedAuth) == 0 || len(authNonce) == 0 {
		fmt.Println("❌ No credentials are set for this service")
		os.Exit(1)
	}

	fmt.Println("✅ Found encrypted credentials")
	fmt.Println()
	fmt.Println("Service Information:")
	fmt.Println("═══════════════════════════════════════")
	fmt.Printf("Config ID:     %s\n", configID)
	fmt.Printf("User ID:       %s\n", userID)
	fmt.Printf("Service Class: %s\n", serviceClass)
	fmt.Println()

	// 復号化
	fmt.Println("🔓 Decrypting credentials...")
	credentials, err := encService.Decrypt(encryptedAuth, authNonce)
	if err != nil {
		fmt.Printf("❌ Failed to decrypt: %v\n", err)
		fmt.Println()
		fmt.Println("Possible causes:")
		fmt.Println("  - Wrong ENCRYPTION_MASTER_KEY")
		fmt.Println("  - Corrupted data in database")
		fmt.Println("  - Credentials were encrypted with different master key")
		os.Exit(1)
	}

	fmt.Println("✅ Successfully decrypted")
	fmt.Println()
	fmt.Println("Decrypted Credentials:")
	fmt.Println("═══════════════════════════════════════")
	fmt.Println(credentials)
	fmt.Println("═══════════════════════════════════════")
	fmt.Println()
	fmt.Println("⚠️  Keep these credentials secure and do not share them!")
}
