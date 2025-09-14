package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// RunMigrations マイグレーションを実行
func RunMigrations(db *sql.DB) error {
	// データベース接続の生存確認
	if err := db.Ping(); err != nil {
		return fmt.Errorf("database connection is not alive: %w", err)
	}

	// PostgreSQLドライバーを設定
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create postgres driver: %w", err)
	}

	// マイグレーションインスタンスを作成
	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations", // マイグレーションファイルのパス
		"postgres",          // データベース名
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}
	defer m.Close()

	// マイグレーションを実行
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// マイグレーション実行後の接続確認
	if err := db.Ping(); err != nil {
		return fmt.Errorf("database connection lost after migration: %w", err)
	}

	log.Println("Migrations completed successfully")
	return nil
}

// GetMigrationVersion 現在のマイグレーションバージョンを取得
func GetMigrationVersion(db *sql.DB) (uint, bool, error) {
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return 0, false, fmt.Errorf("failed to create postgres driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"postgres",
		driver,
	)
	if err != nil {
		return 0, false, fmt.Errorf("failed to create migrate instance: %w", err)
	}
	defer m.Close()

	version, dirty, err := m.Version()
	if err != nil {
		return 0, false, fmt.Errorf("failed to get migration version: %w", err)
	}

	return version, dirty, nil
}

// RollbackMigrations マイグレーションをロールバック
func RollbackMigrations(db *sql.DB, steps int) error {
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create postgres driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"postgres",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}
	defer m.Close()

	// 指定されたステップ数だけロールバック
	if err := m.Steps(-steps); err != nil {
		return fmt.Errorf("failed to rollback migrations: %w", err)
	}

	log.Printf("Rolled back %d migration steps", steps)
	return nil
}

// GetMigrationsPath マイグレーションファイルのパスを取得
func GetMigrationsPath() string {
	// 環境変数からマイグレーションパスを取得（デフォルトは相対パス）
	if path := os.Getenv("MIGRATIONS_PATH"); path != "" {
		return path
	}
	return "file://migrations"
}
