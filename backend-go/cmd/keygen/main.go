package main

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"os"
	"strings"
)

func main() {
	// 32バイト（256ビット）のランダムキーを生成
	key := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		fmt.Fprintf(os.Stderr, "Error generating key: %v\n", err)
		os.Exit(1)
	}

	// Base64エンコード（設定ファイルに保存しやすい形式）
	encoded := base64.StdEncoding.EncodeToString(key)

	fmt.Println("=" + strings.Repeat("=", 70))
	fmt.Println("  Generated Master Encryption Key (AES-256)")
	fmt.Println("=" + strings.Repeat("=", 70))
	fmt.Println()
	fmt.Println(encoded)
	fmt.Println()
	fmt.Println("Add this to your .env file:")
	fmt.Println("---")
	fmt.Printf("ENCRYPTION_MASTER_KEY=%s\n", encoded)
	fmt.Println("---")
	fmt.Println()
	fmt.Println("⚠️  IMPORTANT:")
	fmt.Println("  - Keep this key secret and backed up!")
	fmt.Println("  - Never commit this key to Git")
	fmt.Println("  - Use different keys for dev/staging/production")
	fmt.Println("  - Store production keys in AWS Secrets Manager")
	fmt.Println()
	fmt.Println("=" + strings.Repeat("=", 70))
}
