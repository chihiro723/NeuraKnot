package main

import (
	"backend-go/internal/infrastructure/config"
	"flag"
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
)

func main() {
	// コマンドラインフラグ
	migrationsPath := flag.String("path", "backend-go/migrations", "Path to migration files")
	steps := flag.Int("steps", 0, "Number of migrations to apply (0 = all)")
	direction := flag.String("direction", "up", "Migration direction: up or down")
	version := flag.Uint("version", 0, "Migrate to specific version (0 = latest)")
	force := flag.Bool("force", false, "Force set migration version without running migrations")
	showVersion := flag.Bool("show-version", false, "Show current migration version")
	flag.Parse()

	// .env.localファイルを読み込み
	if err := godotenv.Load(".env.local"); err != nil {
		log.Printf("Warning: .env.local file not found: %v", err)
	}

	// 設定を読み込み
	cfg := config.Load()

	log.Println("===========================================")
	log.Println("Database Migration Tool (golang-migrate)")
	log.Println("===========================================")
	log.Printf("Host: %s", cfg.Database.Host)
	log.Printf("Port: %d", cfg.Database.Port)
	log.Printf("Database: %s", cfg.Database.DBName)
	log.Printf("User: %s", cfg.Database.User)
	log.Printf("Migrations Path: %s", *migrationsPath)
	log.Println("===========================================")

	// データベース接続文字列を構築
	databaseURL := fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.DBName,
		cfg.Database.SSLMode,
	)

	// マイグレーションインスタンスを作成
	m, err := migrate.New(
		fmt.Sprintf("file://%s", *migrationsPath),
		databaseURL,
	)
	if err != nil {
		log.Fatalf("Failed to create migrate instance: %v", err)
	}
	defer m.Close()

	// 現在のバージョンを表示
	if *showVersion {
		version, dirty, err := m.Version()
		if err != nil {
			if err == migrate.ErrNilVersion {
				log.Println("Current version: No migrations applied yet")
			} else {
				log.Fatalf("Failed to get migration version: %v", err)
			}
		} else {
			log.Printf("Current version: %d (dirty: %v)", version, dirty)
		}
		return
	}

	// バージョンを強制設定
	if *force {
		if *version == 0 {
			log.Fatal("--version must be specified when using --force")
		}
		log.Printf("[FORCE] Setting migration version to %d...", *version)
		if err := m.Force(int(*version)); err != nil {
			log.Fatalf("Failed to force version: %v", err)
		}
		log.Printf("[SUCCESS] Migration version set to %d", *version)
		return
	}

	// 特定のバージョンへマイグレーション
	if *version > 0 {
		log.Printf("[MIGRATE] Migrating to version %d...", *version)
		if err := m.Migrate(*version); err != nil {
			if err == migrate.ErrNoChange {
				log.Println("[INFO] No migration needed, already at target version")
				return
			}
			log.Fatalf("Migration failed: %v", err)
		}
		log.Printf("[SUCCESS] Migrated to version %d", *version)
		return
	}

	// ステップ数を指定してマイグレーション
	if *steps != 0 {
		log.Printf("[MIGRATE] Applying %d migration steps (%s)...", *steps, *direction)
		if *direction == "down" {
			*steps = -*steps
		}
		if err := m.Steps(*steps); err != nil {
			if err == migrate.ErrNoChange {
				log.Println("[INFO] No migration needed")
				return
			}
			log.Fatalf("Migration failed: %v", err)
		}
		log.Printf("[SUCCESS] Applied %d migration steps", *steps)
		return
	}

	// デフォルト: up または down
	log.Printf("[MIGRATE] Running migrations (%s)...", *direction)

	var migrationErr error
	switch *direction {
	case "up":
		migrationErr = m.Up()
	case "down":
		migrationErr = m.Down()
	default:
		log.Fatalf("Invalid direction: %s (must be 'up' or 'down')", *direction)
	}

	if migrationErr != nil {
		if migrationErr == migrate.ErrNoChange {
			log.Println("[INFO] No migration needed, database is up to date")
			return
		}
		log.Fatalf("Migration failed: %v", migrationErr)
	}

	// 最終バージョンを表示
	finalVersion, dirty, err := m.Version()
	if err != nil {
		log.Printf("Warning: Failed to get final version: %v", err)
	} else {
		log.Printf("[SUCCESS] Migration completed! Current version: %d (dirty: %v)", finalVersion, dirty)
	}

	log.Println("===========================================")
	log.Println("Migration completed successfully!")
	log.Println("===========================================")
}
