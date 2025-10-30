package database

import (
	"database/sql"
	"embed"
	"fmt"
	"log"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

// RunMigrations データベースマイグレーションを実行
func (c *Connection) RunMigrations() error {
	log.Println("[MIGRATION] Starting database migration...")

	// マイグレーションファイルを読み込み
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("failed to read migration directory: %w", err)
	}

	if len(entries) == 0 {
		log.Println("[MIGRATION] No migration files found")
		return nil
	}

	// トランザクション開始
	tx, err := c.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if rbErr := tx.Rollback(); rbErr != nil {
			log.Printf("Warning: failed to rollback transaction: %v", rbErr)
		}
	}()

	// 各マイグレーションファイルを実行
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		filename := entry.Name()
		log.Printf("[MIGRATION] Applying migration: %s", filename)

		content, err := migrationFiles.ReadFile("migrations/" + filename)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", filename, err)
		}

		// マイグレーションを実行
		if _, err := tx.Exec(string(content)); err != nil {
			return fmt.Errorf("failed to execute migration %s: %w", filename, err)
		}

		log.Printf("[MIGRATION] Successfully applied: %s", filename)
	}

	// トランザクションをコミット
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit migration transaction: %w", err)
	}

	log.Println("[MIGRATION] All migrations completed successfully")
	return nil
}

// RunMigrationsFromSQL 単一のSQLファイルからマイグレーションを実行
func (c *Connection) RunMigrationsFromSQL(sqlContent string) error {
	log.Println("[MIGRATION] Starting database migration from SQL content...")

	// トランザクション開始
	tx, err := c.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if rbErr := tx.Rollback(); rbErr != nil {
			log.Printf("Warning: failed to rollback transaction: %v", rbErr)
		}
	}()

	// マイグレーションを実行
	if _, err := tx.Exec(sqlContent); err != nil {
		return fmt.Errorf("failed to execute migration: %w", err)
	}

	// トランザクションをコミット
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit migration transaction: %w", err)
	}

	log.Println("[MIGRATION] Migration completed successfully")
	return nil
}

// CheckTablesExist 必要なテーブルが存在するか確認
func (c *Connection) CheckTablesExist() (bool, error) {
	var count int
	query := `
		SELECT COUNT(*)
		FROM information_schema.tables
		WHERE table_schema = 'public'
		AND table_name IN ('users', 'ai_agents', 'conversations', 'messages')
	`

	err := c.DB.QueryRow(query).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("failed to check tables: %w", err)
	}

	// 4つのテーブルすべてが存在する場合
	return count == 4, nil
}

// ResetDatabase すべてのテーブルを削除（開発用）
func (c *Connection) ResetDatabase() error {
	log.Println("[RESET] Dropping all tables...")

	// publicスキーマをDROPして再作成
	tx, err := c.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if rbErr := tx.Rollback(); rbErr != nil {
			log.Printf("Warning: failed to rollback transaction: %v", rbErr)
		}
	}()

	// すべてのテーブルを削除
	_, err = tx.Exec("DROP SCHEMA public CASCADE")
	if err != nil {
		return fmt.Errorf("failed to drop schema: %w", err)
	}

	_, err = tx.Exec("CREATE SCHEMA public")
	if err != nil {
		return fmt.Errorf("failed to create schema: %w", err)
	}

	// 権限を付与
	_, err = tx.Exec("GRANT ALL ON SCHEMA public TO postgres")
	if err != nil {
		return fmt.Errorf("failed to grant privileges: %w", err)
	}

	_, err = tx.Exec("GRANT ALL ON SCHEMA public TO public")
	if err != nil {
		return fmt.Errorf("failed to grant public privileges: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit reset transaction: %w", err)
	}

	log.Println("[RESET] All tables dropped successfully")
	return nil
}

// EnsureDatabase データベースが存在することを確認（存在しない場合は作成）
func EnsureDatabase(host string, port int, user, password, dbname string) error {
	// postgresデータベースに接続
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=postgres sslmode=require",
		host, port, user, password,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to postgres database: %w", err)
	}
	defer db.Close()

	// データベースが存在するか確認
	var exists bool
	query := "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)"
	err = db.QueryRow(query, dbname).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check database existence: %w", err)
	}

	if !exists {
		log.Printf("[DATABASE] Creating database: %s", dbname)
		_, err = db.Exec(fmt.Sprintf("CREATE DATABASE \"%s\"", dbname))
		if err != nil {
			return fmt.Errorf("failed to create database: %w", err)
		}
		log.Printf("[DATABASE] Database created: %s", dbname)
	} else {
		log.Printf("[DATABASE] Database already exists: %s", dbname)
	}

	return nil
}
